import { IsoDate, PatternMatrix, PatternSettings, ColumnMeta } from "../types/pattern";
import { ScheduleEntry, GridPlacement, PlanSummary, GlyphOrigin } from "../types/schedule";
import { diffDaysIso, weekdayName } from "../utils/dateUtils";
import { CONTRIBUTIONS_PER_LEVEL } from "./defaults";
import { GlyphToken } from "./patternGenerator";

export interface LeetCodeDaySlot {
  date: IsoDate;
  year: number;
  month: number;
  dayNum: number;
  weekday: number; // 0=Sunday .. 6=Saturday
  monthIndex: number; // 0..11
  monthCol: number;
  globalCol: number;
  row: number; // 0..6
  isValidDay: boolean;
}

export interface LeetCodeMonth {
  year: number;
  month: number; // 1..12
  monthIndex: number; // 0..11
  shortLabel: string;
  fullLabel: string;
  firstWeekday: number; // 0..6
  daysInMonth: number;
  cols: number;
  globalColStart: number;
  slots: (LeetCodeDaySlot | null)[][]; // slots[colInMonth][row]
}

export interface LeetCodeCalendar {
  yearMode: "past1Year" | "calendarYear";
  targetYear: number;
  anchorDate: IsoDate;
  months: LeetCodeMonth[];
  totalCols: number;
  totalDays: number;
}

/**
 * Builds the 12-month LeetCode calendar grid with exact Sunday-to-Saturday columns,
 * discontinuous month structures, and off-calendar void slots.
 */
export function buildLeetCodeCalendar(
  targetYear: number,
  yearMode: "past1Year" | "calendarYear" = "past1Year",
  anchorDateStr?: IsoDate,
  endingMonthIso?: IsoDate
): LeetCodeCalendar {
  const months: LeetCodeMonth[] = [];
  let globalColCounter = 0;
  let totalDaysCount = 0;

  if (yearMode === "past1Year") {
    // 12 trailing months ending at endingMonthIso or anchorDateStr
    const refIso = endingMonthIso || anchorDateStr || `${targetYear}-10-01`;
    const refDate = new Date(`${refIso}T00:00:00Z`);
    const anchorYear = refDate.getUTCFullYear();
    const anchorMonth = refDate.getUTCMonth() + 1; // 1..12

    for (let i = 11; i >= 0; i--) {
      const targetDate = new Date(Date.UTC(anchorYear, anchorMonth - 1 - i, 1));
      const y = targetDate.getUTCFullYear();
      const m = targetDate.getUTCMonth() + 1;
      const monthObj = buildSingleMonth(y, m, 11 - i, globalColCounter);
      globalColCounter += monthObj.cols;
      totalDaysCount += monthObj.daysInMonth;
      months.push(monthObj);
    }
  } else {
    // 12 calendar months: Jan to Dec of targetYear
    for (let m = 1; m <= 12; m++) {
      const monthObj = buildSingleMonth(targetYear, m, m - 1, globalColCounter);
      globalColCounter += monthObj.cols;
      totalDaysCount += monthObj.daysInMonth;
      months.push(monthObj);
    }
  }

  const effectiveAnchor = anchorDateStr || `${targetYear}-10-01`;

  return {
    yearMode,
    targetYear,
    anchorDate: effectiveAnchor,
    months,
    totalCols: globalColCounter,
    totalDays: totalDaysCount,
  };
}

function buildSingleMonth(
  year: number,
  month: number,
  monthIndex: number,
  globalColStart: number
): LeetCodeMonth {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const firstWeekday = firstDay.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const totalSlots = firstWeekday + daysInMonth;
  const cols = Math.ceil(totalSlots / 7);

  const slots: (LeetCodeDaySlot | null)[][] = [];

  for (let c = 0; c < cols; c++) {
    const colSlots: (LeetCodeDaySlot | null)[] = [];
    for (let r = 0; r < 7; r++) {
      const slotIndex = c * 7 + r;
      const dayNum = slotIndex - firstWeekday + 1;

      if (dayNum >= 1 && dayNum <= daysInMonth) {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
        colSlots.push({
          date: dateStr,
          year,
          month,
          dayNum,
          weekday: r,
          monthIndex,
          monthCol: c,
          globalCol: globalColStart + c,
          row: r,
          isValidDay: true,
        });
      } else {
        colSlots.push(null);
      }
    }
    slots.push(colSlots);
  }

  const shortLabel = firstDay.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const fullLabel = firstDay.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  return {
    year,
    month,
    monthIndex,
    shortLabel,
    fullLabel,
    firstWeekday,
    daysInMonth,
    cols,
    globalColStart,
    slots,
  };
}

export interface LeetCodePlanResult {
  matrix: PatternMatrix;
  placement: GridPlacement;
  schedule: ScheduleEntry[];
  columnOffset: number;
}

/**
 * Dedicated LeetCode Generator and Date Mapper:
 * Maps rasterized glyph tokens onto the discontinuous 12-month LeetCode grid.
 * Respects month boundaries, preserves glyph cohesion, and assigns real LeetCode dates.
 */
export function mapTokensToLeetCode(
  tokens: GlyphToken[],
  calendar: LeetCodeCalendar,
  settings: PatternSettings,
  todayIso: IsoDate,
  notBeforeIso?: IsoDate
): LeetCodePlanResult {
  // Filter out standalone empty space tokens if any, but preserve word spacing
  const nonBlankTokens = tokens.filter((t) => t.matrix.cols > 0);

  // Pre-calculate month distribution
  // Group tokens into months
  const monthTokenGroups: GlyphToken[][] = [];
  let currentGroup: GlyphToken[] = [];
  let currentGroupWidth = 0;

  for (const token of nonBlankTokens) {
    const w = token.matrix.cols;
    const needed = currentGroup.length > 0 ? settings.charSpacing + w : w;
    // An average month has ~5 columns. Safe full-height capacity is 4-5 columns.
    if (currentGroup.length > 0 && currentGroupWidth + needed > 4) {
      monthTokenGroups.push(currentGroup);
      currentGroup = [token];
      currentGroupWidth = w;
    } else {
      currentGroup.push(token);
      currentGroupWidth += needed;
    }
  }
  if (currentGroup.length > 0) {
    monthTokenGroups.push(currentGroup);
  }

  const monthsNeeded = monthTokenGroups.length;

  // Determine starting month index based on alignment & start settings
  let effectiveStartMonth = 0;
  const refStart = notBeforeIso || settings.startDate || todayIso;
  const startYear = parseInt(refStart.slice(0, 4), 10);
  const startMonth = parseInt(refStart.slice(5, 7), 10);

  if (settings.startMode === "preferredMonth" && settings.preferredMonth) {
    const idx = calendar.months.findIndex(
      (m) =>
        m.year === settings.preferredMonth!.year &&
        m.month === settings.preferredMonth!.month
    );
    if (idx !== -1) effectiveStartMonth = idx;
  } else if (settings.alignment === "right") {
    effectiveStartMonth = Math.max(0, calendar.months.length - monthsNeeded);
  } else if (settings.alignment === "center") {
    effectiveStartMonth = Math.max(
      0,
      Math.floor((calendar.months.length - monthsNeeded) / 2)
    );
  } else {
    // Left alignment: start at month of refStart if found in calendar
    const idx = calendar.months.findIndex(
      (m) => m.year === startYear && m.month === startMonth
    );
    if (idx !== -1) {
      effectiveStartMonth = idx;
    } else {
      effectiveStartMonth = 0;
    }
  }

  interface PlacedToken {
    token: GlyphToken;
    monthIndex: number;
    colInMonth: number;
    globalCol: number;
  }

  const placedTokens: PlacedToken[] = [];

  for (let gIdx = 0; gIdx < monthTokenGroups.length; gIdx++) {
    const targetMonthIdx = effectiveStartMonth + gIdx;
    if (targetMonthIdx >= calendar.months.length) break;

    const month = calendar.months[targetMonthIdx];
    const group = monthTokenGroups[gIdx];

    // Compute total width of this group
    const groupTotalWidth = group.reduce(
      (sum, t, idx) => sum + t.matrix.cols + (idx > 0 ? settings.charSpacing : 0),
      0
    );

    // Pick start column inside month
    // Prefer column 1 if column 0 has partial rows and group fits in cols - 1
    let startColInMonth = 0;
    if (month.firstWeekday > 0 && groupTotalWidth <= month.cols - 1) {
      startColInMonth = 1;
    } else {
      startColInMonth = Math.max(
        0,
        Math.floor((month.cols - groupTotalWidth) / 2)
      );
    }

    let currentCol = startColInMonth;
    for (const token of group) {
      placedTokens.push({
        token,
        monthIndex: targetMonthIdx,
        colInMonth: currentCol,
        globalCol: month.globalColStart + currentCol,
      });
      currentCol += token.matrix.cols + settings.charSpacing;
    }
  }

  // Build the global matrix and map pixels to exact LeetCode dates
  const totalCols = calendar.totalCols;
  const levels = new Uint8Array(7 * totalCols);
  const meta: ColumnMeta[] = Array.from({ length: totalCols }, () => ({
    kind: "gap",
    lineIndex: 0,
    clusterIndex: null,
    cluster: null,
    glyphColumn: null,
    glyphWidth: null,
  }));

  // Map to hold active cell info: date -> level & origin
  const activeCellsByDate = new Map<
    IsoDate,
    {
      level: number;
      required: number;
      glyph: GlyphOrigin;
      globalCol: number;
      row: number;
    }
  >();

  for (const placed of placedTokens) {
    const { token, monthIndex, colInMonth, globalCol } = placed;
    const month = calendar.months[monthIndex];
    const { cols: tokenCols, levels: tokenLevels } = token.matrix;

    for (let c = 0; c < tokenCols; c++) {
      const gCol = globalCol + c;
      const mCol = colInMonth + c;

      if (gCol < totalCols && mCol < month.cols) {
        meta[gCol] = {
          kind: "glyph",
          lineIndex: token.meta.lineIndex,
          clusterIndex: token.meta.clusterIndex,
          cluster: token.meta.cluster,
          glyphColumn: c,
          glyphWidth: tokenCols,
        };

        for (let r = 0; r < 7; r++) {
          const pixelVal = tokenLevels[r * tokenCols + c];
          if (pixelVal > 0) {
            levels[r * totalCols + gCol] = pixelVal;

            // Check if there is a valid calendar day in this LeetCode slot
            const slot = month.slots[mCol]?.[r];
            if (slot && slot.isValidDay) {
              activeCellsByDate.set(slot.date, {
                level: pixelVal,
                required: CONTRIBUTIONS_PER_LEVEL[pixelVal] ?? 1,
                glyph: {
                  line: token.meta.lineIndex,
                  clusterIndex: token.meta.clusterIndex,
                  cluster: token.meta.cluster,
                  glyphColumn: c,
                  glyphWidth: tokenCols,
                },
                globalCol: gCol,
                row: r,
              });
            }
          }
        }
      }
    }
  }

  // Generate full schedule for all valid days in the LeetCode calendar
  const schedule: ScheduleEntry[] = [];
  for (const m of calendar.months) {
    for (let c = 0; c < m.cols; c++) {
      for (let r = 0; r < 7; r++) {
        const slot = m.slots[c]?.[r];
        if (slot && slot.isValidDay) {
          const activeInfo = activeCellsByDate.get(slot.date);
          const active = !!activeInfo;
          const level = activeInfo ? activeInfo.level : 0;
          const required = activeInfo ? activeInfo.required : 0;
          const status =
            slot.date < todayIso
              ? "past"
              : slot.date === todayIso
              ? "today"
              : "future";

          schedule.push({
            date: slot.date,
            dayOfWeek: weekdayName(slot.date),
            month: `${slot.year}-${String(slot.month).padStart(2, "0")}`,
            active,
            level,
            required,
            pixelRow: r,
            pixelColumn: slot.globalCol,
            status,
            glyph: activeInfo?.glyph ?? {
              line: 0,
              clusterIndex: null,
              cluster: null,
              glyphColumn: null,
              glyphWidth: null,
            },
          });
        }
      }
    }
  }

  // Sort schedule strictly chronologically
  schedule.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const firstDate = schedule.length > 0 ? schedule[0].date : calendar.anchorDate;
  const placement: GridPlacement = {
    origin: firstDate,
    notBefore: settings.startDate || firstDate,
    shiftedWeeks: 0,
    explanation: `LeetCode month-by-month grid aligned to ${calendar.months[effectiveStartMonth]?.shortLabel || "first month"}.`,
  };

  const matrix: PatternMatrix = {
    rows: 7,
    cols: totalCols,
    levels,
    meta,
    warnings: [],
    fidelity: [],
  };

  return {
    matrix,
    placement,
    schedule,
    columnOffset: placedTokens[0]?.globalCol ?? 0,
  };
}

/**
 * Computes PlanSummary for LeetCode plans including accurate max streak and stats.
 */
export function summarizeLeetCode(
  schedule: ScheduleEntry[],
  placement: GridPlacement,
  matrix: PatternMatrix,
  normText: string,
  _settings: PatternSettings,
  columnOffset: number
): PlanSummary {
  const activeEntries = schedule.filter((e) => e.active);
  const activeDays = activeEntries.length;
  const estimatedContributions = activeEntries.reduce(
    (sum, e) => sum + e.required,
    0
  );
  const maxIntensity = activeEntries.reduce(
    (max, e) => Math.max(max, e.required),
    0
  );

  // Compute longest consecutive active calendar day run
  let maxStreak = 0;
  let currentStreak = 0;
  let lastActiveDate: string | null = null;

  for (const entry of schedule) {
    if (entry.active) {
      if (lastActiveDate) {
        const diff = diffDaysIso(entry.date, lastActiveDate);
        if (diff === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      lastActiveDate = entry.date;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    }
  }

  const firstActiveDay = activeEntries.length > 0 ? activeEntries[0].date : null;
  const lastActiveDay =
    activeEntries.length > 0 ? activeEntries[activeEntries.length - 1].date : null;

  const start = schedule[0]?.date || placement.origin;
  const end = schedule[schedule.length - 1]?.date || start;

  return {
    input: normText,
    platformId: "leetcode",
    platformLabel: "LeetCode",
    requestedStart: placement.notBefore,
    start,
    end,
    firstActiveDay,
    lastActiveDay,
    weeks: matrix.cols,
    totalDays: schedule.length,
    activeDays,
    maxStreak,
    estimatedContributions,
    maxIntensity,
    patternWidth: matrix.cols - columnOffset,
    patternHeight: 7,
    columnOffset,
  };
}
