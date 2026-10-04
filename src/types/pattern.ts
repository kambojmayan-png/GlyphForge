export type IsoDate = string; // "YYYY-MM-DD"

export type PlatformId = "github" | "leetcode" | "generic";
export type StartMode = "custom" | "nextMonday" | "nextFullWeek" | "preferredMonth";
export type SizePreset = "compact" | "normal" | "wide";
export type Alignment = "left" | "center" | "right";
export type RenderMode = "auto" | "pixel" | "canvas";
export type ThemeMode = "dark" | "light" | "system";
export type AnimationMode = "full" | "reduced" | "off";

export interface PatternSettings {
  text: string;
  platform: PlatformId;
  startMode: StartMode;
  startDate?: IsoDate;
  preferredMonth?: { year: number; month: number };
  sizePreset: SizePreset;
  charSpacing: number;
  wordSpacing: number;
  lineGap: number;
  columnStretch: number;
  density: number;
  intensity: number;
  shading: boolean;
  invert: boolean;
  alignment: Alignment;
  renderMode: RenderMode;
  padding: number;
  weekStartsOnOverride: number | null;
  printWeekStart: 0 | 1;
  timeZone: string;
  animation: AnimationMode;
  theme: ThemeMode;
  hanHint?: "auto" | "ja" | "zh-Hans" | "zh-Hant" | "ko";
}

export type ColumnMetaKind = "glyph" | "gap" | "lineGap" | "padding" | "offset";

export interface ColumnMeta {
  kind: ColumnMetaKind;
  lineIndex: number;
  clusterIndex: number | null;
  cluster: string | null;
  glyphColumn: number | null;
  glyphWidth: number | null;
}

export type WarningCode =
  | "CONTROL_STRIPPED"
  | "BIDI_STRIPPED"
  | "LONE_SURROGATE"
  | "NOT_IN_PIXEL_FONT"
  | "MISSING_GLYPH"
  | "CLUSTER_NOT_COMPOSED"
  | "LOW_FIDELITY"
  | "EMOJI_VARIANCE"
  | "VERY_WIDE"
  | "INVERT_HIGH_COUNT"
  | "PAST_DATES";

export interface PatternWarning {
  code: WarningCode;
  message: string;
  details?: {
    cluster?: string;
    position?: number;
    count?: number;
    fidelity?: number;
  };
}

export interface PatternMatrix {
  rows: 7;
  cols: number;
  levels: Uint8Array; // row-major, 7 * cols, values 0..4
  meta: ColumnMeta[];
  warnings: PatternWarning[];
  fidelity: { cluster: string; value: number }[];
}

export interface FitSuggestion {
  label: string;
  description: string;
  columns: number;
  patch: Partial<PatternSettings>;
}

export interface PlatformProfile {
  id: PlatformId;
  label: string;
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
  unit: "contribution" | "submission";
  dayBoundary: "utc" | "local";
  softColumnLimit: number;
  verified: boolean;
  notes: string[];
}
