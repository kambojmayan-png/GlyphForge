import { IsoDate } from "./pattern";
import { GlyphOrigin } from "./schedule";

export interface CalendarDay {
  date: IsoDate;
  inMonth: boolean; // false for leading/trailing days of adjacent months
  active: boolean;
  required: number;
  status: "past" | "today" | "future";
  done: boolean;
  pixel?: { row: number; column: number };
  glyph?: GlyphOrigin;
}

export interface MonthPlan {
  key: string; // "YYYY-MM"
  year: number;
  month: number; // 1..12
  label: string; // "October 2026"
  weeks: CalendarDay[][]; // 4-6 weeks x 7 days
  activeCount: number;
  doneCount: number;
  remainingCount: number;
  missedCount: number;
}

export type PaperSize = "A4" | "Letter";
export type Orientation = "portrait" | "landscape";
export type MarkerStyle = "shaded_symbol" | "symbol_only" | "checkbox";

export interface PrintOptions {
  paper: PaperSize;
  orientation: Orientation;
  markerStyle: MarkerStyle;
  firstWeekday: 0 | 1; // 0 = Sunday, 1 = Monday
  includeGraphStrip: boolean;
  showInactiveMarkers: boolean;
  rowMm: number;
}

export interface PrintDocument {
  title: string;
  subtitle: string;
  pattern: string;
  platform: string;
  dateRange: string;
  summaryLine: string;
  graphStrip: { rows: 7; cols: number; levels: Uint8Array } | null;
  pages: MonthPlan[][][]; // pages -> rows -> months
  legend: { marker: string; label: string }[];
  footer: string;
  tzNote: string | null;
}
