import type { SKRSContext2D } from "@napi-rs/canvas";
import { FONT_5X7, GLYPH_HEIGHT, GLYPH_TRACKING, type GlyphBitmap, measurePixelText, normalizePixelString } from "./pixelFontMeasure.ts";

export { FONT_5X7, GLYPH_HEIGHT, GLYPH_TRACKING, type GlyphBitmap, measurePixelText, normalizePixelString };

function renderGlyphRun(ctx: SKRSContext2D, norm: string, startX: number, startY: number, s: number, color: string): void {
  ctx.fillStyle = color;
  let cursorX = Math.round(startX);
  const baseY = Math.round(startY);
  for (let i = 0; i < norm.length; i++) {
    const glyph = FONT_5X7[norm[i]!] ?? FONT_5X7[" "]!;
    const gw = glyph[0].length;
    for (let row = 0; row < GLYPH_HEIGHT; row++) {
      const rowBits = glyph[row]!;
      for (let col = 0; col < gw; col++) {
        if (rowBits[col] === "1") ctx.fillRect(cursorX + col * s, baseY + row * s, s, s);
      }
    }
    cursorX += (gw + GLYPH_TRACKING) * s;
  }
}

export function drawPixelText(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  shadowColor: string | null = "#0E0907",
  scale = 1,
): number {
  const s = Math.max(1, Math.round(scale));
  const norm = normalizePixelString(text);
  const metrics = measurePixelText(norm, s);
  if (norm.length === 0) return 0;
  const rx = Math.round(x),
    ry = Math.round(y);
  if (shadowColor) renderGlyphRun(ctx, norm, rx + s, ry + s, s, shadowColor);
  renderGlyphRun(ctx, norm, rx, ry, s, color);
  return metrics.width;
}

export function drawPixelTextRight(
  ctx: SKRSContext2D,
  text: string,
  rightX: number,
  y: number,
  color: string,
  shadowColor: string | null = "#0E0907",
  scale = 1,
): number {
  const metrics = measurePixelText(text, scale);
  return drawPixelText(ctx, text, Math.round(rightX - metrics.width), y, color, shadowColor, scale);
}

export function drawPixelTextCentered(
  ctx: SKRSContext2D,
  text: string,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  color: string,
  shadowColor: string | null = "#0E0907",
  scale = 1,
): number {
  const s = Math.max(1, Math.round(scale));
  const metrics = measurePixelText(text, s);
  const visualH = metrics.height + (shadowColor ? s : 0);
  const tx = Math.round(boxX + (boxW - metrics.width) / 2);
  const ty = Math.round(boxY + (boxH - visualH) / 2);
  return drawPixelText(ctx, text, tx, ty, color, shadowColor, s);
}
