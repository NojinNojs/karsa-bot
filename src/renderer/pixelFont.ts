import type { SKRSContext2D } from "@napi-rs/canvas";

/**
 * Pure 5x7 Pixel-Art Bitmap Font Engine
 *
 * Every glyph in `FONT_5X7` has an exact height of 7 rows and a variable width
 * between 3 and 5 columns (with 1px tracking between glyphs at scale 1).
 *
 * Row strings use `'1'` for filled pixels and `'.'` for transparent pixels.
 */
export type GlyphBitmap = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

export const GLYPH_HEIGHT = 7;
export const GLYPH_TRACKING = 1;

export const FONT_5X7: Record<string, GlyphBitmap> = {
  // Whitespace (3px wide)
  " ": [
    "...",
    "...",
    "...",
    "...",
    "...",
    "...",
    "...",
  ],

  // ==========================================================================
  // UPPERCASE A-Z (5x7, I is 3x7, T is 5x7)
  // ==========================================================================
  A: [
    ".111.",
    "1...1",
    "1...1",
    "11111",
    "1...1",
    "1...1",
    "1...1",
  ],
  B: [
    "1111.",
    "1...1",
    "1...1",
    "1111.",
    "1...1",
    "1...1",
    "1111.",
  ],
  C: [
    ".1111",
    "1....",
    "1....",
    "1....",
    "1....",
    "1....",
    ".1111",
  ],
  D: [
    "1111.",
    "1...1",
    "1...1",
    "1...1",
    "1...1",
    "1...1",
    "1111.",
  ],
  E: [
    "11111",
    "1....",
    "1....",
    "1111.",
    "1....",
    "1....",
    "11111",
  ],
  F: [
    "11111",
    "1....",
    "1....",
    "1111.",
    "1....",
    "1....",
    "1....",
  ],
  G: [
    ".1111",
    "1....",
    "1....",
    "1..11",
    "1...1",
    "1...1",
    ".1111",
  ],
  H: [
    "1...1",
    "1...1",
    "1...1",
    "11111",
    "1...1",
    "1...1",
    "1...1",
  ],
  I: [
    "111",
    ".1.",
    ".1.",
    ".1.",
    ".1.",
    ".1.",
    "111",
  ],
  J: [
    "..111",
    "...1.",
    "...1.",
    "...1.",
    "1..1.",
    "1..1.",
    ".11..",
  ],
  K: [
    "1...1",
    "1..1.",
    "1.1..",
    "11...",
    "1.1..",
    "1..1.",
    "1...1",
  ],
  L: [
    "1....",
    "1....",
    "1....",
    "1....",
    "1....",
    "1....",
    "11111",
  ],
  M: [
    "1...1",
    "11.11",
    "1.1.1",
    "1...1",
    "1...1",
    "1...1",
    "1...1",
  ],
  N: [
    "1...1",
    "11..1",
    "1.1.1",
    "1..11",
    "1...1",
    "1...1",
    "1...1",
  ],
  O: [
    ".111.",
    "1...1",
    "1...1",
    "1...1",
    "1...1",
    "1...1",
    ".111.",
  ],
  P: [
    "1111.",
    "1...1",
    "1...1",
    "1111.",
    "1....",
    "1....",
    "1....",
  ],
  Q: [
    ".111.",
    "1...1",
    "1...1",
    "1...1",
    "1.1.1",
    "1..1.",
    ".11.1",
  ],
  R: [
    "1111.",
    "1...1",
    "1...1",
    "1111.",
    "1.1..",
    "1..1.",
    "1...1",
  ],
  S: [
    ".1111",
    "1....",
    "1....",
    ".111.",
    "....1",
    "....1",
    "1111.",
  ],
  T: [
    "11111",
    "..1..",
    "..1..",
    "..1..",
    "..1..",
    "..1..",
    "..1..",
  ],
  U: [
    "1...1",
    "1...1",
    "1...1",
    "1...1",
    "1...1",
    "1...1",
    ".111.",
  ],
  V: [
    "1...1",
    "1...1",
    "1...1",
    "1...1",
    "1...1",
    ".1.1.",
    "..1..",
  ],
  W: [
    "1...1",
    "1...1",
    "1...1",
    "1...1",
    "1.1.1",
    "11.11",
    "1...1",
  ],
  X: [
    "1...1",
    "1...1",
    ".1.1.",
    "..1..",
    ".1.1.",
    "1...1",
    "1...1",
  ],
  Y: [
    "1...1",
    "1...1",
    ".1.1.",
    "..1..",
    "..1..",
    "..1..",
    "..1..",
  ],
  Z: [
    "11111",
    "....1",
    "...1.",
    "..1..",
    ".1...",
    "1....",
    "11111",
  ],

  // ==========================================================================
  // LOWERCASE a-z (clean x-height with crisp ascenders/descenders within 7px)
  // ==========================================================================
  a: [
    ".....",
    ".....",
    ".111.",
    "....1",
    ".1111",
    "1...1",
    ".1111",
  ],
  b: [
    "1....",
    "1....",
    "111..",
    "1..1.",
    "1..1.",
    "1..1.",
    "111..",
  ],
  c: [
    ".....",
    ".....",
    ".111.",
    "1....",
    "1....",
    "1....",
    ".111.",
  ],
  d: [
    "...1.",
    "...1.",
    ".111.",
    "1..1.",
    "1..1.",
    "1..1.",
    ".111.",
  ],
  e: [
    ".....",
    ".....",
    ".111.",
    "1...1",
    "11111",
    "1....",
    ".1111",
  ],
  f: [
    "..11.",
    ".1...",
    "1111.",
    ".1...",
    ".1...",
    ".1...",
    ".1...",
  ],
  g: [
    ".....",
    ".1111",
    "1...1",
    "1...1",
    ".1111",
    "....1",
    ".111.",
  ],
  h: [
    "1....",
    "1....",
    "111..",
    "1..1.",
    "1..1.",
    "1..1.",
    "1..1.",
  ],
  i: [
    ".1.",
    "...",
    "11.",
    ".1.",
    ".1.",
    ".1.",
    "111",
  ],
  j: [
    "..1",
    "...",
    ".11",
    "..1",
    "..1",
    "1.1",
    ".1.",
  ],
  k: [
    "1...",
    "1...",
    "1..1",
    "1.1.",
    "11..",
    "1.1.",
    "1..1",
  ],
  l: [
    "11.",
    ".1.",
    ".1.",
    ".1.",
    ".1.",
    ".1.",
    "111",
  ],
  m: [
    ".....",
    ".....",
    "11.1.",
    "1.1.1",
    "1.1.1",
    "1...1",
    "1...1",
  ],
  n: [
    ".....",
    ".....",
    "111..",
    "1..1.",
    "1..1.",
    "1..1.",
    "1..1.",
  ],
  o: [
    ".....",
    ".....",
    ".111.",
    "1...1",
    "1...1",
    "1...1",
    ".111.",
  ],
  p: [
    ".....",
    "111..",
    "1..1.",
    "1..1.",
    "111..",
    "1....",
    "1....",
  ],
  q: [
    ".....",
    ".111.",
    "1..1.",
    "1..1.",
    ".111.",
    "...1.",
    "...1.",
  ],
  r: [
    "....",
    "....",
    "1.11",
    "11..",
    "1...",
    "1...",
    "1...",
  ],
  s: [
    ".....",
    ".....",
    ".1111",
    "1....",
    ".111.",
    "....1",
    "1111.",
  ],
  t: [
    ".1..",
    ".1..",
    "1111",
    ".1..",
    ".1..",
    ".1..",
    "..11",
  ],
  u: [
    ".....",
    ".....",
    "1..1.",
    "1..1.",
    "1..1.",
    "1..1.",
    ".111.",
  ],
  v: [
    ".....",
    ".....",
    "1...1",
    "1...1",
    "1...1",
    ".1.1.",
    "..1..",
  ],
  w: [
    ".....",
    ".....",
    "1...1",
    "1...1",
    "1.1.1",
    "11.11",
    "1...1",
  ],
  x: [
    ".....",
    ".....",
    "1..1.",
    ".11..",
    ".11..",
    "1..1.",
    "1..1.",
  ],
  y: [
    ".....",
    "1..1.",
    "1..1.",
    "1..1.",
    ".111.",
    "...1.",
    ".11..",
  ],
  z: [
    "....",
    "....",
    "1111",
    "..1.",
    ".1..",
    "1...",
    "1111",
  ],

  // ==========================================================================
  // NUMBERS 0-9
  // ==========================================================================
  "0": [
    ".111.",
    "1..11",
    "1.1.1",
    "1.1.1",
    "1.1.1",
    "11..1",
    ".111.",
  ],
  "1": [
    ".11.",
    "1.1.",
    "..1.",
    "..1.",
    "..1.",
    "..1.",
    "1111",
  ],
  "2": [
    ".111.",
    "1...1",
    "....1",
    "..11.",
    ".1...",
    "1....",
    "11111",
  ],
  "3": [
    "1111.",
    "....1",
    "....1",
    ".111.",
    "....1",
    "....1",
    "1111.",
  ],
  "4": [
    "1..1.",
    "1..1.",
    "1..1.",
    "11111",
    "...1.",
    "...1.",
    "...1.",
  ],
  "5": [
    "11111",
    "1....",
    "1111.",
    "....1",
    "....1",
    "1...1",
    ".111.",
  ],
  "6": [
    ".111.",
    "1....",
    "1....",
    "1111.",
    "1...1",
    "1...1",
    ".111.",
  ],
  "7": [
    "11111",
    "....1",
    "...1.",
    "..1..",
    ".1...",
    ".1...",
    ".1...",
  ],
  "8": [
    ".111.",
    "1...1",
    "1...1",
    ".111.",
    "1...1",
    "1...1",
    ".111.",
  ],
  "9": [
    ".111.",
    "1...1",
    "1...1",
    ".1111",
    "....1",
    "....1",
    ".111.",
  ],

  // ==========================================================================
  // PUNCTUATION & SYMBOLS (.,:/-+%•()!&' and Rp ligature)
  // ==========================================================================
  ".": [
    "...",
    "...",
    "...",
    "...",
    "...",
    ".1.",
    ".1.",
  ],
  ",": [
    "...",
    "...",
    "...",
    "...",
    ".1.",
    ".1.",
    "1..",
  ],
  ":": [
    "...",
    ".1.",
    ".1.",
    "...",
    ".1.",
    ".1.",
    "...",
  ],
  "/": [
    "....1",
    "...1.",
    "...1.",
    "..1..",
    ".1...",
    ".1...",
    "1....",
  ],
  "-": [
    "....",
    "....",
    "....",
    "1111",
    "....",
    "....",
    "....",
  ],
  "+": [
    ".....",
    "..1..",
    "..1..",
    "11111",
    "..1..",
    "..1..",
    ".....",
  ],
  "%": [
    "11..1",
    "11.1.",
    "...1.",
    "..1..",
    ".1...",
    ".1.11",
    "1..11",
  ],
  "•": [
    "...",
    "...",
    ".1.",
    "111",
    ".1.",
    "...",
    "...",
  ],
  "[": [
    "111",
    "1..",
    "1..",
    "1..",
    "1..",
    "1..",
    "111",
  ],
  "]": [
    "111",
    "..1",
    "..1",
    "..1",
    "..1",
    "..1",
    "111",
  ],
  "(": [
    "..1",
    ".1.",
    "1..",
    "1..",
    "1..",
    ".1.",
    "..1",
  ],
  ")": [
    "1..",
    ".1.",
    "..1",
    "..1",
    "..1",
    ".1.",
    "1..",
  ],
  "!": [
    ".1.",
    ".1.",
    ".1.",
    ".1.",
    ".1.",
    "...",
    ".1.",
  ],
  "&": [
    ".11..",
    "1..1.",
    ".11..",
    ".1.1.",
    "1...1",
    "1..1.",
    ".11.1",
  ],
  "'": [
    ".1.",
    ".1.",
    "1..",
    "...",
    "...",
    "...",
    "...",
  ],
  "?": [
    ".111.",
    "1...1",
    "....1",
    "..11.",
    "..1..",
    ".....",
    "..1..",
  ],
  "_": [
    "....",
    "....",
    "....",
    "....",
    "....",
    "....",
    "1111",
  ],
  // Dedicated compact 5x7 'Rp' currency ligature token (also works via individual 'R' + 'p')
  Rp: [
    "11.11",
    "1.1.1",
    "11.11",
    "1.11.",
    "1.1..",
    "..1..",
    "..1..",
  ],
};

/**
 * Resolves a character to its 5x7 glyph bitmap.
 * Falls back to uppercase if a character isn't directly found, or '?' / space.
 */
function resolveGlyph(ch: string): GlyphBitmap {
  if (FONT_5X7[ch]) return FONT_5X7[ch]!;
  const upper = ch.toUpperCase();
  if (FONT_5X7[upper]) return FONT_5X7[upper]!;
  return FONT_5X7["?"]!;
}

/**
 * Measures the exact pixel bounding box of a string rendered with `FONT_5X7`.
 *
 * @param text String to measure
 * @param scale Integer pixel multiplier (1 = 7px tall, 2 = 14px tall)
 * @returns `{ width, height }` in exact canvas pixels
 */
export function measurePixelText(
  text: string,
  scale = 1
): { width: number; height: number } {
  const s = Math.max(1, Math.round(scale));
  if (!text || text.length === 0) {
    return { width: 0, height: GLYPH_HEIGHT * s };
  }

  let totalCols = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    const glyph = resolveGlyph(ch);
    const glyphW = glyph[0].length;
    totalCols += glyphW;
    if (i < text.length - 1) {
      totalCols += GLYPH_TRACKING;
    }
  }

  return {
    width: totalCols * s,
    height: GLYPH_HEIGHT * s,
  };
}

/**
 * Internal helper that stamps a single pass of the text bitmap at integer coordinates.
 */
function stampGlyphs(
  ctx: SKRSContext2D,
  text: string,
  startX: number,
  startY: number,
  color: string,
  scale: number
): void {
  ctx.fillStyle = color;
  let cursorX = startX | 0;
  const baseY = startY | 0;

  for (let idx = 0; idx < text.length; idx++) {
    const ch = text[idx]!;
    const glyph = resolveGlyph(ch);
    const glyphW = glyph[0].length;

    for (let row = 0; row < GLYPH_HEIGHT; row++) {
      const line = glyph[row]!;
      const py = baseY + row * scale;
      for (let col = 0; col < glyphW; col++) {
        if (line[col] === "1") {
          ctx.fillRect(cursorX + col * scale, py, scale, scale);
        }
      }
    }

    cursorX += (glyphW + GLYPH_TRACKING) * scale;
  }
}

/**
 * Draws crisp, pixel-perfect text onto the canvas grid at `(x, y)`.
 *
 * @param ctx 2D canvas context
 * @param text Text to render
 * @param x Left X coordinate (snapped to integer grid)
 * @param y Top Y coordinate (snapped to integer grid)
 * @param color Primary foreground hex color
 * @param shadowColor Optional 1px drop-shadow hex color (`null` disables shadow)
 * @param scale Integer pixel scale (`1` = 7px tall, `2` = 14px tall)
 */
export function drawPixelText(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  shadowColor: string | null = "#0d0820",
  scale = 1
): { width: number; height: number } {
  const s = Math.max(1, Math.round(scale));
  const ix = Math.round(x);
  const iy = Math.round(y);

  if (!text || text.length === 0) {
    return { width: 0, height: GLYPH_HEIGHT * s };
  }

  if (shadowColor) {
    stampGlyphs(ctx, text, ix + 1, iy + 1, shadowColor, s);
  }
  stampGlyphs(ctx, text, ix, iy, color, s);

  return measurePixelText(text, s);
}

/**
 * Draws right-aligned pixel-perfect text ending at `rightX`.
 */
export function drawPixelTextRight(
  ctx: SKRSContext2D,
  text: string,
  rightX: number,
  y: number,
  color: string,
  shadowColor: string | null = "#0d0820",
  scale = 1
): { width: number; height: number } {
  const s = Math.max(1, Math.round(scale));
  const metrics = measurePixelText(text, s);
  const startX = Math.round(rightX) - metrics.width;
  return drawPixelText(ctx, text, startX, y, color, shadowColor, s);
}

/**
 * Centers text horizontally and vertically inside `(boxX, boxY, boxW, boxH)`
 * with exact mathematical symmetry:
 *   `tx = boxX + Math.floor((boxW - textW) / 2)`
 *   `ty = boxY + Math.floor((boxH - textH) / 2)`
 */
export function drawPixelTextCentered(
  ctx: SKRSContext2D,
  text: string,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  color: string,
  shadowColor: string | null = "#0d0820",
  scale = 1
): { x: number; y: number; width: number; height: number } {
  const s = Math.max(1, Math.round(scale));
  const metrics = measurePixelText(text, s);
  const visualH = metrics.height + (shadowColor ? s : 0);
  const tx = Math.round(boxX) + Math.floor((Math.round(boxW) - metrics.width) / 2);
  const ty = Math.round(boxY) + Math.floor((Math.round(boxH) - visualH) / 2);

  drawPixelText(ctx, text, tx, ty, color, shadowColor, s);
  return { x: tx, y: ty, width: metrics.width, height: metrics.height };
}
