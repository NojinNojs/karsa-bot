import { type Canvas, createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import {
  AZAB_KOPI_THEME,
  CYBER_KOPI_THEME,
  GAMEBOY_KOPI_THEME,
  type KarsaTheme,
  KERATON_KOPI_THEME,
  SKIN_THEMES_V3,
  WARM_KOPI_THEME,
} from "./themesV3.ts";

export { AZAB_KOPI_THEME, CYBER_KOPI_THEME, GAMEBOY_KOPI_THEME, type KarsaTheme, KERATON_KOPI_THEME, SKIN_THEMES_V3, WARM_KOPI_THEME };

export const CANVAS_W = 384;
export const CANVAS_H = 216;
export const UPSCALE = 3;
export const OUTER_MARGIN = 12;

export function createSurface(w = CANVAS_W, h = CANVAS_H) {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

export function exportUpscaledPng(lowCanvas: Canvas, scale = UPSCALE): Buffer {
  const out = createCanvas(lowCanvas.width * scale, lowCanvas.height * scale);
  const octx = out.getContext("2d");
  octx.imageSmoothingEnabled = false;
  octx.drawImage(lowCanvas, 0, 0, out.width, out.height);
  return out.toBuffer("image/png");
}

export function R(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, color: string): void {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function ditherBand(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cA: string,
  cB: string,
  mode: "50" | "25" | "12" = "25",
): void {
  R(ctx, x, y, w, h, cA);
  ctx.fillStyle = cB;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const hit =
        mode === "50" ? ((px + py) & 1) === 0 : mode === "25" ? (px & 1) === 0 && (py & 1) === 0 : (px & 3) === 0 && (py & 3) === 0;
      if (hit) ctx.fillRect(x + px, y + py, 1, 1);
    }
  }
}
