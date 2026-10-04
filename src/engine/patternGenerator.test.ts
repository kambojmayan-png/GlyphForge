import { describe, it, expect } from "vitest";
import { generatePatternMatrix } from "./patternGenerator";
import { normalizeInput } from "../utils/textUtils";
import { DEFAULT_SETTINGS, SIZE_PRESETS } from "./defaults";
import { PatternSettings } from "../types/pattern";

function countActiveCells(levels: Uint8Array): number {
  let count = 0;
  for (let i = 0; i < levels.length; i++) {
    if (levels[i] > 0) count++;
  }
  return count;
}

describe("Pattern Generator Golden Vectors", () => {
  const normalSettings: PatternSettings = {
    ...DEFAULT_SETTINGS,
    sizePreset: "normal",
    charSpacing: 1,
    wordSpacing: 4,
  };

  it("MAYAN -> 29 cols, 81 active cells", async () => {
    const norm = normalizeInput("MAYAN");
    const m = await generatePatternMatrix(norm, normalSettings);
    expect(m.cols).toBe(29);
    expect(countActiveCells(m.levels)).toBe(81);
  });

  it("MAYAN exact rows 0 to 6 snapshot", async () => {
    const norm = normalizeInput("MAYAN");
    const m = await generatePatternMatrix(norm, normalSettings);
    const rows: string[] = [];
    for (let r = 0; r < 7; r++) {
      let rowStr = "";
      for (let c = 0; c < m.cols; c++) {
        rowStr += m.levels[r * m.cols + c] > 0 ? "#" : ".";
      }
      rows.push(rowStr);
    }

    const expectedRows = [
      "#...#..###..#...#..###..#...#",
      "##.##.#...#.#...#.#...#.#...#",
      "#.#.#.#...#..#.#..#...#.##..#",
      "#.#.#.#####...#...#####.#.#.#",
      "#...#.#...#...#...#...#.#..##",
      "#...#.#...#...#...#...#.#...#",
      "#...#.#...#...#...#...#.#...#",
    ];

    expect(rows).toEqual(expectedRows);
  });

  it("HELLO -> 29 cols, 73 active cells", async () => {
    const norm = normalizeInput("HELLO");
    const m = await generatePatternMatrix(norm, normalSettings);
    expect(m.cols).toBe(29);
    expect(countActiveCells(m.levels)).toBe(73);
  });

  it("2026 -> 23 cols, 62 active cells", async () => {
    const norm = normalizeInput("2026");
    const m = await generatePatternMatrix(norm, normalSettings);
    expect(m.cols).toBe(23);
    expect(countActiveCells(m.levels)).toBe(62);
  });

  it("# -> 5 cols, 20 active cells", async () => {
    const norm = normalizeInput("#");
    const m = await generatePatternMatrix(norm, normalSettings);
    expect(m.cols).toBe(5);
    expect(countActiveCells(m.levels)).toBe(20);
  });

  it("- -> 5 cols, 5 active cells", async () => {
    const norm = normalizeInput("-");
    const m = await generatePatternMatrix(norm, normalSettings);
    expect(m.cols).toBe(5);
    expect(countActiveCells(m.levels)).toBe(5);
  });

  it("I -> 3 cols, 11 active cells", async () => {
    const norm = normalizeInput("I");
    const m = await generatePatternMatrix(norm, normalSettings);
    expect(m.cols).toBe(3);
    expect(countActiveCells(m.levels)).toBe(11);
  });

  it("♥ -> 7 cols, 34 active cells", async () => {
    const norm = normalizeInput("♥");
    const m = await generatePatternMatrix(norm, normalSettings);
    expect(m.cols).toBe(7);
    expect(countActiveCells(m.levels)).toBe(34);
  });

  it("MAYAN# -> 35 cols, 101 active cells", async () => {
    const norm = normalizeInput("MAYAN#");
    const m = await generatePatternMatrix(norm, normalSettings);
    expect(m.cols).toBe(35);
    expect(countActiveCells(m.levels)).toBe(101);
  });

  it("MAYAN 19 -> 42 cols (Compact 41, Wide 49), 106 active cells", async () => {
    const norm = normalizeInput("MAYAN 19");

    const mNormal = await generatePatternMatrix(norm, normalSettings);
    expect(mNormal.cols).toBe(42);
    expect(countActiveCells(mNormal.levels)).toBe(106);

    const mCompact = await generatePatternMatrix(norm, {
      ...normalSettings,
      sizePreset: "compact",
      charSpacing: SIZE_PRESETS.compact.charSpacing,
      wordSpacing: SIZE_PRESETS.compact.wordSpacing,
    });
    expect(mCompact.cols).toBe(41);
    expect(countActiveCells(mCompact.levels)).toBe(106);

    const mWide = await generatePatternMatrix(norm, {
      ...normalSettings,
      sizePreset: "wide",
      charSpacing: SIZE_PRESETS.wide.charSpacing,
      wordSpacing: SIZE_PRESETS.wide.wordSpacing,
    });
    expect(mWide.cols).toBe(49);
    expect(countActiveCells(mWide.levels)).toBe(106);
  });

  it("HELLO WORLD -> 62 cols (Compact 61, Compact + spacing 0: 53), 154 active cells", async () => {
    const norm = normalizeInput("HELLO WORLD");

    const mNormal = await generatePatternMatrix(norm, normalSettings);
    expect(mNormal.cols).toBe(62);
    expect(countActiveCells(mNormal.levels)).toBe(154);

    const mCompact = await generatePatternMatrix(norm, {
      ...normalSettings,
      sizePreset: "compact",
      charSpacing: 1,
      wordSpacing: 3,
    });
    expect(mCompact.cols).toBe(61);
    expect(countActiveCells(mCompact.levels)).toBe(154);

    const mCompactZero = await generatePatternMatrix(norm, {
      ...normalSettings,
      sizePreset: "compact",
      charSpacing: 0,
      wordSpacing: 3,
    });
    expect(mCompactZero.cols).toBe(53);
    expect(countActiveCells(mCompactZero.levels)).toBe(154);
  });

  it("04/10/2006 -> 57 cols, 143 active cells", async () => {
    const norm = normalizeInput("04/10/2006");
    const m = await generatePatternMatrix(norm, normalSettings);
    expect(m.cols).toBe(57);
    expect(countActiveCells(m.levels)).toBe(143);
  });

  it("GLYPHFORGE -> 59 cols, 155 active cells", async () => {
    const norm = normalizeInput("GLYPHFORGE");
    const m = await generatePatternMatrix(norm, normalSettings);
    expect(m.cols).toBe(59);
    expect(countActiveCells(m.levels)).toBe(155);
  });

  it("performance guard: 120-grapheme pixel-font finishes within 250ms", async () => {
    const text120 = "MAYAN".repeat(24); // 120 chars
    const norm = normalizeInput(text120);

    const start = performance.now();
    const m = await generatePatternMatrix(norm, normalSettings);
    const elapsed = performance.now() - start;

    expect(m.cols).toBeGreaterThan(100);
    expect(elapsed).toBeLessThan(250);
  });

  it("spaces: collapses multiple spaces and trims edges", () => {
    const norm = normalizeInput("   A    B   ");
    expect(norm.lines).toEqual(["A B"]);
  });

  it("invert: inverts cells inside bounds", async () => {
    const norm = normalizeInput("-");
    const mNormal = await generatePatternMatrix(norm, normalSettings);
    expect(countActiveCells(mNormal.levels)).toBe(5);

    const mInvert = await generatePatternMatrix(norm, {
      ...normalSettings,
      invert: true,
      padding: 0,
    });
    // With 1 padding added for invert: total cols = 5 + 2 = 7, total cells = 49.
    // 5 active previously, so 49 - 5 = 44 active cells
    expect(mInvert.cols).toBe(7);
    expect(countActiveCells(mInvert.levels)).toBe(44);
  });
});
