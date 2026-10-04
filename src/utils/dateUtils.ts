import { UTCDate } from "@date-fns/utc";
import {
  addDays,
  differenceInCalendarDays,
  format,
  getDay,
  isValid,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  eachMonthOfInterval,
} from "date-fns";
import { IsoDate, StartMode } from "../types/pattern";

export function parseStrictIsoDate(iso: string): UTCDate | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return null;
  }
  const [yearStr, monthStr, dayStr] = iso.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (year < 1970 || year > 2100) {
    return null;
  }
  if (month < 1 || month > 12) {
    return null;
  }

  // Construct UTCDate (month is 0-indexed in JS/date-fns)
  const date = new UTCDate(Date.UTC(year, month - 1, day));
  if (!isValid(date)) {
    return null;
  }

  // Round-trip check: ensures 2026-02-30 or 2027-02-29 are rejected
  const roundTrip = format(date, "yyyy-MM-dd");
  if (roundTrip !== iso) {
    return null;
  }

  return date;
}

export function isValidIsoDate(iso: string): boolean {
  return parseStrictIsoDate(iso) !== null;
}

export function todayIso(timeZone: string, now: Date = new Date()): IsoDate {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  }
}

export function toUtcDate(iso: IsoDate): UTCDate {
  const d = parseStrictIsoDate(iso);
  if (!d) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  return d;
}

export function formatUtcIso(date: UTCDate | Date): IsoDate {
  return format(date, "yyyy-MM-dd");
}

export function addDaysIso(iso: IsoDate, days: number): IsoDate {
  const d = toUtcDate(iso);
  return formatUtcIso(addDays(d, days));
}

export function diffDaysIso(target: IsoDate, base: IsoDate): number {
  return differenceInCalendarDays(toUtcDate(target), toUtcDate(base));
}

export function weekdayIso(iso: IsoDate): number {
  // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  return getDay(toUtcDate(iso));
}

export function weekdayName(iso: IsoDate): string {
  const names = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return names[weekdayIso(iso)];
}

export function startOfWeekIso(
  iso: IsoDate,
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6
): IsoDate {
  const d = toUtcDate(iso);
  return formatUtcIso(startOfWeek(d, { weekStartsOn }));
}

export function nextWeekdayAfterIso(today: IsoDate, weekday: number): IsoDate {
  // Strictly after today
  const currentWeekday = weekdayIso(today);
  const delta = (weekday - currentWeekday + 7) % 7 || 7;
  return addDaysIso(today, delta);
}

export function monthLabel(year: number, month: number): string {
  const d = new UTCDate(Date.UTC(year, month - 1, 1));
  return format(d, "MMMM yyyy");
}

export function formatDatePretty(iso: IsoDate): string {
  const d = toUtcDate(iso);
  return format(d, "d MMM yyyy");
}

export function formatDateFull(iso: IsoDate): string {
  const d = toUtcDate(iso);
  return format(d, "EEEE, d MMMM yyyy");
}

export interface ValidatedDates {
  notBefore: IsoDate;
  forcedOrigin: IsoDate | null;
  explanation?: string;
}

export function validateDateSettings(
  options: {
    startMode: StartMode;
    startDate?: IsoDate;
    preferredMonth?: { year: number; month: number };
    platformWeekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  },
  currentToday: IsoDate
): { ok: true; dates: ValidatedDates } | { ok: false; error: string } {
  const { startMode, startDate, preferredMonth, platformWeekStartsOn } = options;

  if (startMode === "custom") {
    if (!startDate || !isValidIsoDate(startDate)) {
      return {
        ok: false,
        error: "That date doesn't exist. Pick a valid date, for example 2026-10-12.",
      };
    }
    return {
      ok: true,
      dates: {
        notBefore: startDate,
        forcedOrigin: null,
      },
    };
  }

  if (startMode === "nextMonday") {
    const monday = nextWeekdayAfterIso(currentToday, 1);
    return {
      ok: true,
      dates: {
        notBefore: monday,
        forcedOrigin: null,
      },
    };
  }

  if (startMode === "nextFullWeek") {
    const origin = nextWeekdayAfterIso(currentToday, platformWeekStartsOn);
    return {
      ok: true,
      dates: {
        notBefore: origin,
        forcedOrigin: origin,
      },
    };
  }

  if (startMode === "preferredMonth") {
    if (!preferredMonth || !preferredMonth.year || !preferredMonth.month) {
      return {
        ok: false,
        error: "Please pick a preferred month and year.",
      };
    }
    const monthStr = String(preferredMonth.month).padStart(2, "0");
    const firstDay = `${preferredMonth.year}-${monthStr}-01`;
    if (!isValidIsoDate(firstDay)) {
      return {
        ok: false,
        error: "Invalid preferred month/year.",
      };
    }

    const d = toUtcDate(firstDay);
    const lastDayOfMonth = formatUtcIso(endOfMonth(d));

    if (lastDayOfMonth < currentToday) {
      return {
        ok: false,
        error: "That month is already over. Pick a current or future month.",
      };
    }

    const notBefore = firstDay < currentToday ? currentToday : firstDay;
    return {
      ok: true,
      dates: {
        notBefore,
        forcedOrigin: null,
      },
    };
  }

  return {
    ok: true,
    dates: {
      notBefore: currentToday,
      forcedOrigin: null,
    },
  };
}

export function getTimeZoneOffsetMinutes(timeZone: string, dateIso: IsoDate): number {
  try {
    const targetDate = new Date(`${dateIso}T12:00:00Z`);
    // Format targetDate in UTC and in local timeZone
    const utcFormat = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });
    const tzFormat = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });

    const utcParts = utcFormat.formatToParts(targetDate);
    const tzParts = tzFormat.formatToParts(targetDate);

    const getPart = (parts: Intl.DateTimeFormatPart[], type: string) =>
      parseInt(parts.find((p) => p.type === type)?.value || "0", 10);

    const utcH = getPart(utcParts, "hour") % 24;
    const utcM = getPart(utcParts, "minute");
    const tzH = getPart(tzParts, "hour") % 24;
    const tzM = getPart(tzParts, "minute");
    const tzDay = getPart(tzParts, "day");
    const utcDay = getPart(utcParts, "day");

    let diffMinutes = (tzH - utcH) * 60 + (tzM - utcM);
    if (tzDay > utcDay || (utcDay > 25 && tzDay === 1)) {
      diffMinutes += 24 * 60;
    } else if (tzDay < utcDay || (tzDay > 25 && utcDay === 1)) {
      diffMinutes -= 24 * 60;
    }

    return diffMinutes;
  } catch {
    return 0;
  }
}

export function formatMinutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function utcSafeWindow(
  timeZone: string,
  dateIso: IsoDate
): { fromMinutes: number; toMinutes: number; windowString: string } {
  const offset = getTimeZoneOffsetMinutes(timeZone, dateIso);
  let from = 0;
  let to = 24 * 60;

  if (offset === 0) {
    from = 0;
    to = 24 * 60;
  } else if (offset > 0) {
    from = offset;
    to = 24 * 60;
  } else {
    from = 0;
    to = 24 * 60 + offset;
  }

  const windowString = `${formatMinutesToTime(from)}–${formatMinutesToTime(to)}`;
  return { fromMinutes: from, toMinutes: to, windowString };
}

export {
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
};
