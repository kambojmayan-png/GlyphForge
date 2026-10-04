import { PatternSettings, SizePreset } from "../types/pattern";

export const CONTRIBUTIONS_PER_LEVEL = [0, 1, 3, 6, 10] as const;

export const MAX_COLUMNS = 520;
export const SOFT_COLUMN_LIMIT = 53;
export const MAX_GRAPHEMES = 120;

export const SIZE_PRESETS: Record<
  SizePreset,
  { charSpacing: number; wordSpacing: number; xScale: number }
> = {
  compact: { charSpacing: 1, wordSpacing: 3, xScale: 0.85 },
  normal: { charSpacing: 1, wordSpacing: 4, xScale: 1.0 },
  wide: { charSpacing: 2, wordSpacing: 6, xScale: 1.25 },
};

export function getDefaultTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export const DEFAULT_SETTINGS: PatternSettings = {
  text: "",
  platform: "github",
  startMode: "nextFullWeek",
  startDate: undefined,
  preferredMonth: undefined,
  sizePreset: "normal",
  charSpacing: 1,
  wordSpacing: 4,
  lineGap: 6,
  columnStretch: 1,
  density: 0,
  intensity: 1,
  shading: false,
  invert: false,
  alignment: "left",
  renderMode: "auto",
  padding: 0,
  weekStartsOnOverride: null,
  printWeekStart: 1, // Monday
  timeZone: getDefaultTimeZone(),
  animation: "full",
  theme: "dark",
  hanHint: "auto",
};
