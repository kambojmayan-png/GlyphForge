import { PatternWarning } from "../types/pattern";
import { SupportedScript } from "../engine/fontStacks";

export interface NormalizedInput {
  lines: string[];
  rawText: string;
  normalizedText: string;
  graphemeCount: number;
  warnings: PatternWarning[];
}

// Control characters regex (C0 except \n, and C1)
const C0_C1_EXCEPT_LF = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g;
// Bidi overrides and isolates: U+202A..U+202E, U+2066..U+2069
const BIDI_CONTROLS = /[\u202A-\u202E\u2066-\u2069]/g;
// Lone surrogates regex
const LONE_SURROGATES = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

export function segmentGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    try {
      const segmenter = new (Intl as any).Segmenter(undefined, { granularity: "grapheme" });
      const segments = Array.from(segmenter.segment(text));
      return segments.map((s: any) => s.segment);
    } catch {
      // Fallback below
    }
  }

  // Fallback grapheme segmenter: regex matching combining marks, emoji ZWJ sequences
  const graphemeRegex = /\p{RI}\p{RI}|(?:\p{Emoji}(?:\uFE0F|\p{EMod})?(?:\u200D\p{Emoji}(?:\uFE0F|\p{EMod})?)*)|\P{M}\p{M}*/gu;
  const matches = text.match(graphemeRegex);
  return matches || Array.from(text);
}

export function countGraphemes(text: string): number {
  return segmentGraphemes(text).length;
}

export function normalizeInput(rawText: string): NormalizedInput {
  const warnings: PatternWarning[] = [];

  let text = rawText.normalize("NFC");

  // Check and strip lone surrogates
  if (LONE_SURROGATES.test(text)) {
    warnings.push({
      code: "LONE_SURROGATE",
      message: "Lone surrogates were replaced with .",
    });
    text = text.replace(LONE_SURROGATES, "\uFFFD");
  }

  // Check and strip bidi controls
  if (BIDI_CONTROLS.test(text)) {
    warnings.push({
      code: "BIDI_STRIPPED",
      message: "Bidirectional override controls were removed.",
    });
    text = text.replace(BIDI_CONTROLS, "");
  }

  // Check and strip C0/C1 control characters
  if (C0_C1_EXCEPT_LF.test(text)) {
    warnings.push({
      code: "CONTROL_STRIPPED",
      message: "Control characters were removed.",
    });
    text = text.replace(C0_C1_EXCEPT_LF, "");
  }

  // Normalize line endings and tabs
  text = text.replace(/\r\n|\r/g, "\n").replace(/\t/g, " ");

  // Split lines, trim spaces, collapse runs of spaces
  const rawLines = text.split("\n");
  const processedLines: string[] = [];

  for (const line of rawLines) {
    const trimmed = line.trim().replace(/ +/g, " ");
    if (trimmed.length > 0) {
      processedLines.push(trimmed);
    }
  }

  const normalizedText = processedLines.join("\n");
  const graphemeCount = countGraphemes(normalizedText);

  return {
    lines: processedLines,
    rawText,
    normalizedText,
    graphemeCount,
    warnings,
  };
}

export function detectScript(
  text: string,
  hanHint: "auto" | "ja" | "zh-Hans" | "zh-Hant" | "ko" = "auto"
): SupportedScript {
  // Emoji check
  if (/\p{Extended_Pictographic}/u.test(text)) {
    return "emoji";
  }

  // Arabic
  if (/\p{Script=Arabic}/u.test(text)) {
    return "arabic";
  }

  // Hebrew
  if (/\p{Script=Hebrew}/u.test(text)) {
    return "hebrew";
  }

  // Devanagari & Indic
  if (
    /\p{Script=Devanagari}|\p{Script=Bengali}|\p{Script=Gurmukhi}|\p{Script=Gujarati}|\p{Script=Oriya}|\p{Script=Tamil}|\p{Script=Telugu}|\p{Script=Kannada}|\p{Script=Malayalam}/u.test(
      text
    )
  ) {
    return "devanagari";
  }

  // Japanese kana
  if (/\p{Script=Hiragana}|\p{Script=Katakana}/u.test(text)) {
    return "japanese";
  }

  // Korean Hangul
  if (/\p{Script=Hangul}/u.test(text)) {
    return "korean";
  }

  // Han ideographs
  if (/\p{Script=Han}/u.test(text)) {
    if (hanHint === "ja") return "japanese";
    if (hanHint === "ko") return "korean";
    if (hanHint === "zh-Hant") return "chinese-tc";
    return "chinese-sc"; // default simplified chinese
  }

  // Symbols
  if (/[\p{S}\p{P}]/u.test(text) && !/[a-zA-Z0-9]/u.test(text)) {
    return "symbols";
  }

  return "latin";
}

export function isShapingDependentScript(text: string): boolean {
  return /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Gurmukhi}\p{Script=Gujarati}\p{Script=Oriya}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}\p{Script=Sinhala}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u.test(
    text
  );
}

export function isRTL(text: string): boolean {
  return /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}]/u.test(text);
}

export function toSlug(text: string): string {
  const normalized = text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const slug = normalized
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  return slug || "pattern";
}
