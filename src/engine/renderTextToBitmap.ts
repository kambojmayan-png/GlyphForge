import { CanvasFactory, FontsManager, defaultCanvasFactory, defaultFontsManager } from "../utils/canvasUtils";
import { PatternWarning } from "../types/pattern";

export const RASTER_PX = 160;

export interface RasterBitmap {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  baseline: number;
}

export interface RasterOptions {
  canvasFactory?: CanvasFactory;
  fonts?: FontsManager;
  fontStack: string;
  weight?: string | number;
  direction?: "ltr" | "rtl";
  embolden?: boolean;
}

export function isCategoryUnassignedOrPrivateUse(str: string): boolean {
  for (const ch of str) {
    const code = ch.codePointAt(0);
    if (!code) continue;
    // Unicode Cn (unassigned) and Co (private use)
    // Basic Private Use Area: U+E000..U+F8FF
    // Supplementary Private Use Area-A: U+F0000..U+FFFFD
    // Supplementary Private Use Area-B: U+100000..U+10FFFD
    if (
      (code >= 0xe000 && code <= 0xf8ff) ||
      (code >= 0xf0000 && code <= 0xffffd) ||
      (code >= 0x100000 && code <= 0x10fffd)
    ) {
      return true;
    }
  }
  return false;
}

export async function renderTextToBitmap(
  text: string,
  options: RasterOptions
): Promise<RasterBitmap> {
  const canvasFactory = options.canvasFactory || defaultCanvasFactory;
  const fonts = options.fonts || defaultFontsManager;
  const weight = options.weight ?? 800;
  const fontDesc = `${weight} ${RASTER_PX}px ${options.fontStack}`;
  const direction = options.direction ?? "ltr";

  await fonts.load(fontDesc, text);
  await fonts.ready();

  // Create probe canvas to measure width
  const probeCanvas = canvasFactory(1, 1);
  const probeCtx = probeCanvas.getContext("2d") as CanvasRenderingContext2D;
  probeCtx.font = fontDesc;
  probeCtx.direction = direction;

  const measuredWidth = probeCtx.measureText(text).width;
  const width = Math.max(1, Math.ceil(measuredWidth + RASTER_PX * 0.5));
  const height = Math.max(1, Math.ceil(RASTER_PX * 1.8));

  // Render canvas
  const canvas = canvasFactory(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, width, height);
  ctx.font = fontDesc;
  ctx.direction = direction;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#000000";
  ctx.strokeStyle = "#000000";

  const x = RASTER_PX * 0.25;
  const baseline = RASTER_PX * 1.3;

  ctx.fillText(text, x, baseline);

  if (options.embolden) {
    ctx.lineWidth = RASTER_PX * 0.04;
    ctx.strokeText(text, x, baseline);
  }

  const imageData = ctx.getImageData(0, 0, width, height);

  return {
    width,
    height,
    rgba: imageData.data,
    baseline,
  };
}

export function checkEmojiComposition(
  cluster: string,
  fontStack: string,
  canvasFactory = defaultCanvasFactory
): PatternWarning | null {
  const codePoints = Array.from(cluster);
  if (codePoints.length <= 1) return null;

  try {
    const canvas = canvasFactory(10, 10);
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.font = `400 32px ${fontStack}`;
    const clusterWidth = ctx.measureText(cluster).width;
    const firstCharWidth = ctx.measureText(codePoints[0]).width;

    if (clusterWidth >= 1.8 * firstCharWidth) {
      return {
        code: "CLUSTER_NOT_COMPOSED",
        message: `Emoji sequence ${cluster} may not have composed completely in this font.`,
        details: { cluster },
      };
    }
  } catch {
    // Ignore measurement failures
  }
  return null;
}
