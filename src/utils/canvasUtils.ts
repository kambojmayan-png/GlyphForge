export type Canvas2DContext =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;

export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

export type CanvasFactory = (width: number, height: number) => AnyCanvas;

export interface FontsManager {
  ready: () => Promise<void>;
  load: (fontDesc: string, text: string) => Promise<void>;
}

export function defaultCanvasFactory(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(Math.max(1, width), Math.max(1, height));
  }
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, width);
    canvas.height = Math.max(1, height);
    return canvas;
  }
  throw new Error("No canvas environment available");
}

export const defaultFontsManager: FontsManager = {
  async ready() {
    if (typeof document !== "undefined" && document.fonts) {
      await document.fonts.ready;
    }
  },
  async load(fontDesc: string, text: string) {
    if (typeof document !== "undefined" && document.fonts) {
      try {
        await document.fonts.load(fontDesc, text);
      } catch {
        // Fallback gracefully if font load fails
      }
    }
  },
};
