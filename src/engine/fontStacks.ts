export type SupportedScript =
  | "latin"
  | "devanagari"
  | "arabic"
  | "hebrew"
  | "japanese"
  | "chinese-sc"
  | "chinese-tc"
  | "korean"
  | "emoji"
  | "symbols";

export const FONT_STACKS: Record<SupportedScript, string> = {
  latin: '"Geist", system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  devanagari: '"Noto Sans Devanagari", "Nirmala UI", "Kohinoor Devanagari", "Devanagari Sangam MN", Mangal, sans-serif',
  arabic: '"Noto Naskh Arabic", "Noto Sans Arabic", "Geeza Pro", "Segoe UI", Tahoma, sans-serif',
  hebrew: '"Noto Sans Hebrew", "Arial Hebrew", "Segoe UI", Arial, sans-serif',
  japanese: '"Hiragino Sans", "Yu Gothic", Meiryo, "Noto Sans JP", "Noto Sans CJK JP", sans-serif',
  "chinese-sc": '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Noto Sans CJK SC", sans-serif',
  "chinese-tc": '"PingFang TC", "Microsoft JhengHei", "Noto Sans TC", "Noto Sans CJK TC", sans-serif',
  korean: '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", "Noto Sans CJK KR", sans-serif',
  emoji: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif',
  symbols: '"Segoe UI Symbol", "Noto Sans Symbols 2", "Apple Symbols", sans-serif',
};
