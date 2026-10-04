import {
  PatternMatrix,
  PlatformProfile,
  ColumnMeta,
  IsoDate,
  PatternSettings,
} from "../types/pattern";
import { ScheduleEntry, PlanSummary, GlyphOrigin } from "../types/schedule";
import { MonthPlan, CalendarDay } from "../types/calendar";
import { DatedCell } from "./dateMapper";
import {
  weekdayName,
  addDaysIso,
  diffDaysIso,
  monthLabel,
  formatUtcIso,
  toUtcDate,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachMonthOfInterval,
} from "../utils/dateUtils";
import { NormalizedInput } from "../utils/textUtils";

export function getGlyphOrigin(col: number, meta: ColumnMeta[]): GlyphOrigin {
  const m = meta[col];
  if (!m) {
    return {
      line: 0,
      clusterIndex: null,
      cluster: null,
      glyphColumn: null,
      glyphWidth: null,
    };
  }
  return {
    line: m.lineIndex,
    clusterIndex: m.clusterIndex,
    cluster: m.cluster,
    glyphColumn: m.glyphColumn,
    glyphWidth: m.glyphWidth,
    kind: m.kind,
  };
}

export function generateSchedule(
  datedCells: DatedCell[],
  meta: ColumnMeta[]
): ScheduleEntry[] {
  return datedCells
    .map((c) => ({
      date: c.date,
      dayOfWeek: weekdayName(c.date),
      month: c.date.slice(0, 7),
      active: c.level > 0,
      level: c.level,
      required: c.required,
      pixelRow: c.row,
      pixelColumn: c.col,
      status: c.status,
      glyph: getGlyphOrigin(c.col, meta),
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function summarize(
  schedule: ScheduleEntry[],
  placement: { origin: IsoDate; notBefore: IsoDate },
  matrix: PatternMatrix,
  norm: NormalizedInput,
  _settings: PatternSettings,
  profile: PlatformProfile,
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

  const firstActiveDay =
    activeEntries.length > 0 ? activeEntries[0].date : null;
  const lastActiveDay =
    activeEntries.length > 0
      ? activeEntries[activeEntries.length - 1].date
      : null;

  const totalDays = matrix.cols * 7;
  const end = addDaysIso(placement.origin, totalDays - 1);

  return {
    input: norm.normalizedText,
    platformId: profile.id,
    platformLabel: profile.label,
    requestedStart: placement.notBefore,
    start: placement.origin,
    end,
    firstActiveDay,
    lastActiveDay,
    weeks: matrix.cols,
    totalDays,
    activeDays,
    maxStreak,
    estimatedContributions,
    maxIntensity,
    patternWidth: matrix.cols - columnOffset,
    patternHeight: 7,
    columnOffset,
  };
}

export function groupScheduleByMonth(
  schedule: ScheduleEntry[],
  options: {
    printWeekStart: 0 | 1;
    doneDates: Set<IsoDate>;
    today: IsoDate;
  }
): MonthPlan[] {
  const active = schedule.filter((e) => e.active);
  if (active.length === 0) return [];

  const byDate = new Map<IsoDate, ScheduleEntry>();
  for (const entry of schedule) {
    byDate.set(entry.date, entry);
  }

  const firstActiveDate = active[0].date;
  const lastActiveDate = active[active.length - 1].date;

  const startM = startOfMonth(toUtcDate(firstActiveDate));
  const endM = startOfMonth(toUtcDate(lastActiveDate));
  const months = eachMonthOfInterval({ start: startM, end: endM });

  return months.map((m) => {
    const year = m.getUTCFullYear();
    const month = m.getUTCMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;

    const monthStart = startOfMonth(m);
    const monthEnd = endOfMonth(m);

    const gridStart = startOfWeek(monthStart, {
      weekStartsOn: options.printWeekStart,
    });
    const gridEnd = endOfWeek(monthEnd, {
      weekStartsOn: options.printWeekStart,
    });

    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
    const weeks: CalendarDay[][] = [];

    for (let i = 0; i < days.length; i += 7) {
      const weekDays: CalendarDay[] = [];
      for (let j = 0; j < 7; j++) {
        const d = days[i + j];
        const iso = formatUtcIso(d);
        const inMonth = d.getUTCMonth() === m.getUTCMonth();
        const entry = byDate.get(iso);

        const activeState = !!entry?.active;
        const required = entry?.required ?? 0;
        const status = entry?.status ?? (iso < options.today ? "past" : iso === options.today ? "today" : "future");
        const done = options.doneDates.has(iso);

        weekDays.push({
          date: iso,
          inMonth,
          active: activeState,
          required,
          status,
          done,
          pixel: entry
            ? { row: entry.pixelRow, column: entry.pixelColumn }
            : undefined,
          glyph: entry?.glyph,
        });
      }
      weeks.push(weekDays);
    }

    const inMonthActive = weeks
      .flat()
      .filter((d) => d.inMonth && d.active);

    const activeCount = inMonthActive.length;
    const doneCount = inMonthActive.filter((d) => d.done).length;
    const remainingCount = inMonthActive.filter(
      (d) => d.status !== "past" && !d.done
    ).length;
    const missedCount = inMonthActive.filter(
      (d) => d.status === "past" && !d.done
    ).length;

    return {
      key,
      year,
      month,
      label: monthLabel(year, month),
      weeks,
      activeCount,
      doneCount,
      remainingCount,
      missedCount,
    };
  });
}
