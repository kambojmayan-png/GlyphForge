import { describe, it, expect } from "vitest";
import {
  FONT_5X7,
  validateFont5x7,
  getOverrideGlyph,
  getPixelFontGlyph,
  MISSING_GLYPH,
} from "./font5x7";

describe("5x7 Pixel Font & Overrides", () => {
  it("passes normative font validation", () => {
    const { valid, errors } = validateFont5x7();
    expect(errors).toEqual([]);
    expect(valid).toBe(true);
  });

  it("has exactly 7 rows for every glyph in the table", () => {
    for (const [, glyph] of FONT_5X7.entries()) {
      expect(glyph.rows).toHaveLength(7);
      expect(glyph.width).toBeGreaterThanOrEqual(1);
      expect(glyph.width).toBeLessThanOrEqual(7);
    }
  });

  it("trims 'I' to 3 columns and keeps '-' at 5 columns", () => {
    const iGlyph = getPixelFontGlyph("I");
    expect(iGlyph).not.toBeNull();
    expect(iGlyph!.width).toBe(3);

    const dashGlyph = getPixelFontGlyph("-");
    expect(dashGlyph).not.toBeNull();
    expect(dashGlyph!.width).toBe(5);
  });

  it("correctly identifies hand-tuned heart overrides (♥, ❤, ❤️)", () => {
    const heart1 = getOverrideGlyph("♥");
    expect(heart1).not.toBeNull();
    expect(heart1!.rows).toHaveLength(7);
    expect(heart1!.width).toBe(7);

    const heart2 = getOverrideGlyph("❤");
    expect(heart2).not.toBeNull();
    expect(heart2!.width).toBe(7);

    const heartEmoji = getOverrideGlyph("❤️");
    expect(heartEmoji).not.toBeNull();
    expect(heartEmoji!.width).toBe(7);

    // Count active cells in heart (must be 34)
    let heartActive = 0;
    for (const r of heart1!.rows) {
      for (const ch of r) {
        if (ch === "1") heartActive++;
      }
    }
    expect(heartActive).toBe(34);
  });

  it("provides missing glyph placeholder box", () => {
    expect(MISSING_GLYPH.rows).toHaveLength(7);
    expect(MISSING_GLYPH.width).toBe(5);
  });
});
