export interface GlyphData {
  rows: string[]; // exactly 7 rows
  width: number;
}

// Helper to trim leading and trailing blank columns
function trimGlyph(rows: string[]): GlyphData {
  if (rows.length !== 7) {
    throw new Error(`Glyph must have exactly 7 rows, got ${rows.length}`);
  }
  const width = rows[0].length;
  for (let r = 1; r < 7; r++) {
    if (rows[r].length !== width) {
      throw new Error(`Glyph rows have mismatched lengths: ${rows[0].length} vs ${rows[r].length}`);
    }
  }

  // Find first and last columns with at least one '1'
  let firstCol = width;
  let lastCol = -1;

  for (let c = 0; c < width; c++) {
    let hasInk = false;
    for (let r = 0; r < 7; r++) {
      if (rows[r][c] === "1") {
        hasInk = true;
        break;
      }
    }
    if (hasInk) {
      if (firstCol === width) firstCol = c;
      lastCol = c;
    }
  }

  // If completely empty (like space), keep 0 width or original
  if (lastCol === -1) {
    return { rows, width };
  }

  const trimmedRows = rows.map((row) => row.slice(firstCol, lastCol + 1));
  return {
    rows: trimmedRows,
    width: lastCol - firstCol + 1,
  };
}

// Raw font definitions as specified in README 11.4
const RAW_FONT_TABLE: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "10001", "11001", "10101", "10011", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  ".": ["0", "0", "0", "0", "0", "0", "1"],
  "!": ["1", "1", "1", "1", "1", "0", "1"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  ":": ["0", "0", "1", "0", "1", "0", "0"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  // Additional common symbols
  ",": ["0", "0", "0", "0", "0", "1", "1"],
  ";": ["0", "0", "1", "0", "0", "1", "1"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "_": ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
  "*": ["00000", "10101", "01110", "11111", "01110", "10101", "00000"],
  "'": ["1", "1", "0", "0", "0", "0", "0"],
  '"': ["101", "101", "000", "000", "000", "000", "000"],
  "(": ["011", "100", "100", "100", "100", "100", "011"],
  ")": ["110", "001", "001", "001", "001", "001", "110"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "@": ["01110", "10001", "10111", "10101", "10110", "10000", "01111"],
  "%": ["11001", "11010", "00100", "01000", "01011", "10011", "00000"],
};

// Hand-tuned heart override (7x7)
const HEART_ROWS = [
  "0110110",
  "1111111",
  "1111111",
  "1111111",
  "0111110",
  "0011100",
  "0001000",
];

// Missing placeholder (hollow 5x7 box)
export const MISSING_GLYPH: GlyphData = {
  rows: ["11111", "10001", "10001", "10001", "10001", "10001", "11111"],
  width: 5,
};

// Processed font map with trimmed blank columns
export const FONT_5X7: Map<string, GlyphData> = new Map();

for (const [char, rows] of Object.entries(RAW_FONT_TABLE)) {
  FONT_5X7.set(char, trimGlyph(rows));
}

// Override lookup
export function getOverrideGlyph(cluster: string): GlyphData | null {
  // Strip variation selector U+FE0F
  const stripped = cluster.replace(/\uFE0F/g, "");
  if (stripped === "♥" || stripped === "❤" || stripped === "❤️") {
    return {
      rows: [...HEART_ROWS],
      width: 7,
    };
  }
  return null;
}

export function getPixelFontGlyph(char: string): GlyphData | null {
  const upper = char.toUpperCase();
  return FONT_5X7.get(upper) ?? null;
}

export function isCoveredByPixelFont(cluster: string): boolean {
  if (getOverrideGlyph(cluster)) return true;
  if (cluster === " ") return true;
  return getPixelFontGlyph(cluster) !== null;
}

// Validator used by unit test
export function validateFont5x7(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const [char, glyph] of FONT_5X7.entries()) {
    if (glyph.rows.length !== 7) {
      errors.push(`Glyph '${char}' does not have 7 rows (${glyph.rows.length})`);
    }
    const width = glyph.width;
    for (let r = 0; r < 7; r++) {
      if (glyph.rows[r].length !== width) {
        errors.push(`Glyph '${char}' row ${r} length ${glyph.rows[r].length} != width ${width}`);
      }
      for (const ch of glyph.rows[r]) {
        if (ch !== "0" && ch !== "1") {
          errors.push(`Glyph '${char}' contains invalid char '${ch}'`);
        }
      }
    }
    const hasOne = glyph.rows.some((row) => row.includes("1"));
    if (!hasOne) {
      errors.push(`Glyph '${char}' has no ink`);
    }
  }
  return { valid: errors.length === 0, errors };
}
