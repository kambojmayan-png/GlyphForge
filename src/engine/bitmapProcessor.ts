import { RasterBitmap, RASTER_PX } from "./renderTextToBitmap";

export interface Coverage {
  width: number;
  height: number;
  data: Float32Array;
}

export interface Rect {
  left: number;
  right: number; // exclusive
  top: number;
  bottom: number; // exclusive
}

export interface CoverageGrid {
  rows: number;
  cols: number;
  data: Float32Array;
}

export function bitmapToGrayscale(
  bitmap: RasterBitmap,
  mode: "alpha" | "luminance" = "alpha"
): Coverage {
  const { width, height, rgba } = bitmap;
  const data = new Float32Array(width * height);

  for (let i = 0; i < data.length; i++) {
    const r = rgba[4 * i];
    const g = rgba[4 * i + 1];
    const b = rgba[4 * i + 2];
    const a = rgba[4 * i + 3] / 255;

    if (mode === "alpha") {
      data[i] = a;
    } else {
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      data[i] = 1 - (lum * a + (1 - a));
    }
  }

  return { width, height, data };
}

export function inkBox(coverage: Coverage, alphaMin = 16 / 255): Rect | null {
  const { width, height, data } = coverage;
  let l = width;
  let t = height;
  let r = -1;
  let bm = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[y * width + x] > alphaMin) {
        if (x < l) l = x;
        if (x > r) r = x;
        if (y < t) t = y;
        if (y > bm) bm = y;
      }
    }
  }

  if (r < 0) return null;
  return { left: l, right: r + 1, top: t, bottom: bm + 1 };
}

function at(coverage: Coverage, x: number, y: number): number {
  if (x < 0 || x >= coverage.width || y < 0 || y >= coverage.height) {
    return 0;
  }
  return coverage.data[y * coverage.width + x];
}

function areaAverage(
  coverage: Coverage,
  x0: number,
  x1: number,
  y0: number,
  y1: number
): number {
  let sum = 0;
  const startY = Math.floor(y0);
  const endY = Math.ceil(y1);
  const startX = Math.floor(x0);
  const endX = Math.ceil(x1);

  for (let y = startY; y < endY; y++) {
    const wy = Math.min(y + 1, y1) - Math.max(y, y0);
    if (wy <= 0) continue;
    for (let x = startX; x < endX; x++) {
      const wx = Math.min(x + 1, x1) - Math.max(x, x0);
      if (wx <= 0) continue;
      sum += at(coverage, x, y) * wx * wy;
    }
  }

  const area = (x1 - x0) * (y1 - y0);
  return area > 0 ? sum / area : 0;
}

export function resizeBitmapToHeight(
  coverage: Coverage,
  ink: Rect,
  baseline: number,
  rows = 7,
  xScale = 1.0
): CoverageGrid {
  const inkHeight = ink.bottom - ink.top;
  const capFit = inkHeight < 0.25 * RASTER_PX; // Short ink like -, ., _

  const srcTop = capFit ? baseline - 0.72 * RASTER_PX : ink.top;
  const srcBottom = capFit ? baseline : ink.bottom;
  const srcH = Math.max(1, srcBottom - srcTop);
  const srcW = Math.max(1, ink.right - ink.left);

  const outW = Math.max(1, Math.round(srcW * (rows / srcH) * xScale));
  const out = new Float32Array(rows * outW);

  for (let r = 0; r < rows; r++) {
    const y0 = srcTop + (r * srcH) / rows;
    const y1 = srcTop + ((r + 1) * srcH) / rows;

    for (let c = 0; c < outW; c++) {
      const x0 = ink.left + (c * srcW) / outW;
      const x1 = ink.left + ((c + 1) * srcW) / outW;

      out[r * outW + c] = areaAverage(coverage, x0, x1, y0, y1);
    }
  }

  return { rows, cols: outW, data: out };
}

function quantize(val: number, thresholds: number[]): number {
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (val >= thresholds[i]) return i + 1;
  }
  return 0;
}

export function bitmapToBinaryMatrix(
  cov: CoverageGrid,
  options: {
    density: number;
    intensity: number;
    shading: boolean;
  }
): { rows: 7; cols: number; levels: Uint8Array } {
  const levels = new Uint8Array(cov.rows * cov.cols);
  const { density, intensity, shading } = options;

  if (shading) {
    const thresholds = [0.2, 0.4, 0.6, 0.8];
    for (let i = 0; i < levels.length; i++) {
      levels[i] = quantize(cov.data[i], thresholds);
    }
    return { rows: 7, cols: cov.cols, levels };
  }

  // Binary mode with never-empty rule
  const initialTheta = Math.max(0.2, Math.min(0.8, 0.5 - 0.1 * density));
  const attempts = [initialTheta, 0.25, 0.1];

  for (const theta of attempts) {
    let hasActive = false;
    for (let i = 0; i < levels.length; i++) {
      if (cov.data[i] >= theta) {
        levels[i] = intensity;
        hasActive = true;
      } else {
        levels[i] = 0;
      }
    }
    if (hasActive) break;
  }

  return { rows: 7, cols: cov.cols, levels };
}

export function computeFidelity(
  matrix: { rows: 7; cols: number; levels: Uint8Array },
  coverage: Coverage,
  ink: Rect
): number {
  let inter = 0;
  let union = 0;

  const srcH = Math.max(1, ink.bottom - ink.top);
  const srcW = Math.max(1, ink.right - ink.left);

  for (let y = ink.top; y < ink.bottom; y++) {
    const normY = (y - ink.top) / srcH;
    const r = Math.min(6, Math.floor(normY * 7));

    for (let x = ink.left; x < ink.right; x++) {
      const normX = (x - ink.left) / srcW;
      const c = Math.min(matrix.cols - 1, Math.floor(normX * matrix.cols));

      const m = matrix.levels[r * matrix.cols + c] > 0;
      const k = coverage.data[y * coverage.width + x] >= 0.5;

      if (m && k) inter++;
      if (m || k) union++;
    }
  }

  return union === 0 ? 0 : inter / union;
}
