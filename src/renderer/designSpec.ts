import type { SKRSContext2D } from "@napi-rs/canvas";
import { CANVAS_H, CANVAS_W, ditherBand, R, WARM_KOPI_THEME } from "./canvasSurface.ts";

export * from "./canvasSurface.ts";

export function drawBevelPanel(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  theme = WARM_KOPI_THEME,
  opts?: {
    fill?: string;
    hi?: string;
    lo?: string;
    accentTop?: string;
    headerDither?: boolean;
    pad?: number;
  },
) {
  const fill = opts?.fill ?? theme.surface,
    hi = opts?.hi ?? theme.highlight,
    lo = opts?.lo ?? theme.shadow;
  R(ctx, x + 1, y + 1, w - 2, h - 2, theme.ink);
  R(ctx, x + 2, y + 2, w - 4, h - 4, fill);
  if (opts?.headerDither) ditherBand(ctx, x + 2, y + 2, w - 4, Math.min(10, h - 4), fill, theme.surfaceAlt, "50");
  R(ctx, x + 2, y + 1, w - 4, 1, opts?.accentTop ?? hi);
  R(ctx, x + 1, y + 2, 1, h - 4, hi);
  R(ctx, x + 2, y + h - 2, w - 4, 1, lo);
  R(ctx, x + w - 2, y + 2, 1, h - 4, lo);
}

export function drawInsetSlot(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  theme = WARM_KOPI_THEME,
  opts?: { fill?: string; dither?: boolean; pad?: number; hi?: string; lo?: string },
) {
  const fill = opts?.fill ?? theme.inset;
  R(ctx, x, y, w, h, theme.ink);
  R(ctx, x + 1, y + 1, w - 2, h - 2, fill);
  if (opts?.dither) ditherBand(ctx, x + 1, y + 1, w - 2, h - 2, fill, theme.insetLo, "25");
  R(ctx, x + 1, y + 1, w - 2, 1, theme.insetLo);
  R(ctx, x + 1, y + 1, 1, h - 2, theme.insetLo);
  R(ctx, x + 1, y + h - 2, w - 2, 1, theme.highlight);
  R(ctx, x + w - 2, y + 1, 1, h - 2, theme.highlight);
}

export function drawCanvasBackdrop(ctx: SKRSContext2D, theme = WARM_KOPI_THEME, w = CANVAS_W, h = CANVAS_H) {
  R(ctx, 0, 0, w, h, theme.bg);
  ditherBand(ctx, 0, 0, w, h, theme.bg, theme.bgAlt, "12");
  ditherBand(ctx, 0, h - 56, w, 56, theme.bg, theme.bgAlt, "25");
  R(ctx, 5, 4, w - 10, 1, theme.highlight);
  R(ctx, 4, 5, 1, h - 10, theme.highlight);
  R(ctx, 5, h - 5, w - 10, 1, theme.shadow);
  R(ctx, w - 5, 5, 1, h - 10, theme.shadow);
  R(ctx, 5, 5, 2, 2, theme.amberLo);
  R(ctx, w - 7, 5, 2, 2, theme.amberLo);
  R(ctx, 5, h - 7, 2, 2, theme.amberLo);
  R(ctx, w - 7, h - 7, 2, 2, theme.amberLo);
}

export function drawDivider(ctx: SKRSContext2D, x: number, y: number, w: number, theme = WARM_KOPI_THEME): void {
  R(ctx, x, y, w, 1, theme.ink);
  R(ctx, x, y + 1, w, 1, theme.highlight);
}

export function fmtRp(val: number): string {
  if (!Number.isFinite(val) || Math.round(val) === 0) return "RP 0";
  const sign = val < 0 ? "-" : "",
    abs = Math.abs(Math.round(val));
  if (abs >= 1_000_000)
    return `${sign}RP ${(abs / 1_000_000) < 100 ? (abs / 1_000_000).toFixed(1).replace(".", ",") : Math.round(abs / 1_000_000)} JT`;
  if (abs >= 1_000) return `${sign}RP ${Math.round(abs / 1_000)} RB`;
  return `${sign}RP ${abs}`;
}
export const fmtJt = fmtRp;
