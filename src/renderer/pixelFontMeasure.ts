import { FONT_5X7 as FONT_5X7_PART1, GLYPH_HEIGHT, GLYPH_TRACKING, type GlyphBitmap } from "./pixelFontGlyphs1.ts";
import { FONT_5X7_PART2 } from "./pixelFontGlyphs2.ts";

export { GLYPH_HEIGHT, GLYPH_TRACKING, type GlyphBitmap };
export const FONT_5X7: Record<string, GlyphBitmap> = { ...FONT_5X7_PART1, ...FONT_5X7_PART2 };

const DIACRITIC_MAP: Record<string, string> = {
  Á: "A",
  À: "A",
  Â: "A",
  Ä: "A",
  Ã: "A",
  É: "E",
  È: "E",
  Ê: "E",
  Ë: "E",
  Í: "I",
  Ì: "I",
  Î: "I",
  Ï: "I",
  Ó: "O",
  Ò: "O",
  Ô: "O",
  Ö: "O",
  Õ: "O",
  Ú: "U",
  Ù: "U",
  Û: "U",
  Ü: "U",
  Ñ: "N",
  Ç: "C",
  "—": "-",
  "–": "-",
  "…": ".",
  "“": '"',
  "”": '"',
  "‘": "'",
  "’": "'",
};

export function normalizePixelString(raw: string): string {
  const upper = raw.toUpperCase();
  let out = "";
  for (let i = 0; i < upper.length; i++) {
    const ch = upper[i]!;
    const mapped = DIACRITIC_MAP[ch] ?? ch;
    out += FONT_5X7[mapped] ? mapped : " ";
  }
  return out;
}

export function measurePixelText(text: string, scale = 1): { width: number; height: number } {
  const s = Math.max(1, Math.round(scale));
  const norm = normalizePixelString(text);
  if (norm.length === 0) return { width: 0, height: GLYPH_HEIGHT * s };
  let totalCols = 0;
  for (let i = 0; i < norm.length; i++) {
    const glyph = FONT_5X7[norm[i]!] ?? FONT_5X7[" "]!;
    totalCols += glyph[0].length;
    if (i < norm.length - 1) totalCols += GLYPH_TRACKING;
  }
  return { width: totalCols * s, height: GLYPH_HEIGHT * s };
}
