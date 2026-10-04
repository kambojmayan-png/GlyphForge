import { PatternSettings, FitSuggestion, IsoDate } from "../types/pattern";
import { Plan, Result, TimeZoneAdvisory } from "../types/schedule";
import { getPlatformProfile } from "./platforms";
import { validateDateSettings, utcSafeWindow } from "../utils/dateUtils";
import { normalizeInput } from "../utils/textUtils";
import {
  generatePatternMatrix,
  computeFitSuggestions,
  extractGlyphTokens,
  GeneratorEnv,
} from "./patternGenerator";
import {
  applyAlignment,
  resolveGridOrigin,
  matrixToContributionCells,
  mapCellsToDates,
} from "./dateMapper";
import {
  buildLeetCodeCalendar,
  mapTokensToLeetCode,
  summarizeLeetCode,
} from "./leetcodeMapper";
import {
  generateSchedule,
  summarize,
  groupScheduleByMonth,
} from "./contributionCalculator";
import { MAX_COLUMNS } from "./defaults";

export interface PlanEnv extends GeneratorEnv {
  todayIso: IsoDate;
  doneDates?: Set<IsoDate>;
}

export async function generatePlan(
  settings: PatternSettings,
  env: PlanEnv
): Promise<Result<Plan>> {
  if (env.signal?.aborted) {
    return {
      ok: false,
      error: { code: "CANCELLED", message: "Generation was cancelled." },
    };
  }

  // 1. Validate Input
  if (!settings.text || settings.text.length === 0) {
    return {
      ok: false,
      error: {
        code: "EMPTY_INPUT",
        message: "Enter some text to turn into a pattern.",
      },
    };
  }

  const norm = normalizeInput(settings.text);
  if (norm.lines.length === 0) {
    return {
      ok: false,
      error: {
        code: "WHITESPACE_ONLY",
        message: "Add at least one visible character.",
      },
    };
  }

  const profile = getPlatformProfile(settings);

  // 2. Validate Dates
  const dateValidation = validateDateSettings(
    {
      startMode: settings.startMode,
      startDate: settings.startDate,
      preferredMonth: settings.preferredMonth,
      platformWeekStartsOn: profile.weekStartsOn,
    },
    env.todayIso
  );

  if (!dateValidation.ok) {
    return {
      ok: false,
      error: {
        code: "INVALID_DATE",
        message: dateValidation.error,
      },
    };
  }

  // --------------------------------------------------------------------------
  // DEDICATED LEETCODE PLATFORM PIPELINE
  // Discontinuous 12-month calendar grid, month-aware glyph placement,
  // LeetCode-specific date mapping, streak calculation, and statistics.
  // --------------------------------------------------------------------------
  if (profile.id === "leetcode") {
    const { tokens, warnings: tokenWarnings } = await extractGlyphTokens(
      norm,
      settings,
      env
    );

    if (env.signal?.aborted) {
      return {
        ok: false,
        error: { code: "CANCELLED", message: "Generation was cancelled." },
      };
    }

    const nonBlank = tokens.filter((t) => t.matrix.cols > 0);
    if (nonBlank.length === 0) {
      return {
        ok: false,
        error: {
          code: "NOTHING_DRAWABLE",
          message:
            "Nothing in this input could be drawn. Try different characters or switch the render mode to Canvas.",
        },
      };
    }

    // Determine target year & yearMode
    const startIso = dateValidation.dates.notBefore;
    let targetYear = parseInt(startIso.slice(0, 4), 10);
    let yearMode: "past1Year" | "calendarYear" = "past1Year";

    if (settings.startMode === "preferredMonth" && settings.preferredMonth) {
      targetYear = settings.preferredMonth.year;
      yearMode = "calendarYear";
    }

    // Calculate ending month so trailing 12 months covers the entire pattern
    const estMonths = Math.max(1, nonBlank.length);
    const startD = new Date(`${startIso}T00:00:00Z`);
    const endD = new Date(
      Date.UTC(startD.getUTCFullYear(), startD.getUTCMonth() + estMonths - 1, 1)
    );
    const endingMonthIso = `${endD.getUTCFullYear()}-${String(
      endD.getUTCMonth() + 1
    ).padStart(2, "0")}-01`;

    const calendar = buildLeetCodeCalendar(
      targetYear,
      yearMode,
      startIso,
      endingMonthIso
    );
    const leetCodeResult = mapTokensToLeetCode(
      tokens,
      calendar,
      settings,
      env.todayIso,
      startIso
    );

    const doneSet = env.doneDates ?? new Set<IsoDate>();
    const months = groupScheduleByMonth(leetCodeResult.schedule, {
      printWeekStart: settings.printWeekStart,
      doneDates: doneSet,
      today: env.todayIso,
    });

    const summary = summarizeLeetCode(
      leetCodeResult.schedule,
      leetCodeResult.placement,
      leetCodeResult.matrix,
      norm.normalizedText,
      settings,
      leetCodeResult.columnOffset
    );

    const warnings = [...tokenWarnings, ...norm.warnings];
    const pastActive = leetCodeResult.schedule.filter(
      (e) => e.active && e.status === "past"
    );
    if (pastActive.length > 0) {
      warnings.push({
        code: "PAST_DATES",
        message: `${pastActive.length} of these days are already in the past, so they can't be planned.`,
        details: { count: pastActive.length },
      });
    }

    return {
      ok: true,
      value: {
        matrix: leetCodeResult.matrix,
        placement: leetCodeResult.placement,
        schedule: leetCodeResult.schedule,
        months,
        summary,
        profile,
        warnings,
        fitSuggestions: [],
      },
    };
  }

  // --------------------------------------------------------------------------
  // GITHUB & GENERIC CONTINUOUS PLATFORM PIPELINE (Preserved 100%)
  // --------------------------------------------------------------------------
  // 3. Build Matrix
  let matrix = await generatePatternMatrix(norm, settings, env);
  if (env.signal?.aborted) {
    return {
      ok: false,
      error: { code: "CANCELLED", message: "Generation was cancelled." },
    };
  }

  let activeCount = 0;
  for (let i = 0; i < matrix.levels.length; i++) {
    if (matrix.levels[i] > 0) activeCount++;
  }

  if (activeCount === 0) {
    return {
      ok: false,
      error: {
        code: "NOTHING_DRAWABLE",
        message:
          "Nothing in this input could be drawn. Try different characters or switch the render mode to Canvas.",
      },
    };
  }

  if (matrix.cols > MAX_COLUMNS) {
    return {
      ok: false,
      error: {
        code: "TOO_WIDE_HARD",
        message: "Above 520 columns (about ten years) generation is refused.",
      },
    };
  }

  // 4. Alignment
  const { matrix: alignedMatrix, columnOffset } = applyAlignment(
    matrix,
    profile,
    settings.alignment
  );

  // 5. Grid Origin
  const placement = resolveGridOrigin(
    alignedMatrix,
    dateValidation.dates.notBefore,
    dateValidation.dates.forcedOrigin,
    profile
  );

  // 6. Cell to date mapping
  const cells = matrixToContributionCells(alignedMatrix);
  const datedCells = mapCellsToDates(cells, placement, env.todayIso);
  const schedule = generateSchedule(datedCells, alignedMatrix.meta);

  // 7. Month grouping and summary
  const doneSet = env.doneDates ?? new Set<IsoDate>();
  const months = groupScheduleByMonth(schedule, {
    printWeekStart: settings.printWeekStart,
    doneDates: doneSet,
    today: env.todayIso,
  });

  const summary = summarize(
    schedule,
    placement,
    alignedMatrix,
    norm,
    settings,
    profile,
    columnOffset
  );

  // 8. Warnings & Suggestions
  const warnings = [...alignedMatrix.warnings];

  // Wide pattern warning (mandated text)
  let fitSuggestions: FitSuggestion[] = [];
  if (alignedMatrix.cols > profile.softColumnLimit) {
    warnings.push({
      code: "VERY_WIDE",
      message:
        "This pattern is very wide and may require more than one contribution year.",
      details: { count: alignedMatrix.cols },
    });
    fitSuggestions = await computeFitSuggestions(
      norm,
      settings,
      alignedMatrix.cols,
      env
    );
  }

  // Past dates warning
  const pastActive = schedule.filter((e) => e.active && e.status === "past");
  if (pastActive.length > 0) {
    warnings.push({
      code: "PAST_DATES",
      message: `${pastActive.length} of these days are already in the past, so they can't be planned.`,
      details: { count: pastActive.length },
    });
  }

  // 9. Time-zone advisory
  let timeZoneAdvisory: TimeZoneAdvisory | undefined;
  if (profile.dayBoundary === "utc" && summary.firstActiveDay) {
    const tz = settings.timeZone || "UTC";
    const firstSafe = utcSafeWindow(tz, summary.firstActiveDay);
    let hasDstShift = false;
    let lastActiveWindowString: string | undefined;

    if (summary.lastActiveDay && summary.lastActiveDay !== summary.firstActiveDay) {
      const lastSafe = utcSafeWindow(tz, summary.lastActiveDay);
      if (lastSafe.fromMinutes !== firstSafe.fromMinutes || lastSafe.toMinutes !== firstSafe.toMinutes) {
        hasDstShift = true;
        lastActiveWindowString = lastSafe.windowString;
      }
    }

    timeZoneAdvisory = {
      timeZone: tz,
      offsetMinutes: firstSafe.fromMinutes,
      firstActiveDate: summary.firstActiveDay,
      windowString: firstSafe.windowString,
      hasDstShift,
      lastActiveWindowString,
    };
  }

  return {
    ok: true,
    value: {
      matrix: alignedMatrix,
      placement,
      schedule,
      months,
      summary,
      profile,
      warnings,
      fitSuggestions,
      timeZoneAdvisory,
    },
  };
}
