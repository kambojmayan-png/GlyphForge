import { describe, it, expect } from "vitest";

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("WCAG Relative Luminance & Design Tokens Contrast", () => {
  describe("Dark Theme Tokens", () => {
    const surface = "#111820";
    const text = "#e6edf3";
    const textMuted = "#9aa7b4";
    const warn = "#e3b341";
    const error = "#ff8b84";

    const level0 = "#202b36";
    const level1 = "#2a8450";
    const level2 = "#3fa96b";
    const level3 = "#63cf8c";
    const level4 = "#a3f0bd";

    it("text on surface >= 15:1", () => {
      expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(15);
    });

    it("text-muted on surface >= 7:1", () => {
      expect(contrastRatio(textMuted, surface)).toBeGreaterThanOrEqual(7);
    });

    it("warn on surface >= 9:1", () => {
      expect(contrastRatio(warn, surface)).toBeGreaterThanOrEqual(9);
    });

    it("error on surface >= 7.5:1", () => {
      expect(contrastRatio(error, surface)).toBeGreaterThanOrEqual(7.5);
    });

    it("levels contrast ratios increase monotonically vs level 0", () => {
      const cr1 = contrastRatio(level1, level0);
      const cr2 = contrastRatio(level2, level0);
      const cr3 = contrastRatio(level3, level0);
      const cr4 = contrastRatio(level4, level0);

      expect(cr1).toBeGreaterThanOrEqual(3.0);
      expect(cr2).toBeGreaterThanOrEqual(4.5);
      expect(cr3).toBeGreaterThanOrEqual(7.0);
      expect(cr4).toBeGreaterThanOrEqual(10.0);
    });
  });

  describe("Light Theme Tokens", () => {
    const white = "#ffffff";
    const text = "#1f2328";
    const textMuted = "#59636e";

    const level0 = "#e3e8ed";
    const level2 = "#33965a";
    const level3 = "#1f7740";
    const level4 = "#115429";

    it("text on white >= 15:1", () => {
      expect(contrastRatio(text, white)).toBeGreaterThanOrEqual(15);
    });

    it("text-muted on white >= 6:1", () => {
      expect(contrastRatio(textMuted, white)).toBeGreaterThanOrEqual(6);
    });

    it("levels 2, 3, 4 vs level 0 meet WCAG contrast thresholds", () => {
      expect(contrastRatio(level2, level0)).toBeGreaterThanOrEqual(3.0);
      expect(contrastRatio(level3, level0)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(level4, level0)).toBeGreaterThanOrEqual(7.0);
    });
  });
});
