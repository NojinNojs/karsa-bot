import { createCanvas, GlobalFonts, type Canvas, type SKRSContext2D } from "@napi-rs/canvas";
import { resolve } from "node:path";

const fontDir = resolve(process.cwd(), "assets/fonts");
GlobalFonts.registerFromPath(resolve(fontDir, "PressStart2P.ttf"), "PS2P");
GlobalFonts.registerFromPath(resolve(fontDir, "Silkscreen.ttf"), "SILK");

/**
 * KARSA — Strict Mathematical Pixel Design System
 *
 * Design Principles:
 * 1. Show, Don't Tell: Never render meta-labels like "16-BIT WARUNG SIM",
 *    "16-BIT TYCOON", or "PIXEL ENGINE" inside UI banners or headers.
 * 2. Strict Grid Rhythm:
 *    - OUTER_MARGIN = 12 (distance from canvas edge to outer panels)
 *    - PANEL_GAP    = 8  (uniform horizontal & vertical gap between panels)
 *    - INNER_PAD    = 8  (uniform top/bottom/left/right padding inside panels)
 * 3. Typography Discipline:
 *    - PressStart2P (8px, cap height 7px, 1px drop shadow) for primary titles/numbers
 *    - Silkscreen (8px, cap height 5px) for compact labels, subtitles, and badges
 *    - Never mix ad-hoc hand-drawn bitmap letters with font text.
 * 4. Symmetric Padding:
 *    Every container primitive returns an inner content bounding box `{ x, y, w, h }`
 *    with mathematically identical top/bottom and left/right padding.
 */

export const CANVAS_W = 384;
export const CANVAS_H = 216;
export const UPSCALE = 3;

export const OUTER_MARGIN = 12;
export const PANEL_GAP = 8;
export const INNER_PAD = 8;
export const SLOT_PAD = 6;
export const BADGE_PAD_X = 5;
export const BADGE_PAD_Y = 3;

export const FONT_TITLE = "8px PS2P";
export const FONT_LABEL = "8px SILK";
export const TITLE_CAP_H = 7;
export const LABEL_CAP_H = 5;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface KarsaTheme {
  id: string;
  name: string;
  ink: string;          // Deepest outline / shadow (#0B080E)
  bg: string;           // Deep espresso-slate (#141019)
  bgAlt: string;        // Subtle dither pair (#181320)
  surface: string;      // Card surface (#1E1826)
  surfaceAlt: string;   // Elevated row surface (#251E30)
  inset: string;        // Recessed slot surface (#16121C)
  insetLo: string;      // Deep recessed shadow (#100D15)
  highlight: string;    // Warm top/left bevel highlight (#3A2E47)
  shadow: string;       // Bottom/right bevel shadow (#120E17)
  amber: string;        // Primary Amber Gold (#F4B446)
  amberHi: string;      // Bright gold highlight (#FFE08A)
  amberLo: string;      // Dark bronze shadow (#A86E1E)
  crema: string;        // Primary warm white text (#FFF3D6)
  muted: string;        // Muted warm grey label (#9E92A8)
  green: string;        // Leaf green positive (#45C486)
  greenHi: string;      // Bright mint highlight (#89E8B6)
  greenLo: string;      // Deep forest shadow (#1E6B47)
  red: string;          // Terracotta red danger (#E85D5D)
  redHi: string;        // Soft coral highlight (#FF9494)
  redLo: string;        // Deep rust shadow (#872626)
  cyan: string;         // Crisp sky accent (#68C8E8)
}

/**
 * Default "Warm Espresso & Amber Gold" (Indonesian Night Kopi) palette.
 */
export const WARM_KOPI_THEME: KarsaTheme = {
  id: "warm_kopi",
  name: "Warm Espresso & Amber Gold",
  ink: "#0B080E",
  bg: "#141019",
  bgAlt: "#181320",
  surface: "#1E1826",
  surfaceAlt: "#251E30",
  inset: "#16121C",
  insetLo: "#100D15",
  highlight: "#3A2E47",
  shadow: "#120E17",
  amber: "#F4B446",
  amberHi: "#FFE08A",
  amberLo: "#A86E1E",
  crema: "#FFF3D6",
  muted: "#9E92A8",
  green: "#45C486",
  greenHi: "#89E8B6",
  greenLo: "#1E6B47",
  red: "#E85D5D",
  redHi: "#FF9494",
  redLo: "#872626",
  cyan: "#68C8E8",
};

/**
 * Crimson emergency palette for Azab / Debt Collector events, tuned to the
 * same warm tonal family and contrast ratios as WARM_KOPI_THEME.
 */
export const AZAB_KOPI_THEME: KarsaTheme = {
  ...WARM_KOPI_THEME,
  id: "azab_crimson",
  name: "Segel Darurat",
  bg: "#1C0E14",
  bgAlt: "#241119",
  surface: "#2B141E",
  surfaceAlt: "#361926",
  inset: "#180B10",
  insetLo: "#11070B",
  highlight: "#5E273B",
  shadow: "#14080D",
  amber: "#F4B446",
  amberHi: "#FFE08A",
  amberLo: "#9E3535",
};

export function createSurface(w = CANVAS_W, h = CANVAS_H) {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

export function exportUpscaledPng(lowCanvas: Canvas, scale = UPSCALE): Buffer {
  const w = lowCanvas.width * scale;
  const h = lowCanvas.height * scale;
  const out = createCanvas(w, h);
  const octx = out.getContext("2d");
  octx.imageSmoothingEnabled = false;
  octx.drawImage(lowCanvas, 0, 0, w, h);
  return out.toBuffer("image/png");
}

/**
 * Crisp integer-snapped pixel rectangle primitive.
 */
export function R(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
): void {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  if (rw <= 0 || rh <= 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(rx, ry, rw, rh);
}

/**
 * Ordered Bayer/checkerboard dither band.
 * density: "50" (checkerboard), "25" (sparse), or "12" (subtle texture).
 */
export function ditherBand(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  c1: string,
  c2: string,
  density: "50" | "25" | "12" = "25"
): void {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  if (rw <= 0 || rh <= 0) return;

  R(ctx, rx, ry, rw, rh, c1);
  ctx.fillStyle = c2;

  for (let j = 0; j < rh; j++) {
    for (let i = 0; i < rw; i++) {
      let hit = false;
      if (density === "50") {
        hit = ((i + j) & 1) === 1;
      } else if (density === "25") {
        hit = (i & 1) === 0 && (j & 1) === 0;
      } else {
        hit = (i & 3) === 0 && (j & 3) === 0;
      }
      if (hit) {
        ctx.fillRect(rx + i, ry + j, 1, 1);
      }
    }
  }
}

export interface BevelPanelOptions {
  fill?: string;
  hi?: string;
  lo?: string;
  ink?: string;
  pad?: number;
  accentTop?: string;
  headerDither?: boolean;
}

/**
 * Draws a 2px cut-corner beveled panel:
 * - Outer 1px ink border with 1px cut corners
 * - Inner 1px highlight (top/left) & 1px shadow (bottom/right)
 * - Returns mathematically symmetric inner content box `{ x, y, w, h }`
 *   inset by `pad` (defaults to `INNER_PAD = 8`) on all 4 sides.
 */
export function drawBevelPanel(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  theme: KarsaTheme = WARM_KOPI_THEME,
  opts: BevelPanelOptions = {}
): Box {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);

  const ink = opts.ink ?? theme.ink;
  const fill = opts.fill ?? theme.surface;
  const hi = opts.hi ?? theme.highlight;
  const lo = opts.lo ?? theme.shadow;
  const pad = opts.pad ?? INNER_PAD;

  // 2px cut-corner silhouette in ink
  R(ctx, rx + 2, ry, rw - 4, rh, ink);
  R(ctx, rx + 1, ry + 1, rw - 2, rh - 2, ink);
  R(ctx, rx, ry + 2, rw, rh - 4, ink);

  // Inner surface fill (1px inset from ink silhouette)
  R(ctx, rx + 2, ry + 1, rw - 4, rh - 2, fill);
  R(ctx, rx + 1, ry + 2, rw - 2, rh - 4, fill);

  if (opts.headerDither && rh >= 12) {
    ditherBand(ctx, rx + 2, ry + 2, rw - 4, 6, fill, hi, "25");
  }

  // Top & left bevel highlight (1px)
  R(ctx, rx + 2, ry + 1, rw - 4, 1, opts.accentTop ?? hi);
  R(ctx, rx + 1, ry + 2, 1, rh - 4, hi);
  R(ctx, rx + 2, ry + 2, 1, 1, opts.accentTop ?? hi);

  // Bottom & right bevel shadow (1px)
  R(ctx, rx + 2, ry + rh - 2, rw - 4, 1, lo);
  R(ctx, rx + rw - 2, ry + 2, 1, rh - 4, lo);
  R(ctx, rx + rw - 3, ry + rh - 3, 1, 1, lo);

  return {
    x: rx + pad,
    y: ry + pad,
    w: Math.max(0, rw - pad * 2),
    h: Math.max(0, rh - pad * 2),
  };
}

/**
 * Alias for `drawBevelPanel` matching the spec's `drawFrame` name.
 */
export const drawFrame = drawBevelPanel;

export interface InsetSlotOptions {
  fill?: string;
  hi?: string;
  lo?: string;
  ink?: string;
  pad?: number;
  dither?: boolean;
}

/**
 * Draws a recessed 2px cut-corner slot/well (inverted bevel: dark top/left,
 * highlight bottom/right) with symmetric padding on all 4 sides.
 */
export function drawInsetSlot(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  theme: KarsaTheme = WARM_KOPI_THEME,
  opts: InsetSlotOptions = {}
): Box {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);

  const ink = opts.ink ?? theme.ink;
  const fill = opts.fill ?? theme.inset;
  const lo = opts.lo ?? theme.insetLo;
  const hi = opts.hi ?? theme.highlight;
  const pad = opts.pad ?? SLOT_PAD;

  // 1px cut-corner recessed border
  R(ctx, rx + 1, ry, rw - 2, rh, ink);
  R(ctx, rx, ry + 1, rw, rh - 2, ink);

  // Inner well fill
  R(ctx, rx + 1, ry + 1, rw - 2, rh - 2, fill);
  if (opts.dither) {
    ditherBand(ctx, rx + 2, ry + 2, rw - 4, rh - 4, fill, lo, "25");
  }

  // Top/left inner shadow (recessed look)
  R(ctx, rx + 1, ry + 1, rw - 2, 1, lo);
  R(ctx, rx + 1, ry + 2, 1, rh - 3, lo);

  // Bottom/right rim highlight
  R(ctx, rx + 2, ry + rh - 2, rw - 3, 1, hi);
  R(ctx, rx + rw - 2, ry + 2, 1, rh - 3, hi);

  return {
    x: rx + pad,
    y: ry + pad,
    w: Math.max(0, rw - pad * 2),
    h: Math.max(0, rh - pad * 2),
  };
}

/**
 * Alias for `drawInsetSlot` matching the spec's `drawInsetBox` name.
 */
export const drawInsetBox = drawInsetSlot;

export interface PillBadgeOptions {
  fill?: string;
  hi?: string;
  lo?: string;
  textColor?: string;
  shadowColor?: string | null;
  ink?: string;
  padX?: number;
  padY?: number;
  align?: "left" | "right" | "center";
  fixedW?: number;
}

/**
 * Draws a pixel-perfect pill badge with symmetric horizontal (`padX`) and
 * vertical (`padY`) padding around a 5px-tall `FONT_LABEL` string.
 *
 * Total badge height = `padY * 2 + LABEL_CAP_H + 2` (border).
 * Default `padY = 3`, `LABEL_CAP_H = 5`, 1px top/bottom border => 13px tall,
 * with text placed at `ry + 1 + padY` so top and bottom inner gaps are equal.
 */
export function drawPillBadge(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  theme: KarsaTheme = WARM_KOPI_THEME,
  opts: PillBadgeOptions = {}
): Box {
  const padX = opts.padX ?? BADGE_PAD_X;
  const padY = opts.padY ?? BADGE_PAD_Y;
  const ink = opts.ink ?? theme.ink;
  const fill = opts.fill ?? theme.surfaceAlt;
  const hi = opts.hi ?? theme.highlight;
  const lo = opts.lo ?? theme.shadow;
  const textColor = opts.textColor ?? theme.crema;
  const shadowColor = opts.shadowColor !== undefined ? opts.shadowColor : theme.ink;

  ctx.font = FONT_LABEL;
  const textW = Math.round(ctx.measureText(text).width);
  const bw = opts.fixedW ? Math.round(opts.fixedW) : textW + (padX + 1) * 2;
  const bh = LABEL_CAP_H + (padY + 1) * 2; // 1px border + padY on top & bottom

  let rx = Math.round(x);
  if (opts.align === "right") rx = Math.round(x - bw);
  else if (opts.align === "center") rx = Math.round(x - bw / 2);
  const ry = Math.round(y);

  // Cut-corner pill silhouette
  R(ctx, rx + 1, ry, bw - 2, bh, ink);
  R(ctx, rx, ry + 1, bw, bh - 2, ink);

  // Inner fill + 1px top highlight & 1px bottom shadow
  R(ctx, rx + 1, ry + 1, bw - 2, bh - 2, fill);
  R(ctx, rx + 2, ry + 1, bw - 4, 1, hi);
  R(ctx, rx + 2, ry + bh - 2, bw - 4, 1, lo);

  const tx = rx + Math.round((bw - textW) / 2);
  // Silkscreen 8px renders its 5px cap starting 1px below `top` baseline
  const ty = ry + 1 + padY - 1;
  drawPixelText(ctx, text, tx, ty, {
    font: FONT_LABEL,
    color: textColor,
    shadow: shadowColor,
  });

  return { x: rx, y: ry, w: bw, h: bh };
}

/**
 * Alias for `drawPillBadge` matching the spec's `drawBadge` name.
 */
export const drawBadge = drawPillBadge;

export interface PixelTextOptions {
  font?: string;
  color?: string;
  shadow?: string | null;
  align?: "left" | "right" | "center";
}

/**
 * Draws integer-aligned pixel font text with optional 1px drop shadow.
 */
export function drawPixelText(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  opts: PixelTextOptions = {}
): number {
  const font = opts.font ?? FONT_LABEL;
  const color = opts.color ?? WARM_KOPI_THEME.crema;
  const shadow = opts.shadow !== undefined ? opts.shadow : WARM_KOPI_THEME.ink;
  const align = opts.align ?? "left";

  ctx.font = font;
  ctx.textBaseline = "top";
  const w = Math.round(ctx.measureText(text).width);

  let rx = Math.round(x);
  if (align === "right") rx = Math.round(x - w);
  else if (align === "center") rx = Math.round(x - w / 2);
  const ry = Math.round(y);

  if (shadow) {
    ctx.fillStyle = shadow;
    ctx.fillText(text, rx + 1, ry + 1);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, rx, ry);
  return w;
}

/**
 * Draws the outer canvas background + warm espresso frame so that the inner
 * playable area starts at `OUTER_MARGIN = 12` on all four sides.
 */
export function drawCanvasBackdrop(
  ctx: SKRSContext2D,
  theme: KarsaTheme = WARM_KOPI_THEME,
  w = CANVAS_W,
  h = CANVAS_H
): Box {
  R(ctx, 0, 0, w, h, theme.bg);
  ditherBand(ctx, 0, 0, w, h, theme.bg, theme.bgAlt, "12");
  ditherBand(ctx, 0, h - 56, w, 56, theme.bg, theme.bgAlt, "25");

  // Subtle outer frame at 4px inset leaving 8px to OUTER_MARGIN (12px total)
  R(ctx, 5, 4, w - 10, 1, theme.highlight);
  R(ctx, 4, 5, 1, h - 10, theme.highlight);
  R(ctx, 5, h - 5, w - 10, 1, theme.shadow);
  R(ctx, w - 5, 5, 1, h - 10, theme.shadow);

  // Corner amber studs
  R(ctx, 5, 5, 2, 2, theme.amberLo);
  R(ctx, w - 7, 5, 2, 2, theme.amberLo);
  R(ctx, 5, h - 7, 2, 2, theme.amberLo);
  R(ctx, w - 7, h - 7, 2, 2, theme.amberLo);

  return {
    x: OUTER_MARGIN,
    y: OUTER_MARGIN,
    w: w - OUTER_MARGIN * 2,
    h: h - OUTER_MARGIN * 2,
  };
}

/**
 * Draws a 2px etched horizontal divider inside a panel.
 */
export function drawDivider(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  theme: KarsaTheme = WARM_KOPI_THEME
): void {
  R(ctx, x, y, w, 1, theme.ink);
  R(ctx, x, y + 1, w, 1, theme.highlight);
}


export const GAMEBOY_KOPI_THEME: KarsaTheme = {
  id: "gameboy_green",
  name: "GameBoy DMG-01",
  ink: "#08140C",
  bg: "#0F2417",
  bgAlt: "#142E1E",
  surface: "#1B3B28",
  surfaceAlt: "#224932",
  inset: "#11281B",
  insetLo: "#0B1B12",
  highlight: "#4A855E",
  shadow: "#0C1E14",
  amber: "#B8E89C",
  amberHi: "#E2F8CF",
  amberLo: "#4A7D46",
  crema: "#E8FCE0",
  muted: "#7AB088",
  green: "#9CD878",
  greenHi: "#E0F8CF",
  greenLo: "#2E5E36",
  red: "#B8E89C",
  redHi: "#E2F8CF",
  redLo: "#386640",
  cyan: "#B8E89C",
};

export const CYBER_KOPI_THEME: KarsaTheme = {
  id: "cyberpunk_neon",
  name: "Glodok Cyber 2077",
  ink: "#070414",
  bg: "#100826",
  bgAlt: "#160C33",
  surface: "#1F1147",
  surfaceAlt: "#29175C",
  inset: "#13092E",
  insetLo: "#0B051C",
  highlight: "#FF3898",
  shadow: "#0D0621",
  amber: "#38F6FF",
  amberHi: "#B8FCFF",
  amberLo: "#941159",
  crema: "#FFFFFF",
  muted: "#B088E8",
  green: "#00F5B8",
  greenHi: "#B8FFEA",
  greenLo: "#005E54",
  red: "#FF4769",
  redHi: "#FF99AC",
  redLo: "#7A1230",
  cyan: "#38F6FF",
};

export const KERATON_KOPI_THEME: KarsaTheme = {
  id: "keraton_royal",
  name: "Keraton Royal Emerald",
  ink: "#070D09",
  bg: "#101E15",
  bgAlt: "#15261B",
  surface: "#1B3324",
  surfaceAlt: "#23402E",
  inset: "#112117",
  insetLo: "#0A140E",
  highlight: "#D4AF37",
  shadow: "#0B1710",
  amber: "#FFD966",
  amberHi: "#FFF6C2",
  amberLo: "#8C5818",
  crema: "#FCF8EC",
  muted: "#9CB8A6",
  green: "#5CE6A0",
  greenHi: "#B8FFD8",
  greenLo: "#18593D",
  red: "#FF6666",
  redHi: "#FFA3A3",
  redLo: "#7A2020",
  cyan: "#80E5FF",
};

export const SKIN_THEMES_V3: Record<string, KarsaTheme> = {
  retro_gold: WARM_KOPI_THEME,
  gameboy_green: GAMEBOY_KOPI_THEME,
  cyberpunk_neon: CYBER_KOPI_THEME,
  keraton_royal: KERATON_KOPI_THEME,
};
