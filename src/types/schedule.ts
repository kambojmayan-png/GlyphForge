import { IsoDate, PlatformProfile, PatternWarning, FitSuggestion, PatternMatrix } from "./pattern";
import { MonthPlan } from "./calendar";

export interface GridPlacement {
  origin: IsoDate; // date of row 0, column 0 of aligned matrix (always week-start)
  notBefore: IsoDate;
  shiftedWeeks: number;
  explanation?: string;
}

export interface GlyphOrigin {
  line: number;
  clusterIndex: number | null;
  cluster: string | null;
  glyphColumn: number | null;
  glyphWidth: number | null;
  kind?: string;
}

export interface ScheduleEntry {
  date: IsoDate;
  dayOfWeek: string; // e.g. "Sunday"
  month: string; // "YYYY-MM"
  active: boolean;
  level: number; // 0..4
  required: number; // contributions required that day
  pixelRow: number; // 0..6
  pixelColumn: number; // 0..cols-1
  status: "past" | "today" | "future";
  glyph: GlyphOrigin;
}

export interface PlanSummary {
  input: string;
  platformId: string;
  platformLabel: string;
  requestedStart: IsoDate;
  start: IsoDate;
  end: IsoDate;
  firstActiveDay: IsoDate | null;
  lastActiveDay: IsoDate | null;
  weeks: number;
  totalDays: number;
  activeDays: number;
  estimatedContributions: number;
  maxIntensity: number;
  patternWidth: number; // without alignment offset
  patternHeight: 7;
  columnOffset: number;
}

export interface TimeZoneAdvisory {
  timeZone: string;
  offsetMinutes: number;
  firstActiveDate: IsoDate;
  windowString: string; // e.g. "05:30 to 24:00"
  hasDstShift: boolean;
  lastActiveWindowString?: string;
}

export interface Plan {
  matrix: PatternMatrix;
  placement: GridPlacement;
  schedule: ScheduleEntry[];
  months: MonthPlan[];
  summary: PlanSummary;
  profile: PlatformProfile;
  warnings: PatternWarning[];
  fitSuggestions: FitSuggestion[];
  timeZoneAdvisory?: TimeZoneAdvisory;
}

export type EngineErrorCode =
  | "EMPTY_INPUT"
  | "WHITESPACE_ONLY"
  | "INVALID_DATE"
  | "PREFERRED_MONTH_PAST"
  | "NOTHING_DRAWABLE"
  | "TOO_WIDE_HARD"
  | "CANCELLED";

export interface EngineError {
  code: EngineErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: EngineError };
