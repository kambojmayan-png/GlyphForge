import {
  PatternSettings,
  PatternMatrix,
  ColumnMeta,
  PatternWarning,
  FitSuggestion,
} from "../types/pattern";
import {
  NormalizedInput,
  normalizeInput,
  segmentGraphemes,
  detectScript,
  isShapingDependentScript,
  isRTL,
} from "../utils/textUtils";
import { getOverrideGlyph, getPixelFontGlyph, MISSING_GLYPH } from "./font5x7";
import { FONT_STACKS } from "./fontStacks";
import {
  renderTextToBitmap,
  isCategoryUnassignedOrPrivateUse,
  checkEmojiComposition,
} from "./renderTextToBitmap";
import {
  bitmapToGrayscale,
  inkBox,
  resizeBitmapToHeight,
  bitmapToBinaryMatrix,
  computeFidelity,
} from "./bitmapProcessor";
import { CanvasFactory, FontsManager } from "../utils/canvasUtils";
import { SOFT_COLUMN_LIMIT } from "./defaults";

export interface GlyphToken {
  kind: "glyph" | "space";
  matrix: { rows: 7; cols: number; levels: Uint8Array };
  meta: {
    lineIndex: number;
    clusterIndex: number | null;
    cluster: string | null;
  };
}

export interface GeneratorEnv {
  canvasFactory?: CanvasFactory;
  fonts?: FontsManager;
  signal?: AbortSignal;
}

export function createBlankMatrix(cols: number): { rows: 7; cols: number; levels: Uint8Array } {
  return {
    rows: 7,
    cols,
    levels: new Uint8Array(7 * cols),
  };
}

export async function buildTokenFromCanvas(
  text: string,
  lineIndex: number,
  clusterIndex: number | null,
  settings: PatternSettings,
  env: GeneratorEnv,
  warnings: PatternWarning[],
  fidelityList: { cluster: string; value: number }[]
): Promise<GlyphToken> {
  // Category check: unassigned / private use
  if (isCategoryUnassignedOrPrivateUse(text)) {
    warnings.push({
      code: "MISSING_GLYPH",
      message: `Your browser couldn't draw "${text}". It was replaced with a placeholder, so the pattern won't show that character.`,
      details: { cluster: text },
    });
    const missingLevels = new Uint8Array(7 * MISSING_GLYPH.width);
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < MISSING_GLYPH.width; c++) {
        missingLevels[r * MISSING_GLYPH.width + c] =
          MISSING_GLYPH.rows[r][c] === "1" ? settings.intensity : 0;
      }
    }
    return {
      kind: "glyph",
      matrix: { rows: 7, cols: MISSING_GLYPH.width, levels: missingLevels },
      meta: { lineIndex, clusterIndex, cluster: text },
    };
  }

  const script = detectScript(text, settings.hanHint);
  const fontStack = FONT_STACKS[script];
  const rtl = isRTL(text);

  // Check emoji variance
  if (script === "emoji") {
    const existing = warnings.find((w) => w.code === "EMOJI_VARIANCE");
    if (!existing) {
      warnings.push({
        code: "EMOJI_VARIANCE",
        message:
          "Emoji look different on each browser and operating system, so your pattern may not match what you see elsewhere.",
      });
    }
    const compWarn = checkEmojiComposition(text, fontStack, env.canvasFactory);
    if (compWarn) warnings.push(compWarn);
  }

  const bitmap = await renderTextToBitmap(text, {
    canvasFactory: env.canvasFactory,
    fonts: env.fonts,
    fontStack,
    direction: rtl ? "rtl" : "ltr",
    embolden: script !== "emoji",
  });

  const coverage = bitmapToGrayscale(bitmap, "alpha");
  const ink = inkBox(coverage);

  if (!ink) {
    // Empty ink -> missing glyph fallback
    warnings.push({
      code: "MISSING_GLYPH",
      message: `Your browser couldn't draw "${text}". It was replaced with a placeholder, so the pattern won't show that character.`,
      details: { cluster: text },
    });
    const missingLevels = new Uint8Array(7 * MISSING_GLYPH.width);
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < MISSING_GLYPH.width; c++) {
        missingLevels[r * MISSING_GLYPH.width + c] =
          MISSING_GLYPH.rows[r][c] === "1" ? settings.intensity : 0;
      }
    }
    return {
      kind: "glyph",
      matrix: { rows: 7, cols: MISSING_GLYPH.width, levels: missingLevels },
      meta: { lineIndex, clusterIndex, cluster: text },
    };
  }

  const sizePreset = settings.sizePreset;
  const xScale = sizePreset === "compact" ? 0.85 : sizePreset === "wide" ? 1.25 : 1.0;
  const covGrid = resizeBitmapToHeight(coverage, ink, bitmap.baseline, 7, xScale);

  const binMatrix = bitmapToBinaryMatrix(covGrid, {
    density: settings.density,
    intensity: settings.intensity,
    shading: settings.shading,
  });

  const fid = computeFidelity(binMatrix, coverage, ink);
  fidelityList.push({ cluster: text, value: fid });

  if (fid < 0.35) {
    warnings.push({
      code: "LOW_FIDELITY",
      message: `"${text}" has more detail than 7 rows can hold. It is probably unrecognisable.`,
      details: { cluster: text, fidelity: fid },
    });
  } else if (fid < 0.55) {
    warnings.push({
      code: "LOW_FIDELITY",
      message: `"${text}" has more detail than 7 rows can hold. It may be hard to recognise.`,
      details: { cluster: text, fidelity: fid },
    });
  }

  return {
    kind: "glyph",
    matrix: binMatrix,
    meta: { lineIndex, clusterIndex, cluster: text },
  };
}

export function combineCharacterMatrices(
  tokens: GlyphToken[],
  spacing: { charSpacing: number; wordSpacing: number }
): { rows: 7; cols: number; levels: Uint8Array; meta: ColumnMeta[] } {
  const resultCols: { levels: number[]; meta: ColumnMeta }[] = [];
  let prevToken: GlyphToken | null = null;

  for (const token of tokens) {
    if (prevToken) {
      // Space replaces charSpacing
      const gap =
        prevToken.kind === "space" || token.kind === "space" ? 0 : spacing.charSpacing;
      for (let g = 0; g < gap; g++) {
        resultCols.push({
          levels: [0, 0, 0, 0, 0, 0, 0],
          meta: {
            kind: "gap",
            lineIndex: token.meta.lineIndex,
            clusterIndex: null,
            cluster: null,
            glyphColumn: null,
            glyphWidth: null,
          },
        });
      }
    }

    if (token.kind === "space") {
      for (let s = 0; s < spacing.wordSpacing; s++) {
        resultCols.push({
          levels: [0, 0, 0, 0, 0, 0, 0],
          meta: {
            kind: "gap",
            lineIndex: token.meta.lineIndex,
            clusterIndex: null,
            cluster: null,
            glyphColumn: null,
            glyphWidth: null,
          },
        });
      }
    } else {
      const { cols, levels } = token.matrix;
      for (let c = 0; c < cols; c++) {
        const colLevels: number[] = [];
        for (let r = 0; r < 7; r++) {
          colLevels.push(levels[r * cols + c]);
        }
        resultCols.push({
          levels: colLevels,
          meta: {
            kind: "glyph",
            lineIndex: token.meta.lineIndex,
            clusterIndex: token.meta.clusterIndex,
            cluster: token.meta.cluster,
            glyphColumn: c,
            glyphWidth: cols,
          },
        });
      }
    }

    prevToken = token;
  }

  const totalCols = resultCols.length;
  const combinedLevels = new Uint8Array(7 * totalCols);
  const metas: ColumnMeta[] = [];

  for (let c = 0; c < totalCols; c++) {
    for (let r = 0; r < 7; r++) {
      combinedLevels[r * totalCols + c] = resultCols[c].levels[r];
    }
    metas.push(resultCols[c].meta);
  }

  return { rows: 7, cols: totalCols, levels: combinedLevels, meta: metas };
}

export function trimLeadingTrailingBlankColumns(matrix: {
  rows: 7;
  cols: number;
  levels: Uint8Array;
  meta: ColumnMeta[];
}): { rows: 7; cols: number; levels: Uint8Array; meta: ColumnMeta[] } {
  let firstCol = matrix.cols;
  let lastCol = -1;

  for (let c = 0; c < matrix.cols; c++) {
    let hasActive = false;
    for (let r = 0; r < 7; r++) {
      if (matrix.levels[r * matrix.cols + c] > 0) {
        hasActive = true;
        break;
      }
    }
    if (hasActive) {
      if (firstCol === matrix.cols) firstCol = c;
      lastCol = c;
    }
  }

  if (lastCol === -1) {
    return matrix;
  }

  const newCols = lastCol - firstCol + 1;
  const newLevels = new Uint8Array(7 * newCols);
  const newMeta: ColumnMeta[] = [];

  for (let c = 0; c < newCols; c++) {
    const srcC = firstCol + c;
    for (let r = 0; r < 7; r++) {
      newLevels[r * newCols + c] = matrix.levels[r * matrix.cols + srcC];
    }
    newMeta.push(matrix.meta[srcC]);
  }

  return { rows: 7, cols: newCols, levels: newLevels, meta: newMeta };
}

export async function generatePatternMatrix(
  norm: NormalizedInput,
  settings: PatternSettings,
  env: GeneratorEnv = {}
): Promise<PatternMatrix> {
  const warnings: PatternWarning[] = [...norm.warnings];
  const fidelityList: { cluster: string; value: number }[] = [];

  const lineMatrices: { rows: 7; cols: number; levels: Uint8Array; meta: ColumnMeta[] }[] = [];

  for (let lineIdx = 0; lineIdx < norm.lines.length; lineIdx++) {
    if (env.signal?.aborted) throw new Error("CANCELLED");

    const lineText = norm.lines[lineIdx];
    const isShaped = isShapingDependentScript(lineText);

    const tokens: GlyphToken[] = [];

    if (isShaped) {
      // Entire shaped line as 1 canvas run
      const token = await buildTokenFromCanvas(
        lineText,
        lineIdx,
        0,
        settings,
        env,
        warnings,
        fidelityList
      );
      tokens.push(token);
    } else {
      const clusters = segmentGraphemes(lineText);
      for (let clIdx = 0; clIdx < clusters.length; clIdx++) {
        if (env.signal?.aborted) throw new Error("CANCELLED");
        const cluster = clusters[clIdx];

        if (cluster === " ") {
          tokens.push({
            kind: "space",
            matrix: createBlankMatrix(0),
            meta: { lineIndex: lineIdx, clusterIndex: clIdx, cluster: " " },
          });
          continue;
        }

        // Check override first (e.g. hearts)
        const override = getOverrideGlyph(cluster);
        if (override) {
          const levels = new Uint8Array(7 * override.width);
          for (let r = 0; r < 7; r++) {
            for (let c = 0; c < override.width; c++) {
              levels[r * override.width + c] =
                override.rows[r][c] === "1" ? settings.intensity : 0;
            }
          }
          tokens.push({
            kind: "glyph",
            matrix: { rows: 7, cols: override.width, levels },
            meta: { lineIndex: lineIdx, clusterIndex: clIdx, cluster },
          });
          continue;
        }

        // Check pixel font
        const pixelGlyph =
          settings.renderMode !== "canvas" ? getPixelFontGlyph(cluster) : null;

        if (pixelGlyph) {
          const levels = new Uint8Array(7 * pixelGlyph.width);
          for (let r = 0; r < 7; r++) {
            for (let c = 0; c < pixelGlyph.width; c++) {
              levels[r * pixelGlyph.width + c] =
                pixelGlyph.rows[r][c] === "1" ? settings.intensity : 0;
            }
          }
          tokens.push({
            kind: "glyph",
            matrix: { rows: 7, cols: pixelGlyph.width, levels },
            meta: { lineIndex: lineIdx, clusterIndex: clIdx, cluster },
          });
        } else {
          // Canvas provider
          if (settings.renderMode === "pixel") {
            warnings.push({
              code: "NOT_IN_PIXEL_FONT",
              message: `"${cluster}" is not in the pixel font; rendered using canvas fallback.`,
              details: { cluster },
            });
          }
          const token = await buildTokenFromCanvas(
            cluster,
            lineIdx,
            clIdx,
            settings,
            env,
            warnings,
            fidelityList
          );
          tokens.push(token);
        }
      }
    }

    const combinedLine = combineCharacterMatrices(tokens, {
      charSpacing: settings.charSpacing,
      wordSpacing: settings.wordSpacing,
    });
    lineMatrices.push(combinedLine);
  }

  // Join lines with lineGap blank columns
  const allCols: { levels: number[]; meta: ColumnMeta }[] = [];
  for (let l = 0; l < lineMatrices.length; l++) {
    const lm = lineMatrices[l];
    if (l > 0) {
      for (let g = 0; g < settings.lineGap; g++) {
        allCols.push({
          levels: [0, 0, 0, 0, 0, 0, 0],
          meta: {
            kind: "lineGap",
            lineIndex: l,
            clusterIndex: null,
            cluster: null,
            glyphColumn: null,
            glyphWidth: null,
          },
        });
      }
    }
    for (let c = 0; c < lm.cols; c++) {
      const colLevels: number[] = [];
      for (let r = 0; r < 7; r++) {
        colLevels.push(lm.levels[r * lm.cols + c]);
      }
      allCols.push({ levels: colLevels, meta: lm.meta[c] });
    }
  }

  let finalCols = allCols.length;
  let combinedLevels = new Uint8Array(7 * finalCols);
  let combinedMeta: ColumnMeta[] = [];

  for (let c = 0; c < finalCols; c++) {
    for (let r = 0; r < 7; r++) {
      combinedLevels[r * finalCols + c] = allCols[c].levels[r];
    }
    combinedMeta.push(allCols[c].meta);
  }

  // Trim leading/trailing blank columns
  let trimmed = trimLeadingTrailingBlankColumns({
    rows: 7,
    cols: finalCols,
    levels: combinedLevels,
    meta: combinedMeta,
  });

  // Column stretch
  if (settings.columnStretch > 1) {
    const stretch = settings.columnStretch;
    const stretchedCols = trimmed.cols * stretch;
    const stretchedLevels = new Uint8Array(7 * stretchedCols);
    const stretchedMeta: ColumnMeta[] = [];

    for (let c = 0; c < trimmed.cols; c++) {
      for (let s = 0; s < stretch; s++) {
        const targetC = c * stretch + s;
        for (let r = 0; r < 7; r++) {
          stretchedLevels[r * stretchedCols + targetC] =
            trimmed.levels[r * trimmed.cols + c];
        }
        stretchedMeta.push({ ...trimmed.meta[c] });
      }
    }
    trimmed = {
      rows: 7,
      cols: stretchedCols,
      levels: stretchedLevels,
      meta: stretchedMeta,
    };
  }

  // Padding
  const pad = settings.invert ? Math.max(1, settings.padding) : settings.padding;
  if (pad > 0) {
    const paddedCols = trimmed.cols + pad * 2;
    const paddedLevels = new Uint8Array(7 * paddedCols);
    const paddedMeta: ColumnMeta[] = [];

    for (let p = 0; p < pad; p++) {
      paddedMeta.push({
        kind: "padding",
        lineIndex: 0,
        clusterIndex: null,
        cluster: null,
        glyphColumn: null,
        glyphWidth: null,
      });
    }
    paddedMeta.push(...trimmed.meta);
    for (let p = 0; p < pad; p++) {
      paddedMeta.push({
        kind: "padding",
        lineIndex: 0,
        clusterIndex: null,
        cluster: null,
        glyphColumn: null,
        glyphWidth: null,
      });
    }

    for (let c = 0; c < trimmed.cols; c++) {
      for (let r = 0; r < 7; r++) {
        paddedLevels[r * paddedCols + (c + pad)] = trimmed.levels[r * trimmed.cols + c];
      }
    }

    trimmed = {
      rows: 7,
      cols: paddedCols,
      levels: paddedLevels,
      meta: paddedMeta,
    };
  }

  // Invert
  if (settings.invert) {
    const maxLevel = settings.shading ? 4 : settings.intensity;
    let activeAfterInvert = 0;
    for (let i = 0; i < trimmed.levels.length; i++) {
      trimmed.levels[i] = trimmed.levels[i] === 0 ? maxLevel : maxLevel - trimmed.levels[i];
      if (trimmed.levels[i] > 0) activeAfterInvert++;
    }
    if (activeAfterInvert > 150) {
      warnings.push({
        code: "INVERT_HIGH_COUNT",
        message: `Inverting has created ${activeAfterInvert} active days. This will require consistent daily activity.`,
        details: { count: activeAfterInvert },
      });
    }
  }

  return {
    rows: 7,
    cols: trimmed.cols,
    levels: trimmed.levels,
    meta: trimmed.meta,
    warnings,
    fidelity: fidelityList,
  };
}

export async function computeFitSuggestions(
  norm: NormalizedInput,
  settings: PatternSettings,
  currentCols: number,
  env: GeneratorEnv = {}
): Promise<FitSuggestion[]> {
  const suggestions: FitSuggestion[] = [];
  if (currentCols <= SOFT_COLUMN_LIMIT) return suggestions;

  // 1. Compact preset
  if (settings.sizePreset !== "compact") {
    try {
      const compactSettings = {
        ...settings,
        sizePreset: "compact" as const,
        charSpacing: 1,
        wordSpacing: 3,
      };
      const compactMatrix = await generatePatternMatrix(norm, compactSettings, env);
      if (compactMatrix.cols < currentCols) {
        suggestions.push({
          label: "Compact spacing",
          description: `Compact: ${compactMatrix.cols} columns.`,
          columns: compactMatrix.cols,
          patch: { sizePreset: "compact", charSpacing: 1, wordSpacing: 3 },
        });
      }
    } catch {}
  }

  // 2. Compact with no character spacing
  try {
    const noSpaceSettings = {
      ...settings,
      sizePreset: "compact" as const,
      charSpacing: 0,
      wordSpacing: 3,
    };
    const noSpaceMatrix = await generatePatternMatrix(norm, noSpaceSettings, env);
    if (noSpaceMatrix.cols < currentCols) {
      const fits = noSpaceMatrix.cols <= SOFT_COLUMN_LIMIT ? " (fits)" : "";
      suggestions.push({
        label: "Compact with 0 char spacing",
        description: `Compact with no character spacing: ${noSpaceMatrix.cols}${fits}.`,
        columns: noSpaceMatrix.cols,
        patch: { sizePreset: "compact", charSpacing: 0, wordSpacing: 3 },
      });
    }
  } catch {}

  // 3. Without spaces (if input has spaces)
  if (settings.text.includes(" ")) {
    try {
      const noSpaceText = settings.text.replace(/ /g, "");
      const noSpaceNorm = normalizeInput(noSpaceText);
      const noSpaceMatrix = await generatePatternMatrix(noSpaceNorm, settings, env);
      if (noSpaceMatrix.cols < currentCols) {
        suggestions.push({
          label: "Remove spaces",
          description: `Without space: ${noSpaceMatrix.cols} columns.`,
          columns: noSpaceMatrix.cols,
          patch: { text: noSpaceText },
        });
      }
    } catch {}
  }

  return suggestions;
}
