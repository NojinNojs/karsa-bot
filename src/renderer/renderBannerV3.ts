import {
  createSurface,
  ditherBand,
  drawBevelPanel,
  drawCanvasBackdrop,
  drawDivider,
  drawInsetSlot,
  exportUpscaledPng,
  R,
  WARM_KOPI_THEME,
} from "./designSpec.ts";
import { drawPixelText, drawPixelTextCentered } from "./pixelFont.ts";
import { drawSideMugMotif } from "./renderAvatarV3.ts";

export function renderBannerV3(): Buffer {
  const W = 340;
  const H = 120;
  const T = WARM_KOPI_THEME;
  const { canvas, ctx } = createSurface(W, H);

  // Outer backdrop (12px outer margin -> content area x=12..328, y=12..108, w=316, h=96)
  drawCanvasBackdrop(ctx, T, W, H);

  // Left Panel: Framed Night Kopi Showcase (x=12, y=12, w=96, h=96)
  drawBevelPanel(ctx, 12, 12, 96, 96, T, {
    fill: T.surface,
    hi: T.amber,
    lo: T.amberLo,
    accentTop: T.amberHi,
    headerDither: true,
    pad: 6,
  });

  // Inner diorama well (x=18, y=18, w=84, h=64)
  drawInsetSlot(ctx, 18, 18, 84, 64, T, {
    fill: T.inset,
    lo: T.insetLo,
    hi: T.highlight,
    dither: true,
  });

  // Warm ambient glow inside the vignette
  ditherBand(ctx, 26, 24, 68, 46, T.surface, T.highlight, "25");
  // Floor counter bar inside vignette
  R(ctx, 20, 70, 80, 10, T.amberLo);
  R(ctx, 20, 70, 80, 1, T.amber);

  // 2x scaled Coffee Cup centerpiece inside left vignette (48x48 at x=36, y=24)
  drawSideMugMotif(ctx, 36, 20, 2);

  // Bottom mini label inside Left Panel (x=18, y=85, w=84, h=17)
  drawInsetSlot(ctx, 18, 85, 84, 17, T, { fill: T.surfaceAlt });
  drawPixelTextCentered(ctx, "KOPI KARSA", 18, 85, 84, 17, T.amberHi, T.ink, 1);

  // Right Panel: Editorial Brand & Story (x=116, y=12, w=212, h=96) — exact 8px gap from Left Panel
  drawBevelPanel(ctx, 116, 12, 212, 96, T, {
    fill: T.surface,
    hi: T.highlight,
    lo: T.shadow,
    headerDither: true,
    pad: 10,
  });

  // Top Row: 2x Scale "KARSA" (height=14px at x=126, y=22) + Right Pill Badge "BUKA MALAM INI"
  drawPixelText(ctx, "KARSA", 126, 22, T.amber, T.ink, 2);

  // Right Status Badge (x=218, y=22, w=100, h=14)
  drawBevelPanel(ctx, 218, 22, 100, 14, T, {
    fill: T.greenLo,
    hi: T.greenHi,
    lo: T.ink,
    pad: 2,
  });
  drawPixelTextCentered(ctx, "BUKA MALAM INI", 218, 22, 100, 14, T.crema, T.ink, 1);

  // Etched Divider at y=42
  drawDivider(ctx, 126, 42, 192, T);

  // Middle Story Tagline (Zero "16-bit" or "sim" jargon!)
  drawPixelText(ctx, "DARI SATU GEROBAK KOPI,", 126, 50, T.crema, T.ink, 1);
  drawPixelText(ctx, "HIDUPIN SATU JALAN.", 126, 62, T.greenHi, T.ink, 1);

  // Bottom Command Slot (x=126, y=78, w=192, h=20)
  drawInsetSlot(ctx, 126, 78, 192, 20, T, {
    fill: T.inset,
    lo: T.insetLo,
    hi: T.highlight,
  });
  drawPixelTextCentered(ctx, "/START  •  /PORTFOLIO  •  /WORK", 126, 78, 192, 20, T.amberHi, T.ink, 1);

  return exportUpscaledPng(canvas, 2);
}
