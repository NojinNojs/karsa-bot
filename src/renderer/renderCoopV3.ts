import type { ServerCoopRow } from "../db/index.ts";
import { drawCoopLeftCol, parseCoopContributors } from "./coopLeftCol.ts";
import {
  CANVAS_H,
  CANVAS_W,
  createSurface,
  drawBevelPanel,
  drawCanvasBackdrop,
  drawDivider,
  drawInsetSlot,
  exportUpscaledPng,
  fmtRp,
  WARM_KOPI_THEME,
} from "./designSpec.ts";
import { drawPixelText, drawPixelTextCentered, drawPixelTextRight } from "./pixelFont.ts";
import { drawSpriteV3, type SpriteV3Name } from "./spritesV3.ts";

export function renderCoopV3(coop: ServerCoopRow): Buffer {
  const T = WARM_KOPI_THEME;
  const { canvas, ctx } = createSurface(CANVAS_W, CANVAS_H);
  drawCanvasBackdrop(ctx, T, CANVAS_W, CANVAS_H);

  drawBevelPanel(ctx, 12, 12, 360, 22, T, {
    fill: T.surface,
    hi: T.amber,
    lo: T.amberLo,
    accentTop: T.amberHi,
    headerDither: true,
    pad: 5,
  });
  drawSpriteV3(ctx, "koin_12", 18, 17, 1);
  drawPixelText(ctx, "KARSA • KOPERASI PEDAGANG", 34, 20, T.amberHi, T.ink, 1);

  const isHealthy = coop.eco_health >= 80;
  drawBevelPanel(ctx, 250, 15, 116, 16, T, {
    fill: isHealthy ? T.greenLo : T.amberLo,
    hi: isHealthy ? T.greenHi : T.amberHi,
    lo: T.ink,
    pad: 2,
  });
  drawPixelTextCentered(ctx, isHealthy ? `PASAR SEHAT ${coop.eco_health}%` : "PASAR RINTISAN", 250, 15, 116, 16, T.crema, T.ink, 1);

  const sortedContributors = parseCoopContributors(coop);
  drawCoopLeftCol(ctx, coop, sortedContributors, T);

  drawBevelPanel(ctx, 154, 40, 218, 138, T, { pad: 6 });
  drawPixelText(ctx, "PENYUMBANG UTAMA", 162, 46, T.crema, T.ink, 1);
  drawPixelTextRight(ctx, `LV.${coop.eco_level} • BAGI HASIL`, 364, 46, T.greenHi, T.ink, 1);
  drawDivider(ctx, 160, 56, 206, T);

  const rankIcons: readonly SpriteV3Name[] = ["barista_16", "emas_batangan_16", "celengan_warga_16"];
  for (let idx = 0; idx < 3; idx++) {
    const ry = 61 + idx * 38;
    const contrib = sortedContributors[idx];
    const isEmpty = !contrib;
    drawBevelPanel(ctx, 160, ry, 206, 34, T, {
      fill: isEmpty ? T.inset : T.surfaceAlt,
      hi: isEmpty ? T.shadow : T.highlight,
      lo: T.shadow,
      pad: 4,
    });
    drawInsetSlot(ctx, 165, ry + 5, 24, 24, T, { dither: true });
    drawSpriteV3(ctx, rankIcons[idx] ?? "celengan_warga_16", 169, ry + 9, 1);

    if (isEmpty) {
      drawPixelText(ctx, `${idx + 1}. LOWONG`, 195, ry + 7, T.muted, T.ink, 1);
      drawPixelText(ctx, "BELUM ADA PATUNGAN", 195, ry + 19, T.muted, null, 1);
      drawPixelTextRight(ctx, "RP 0", 360, ry + 7, T.muted, T.ink, 1);
      drawPixelTextRight(ctx, "KOSONG", 360, ry + 19, T.muted, null, 1);
    } else {
      const label = (contrib.name || "WARGA").toUpperCase().slice(0, 12);
      const roleStr = (contrib.role || "MITRA AKTIF").toUpperCase().slice(0, 16);
      const rightTag = contrib.warungSaved > 0 ? `${contrib.warungSaved} TEBUS` : idx === 0 ? "PELOPOR" : "AKTIF";
      drawPixelText(ctx, `${idx + 1}. ${label}`, 195, ry + 7, T.crema, T.ink, 1);
      drawPixelText(ctx, roleStr, 195, ry + 19, T.muted, null, 1);
      drawPixelTextRight(ctx, fmtRp(contrib.totalRp), 360, ry + 7, T.amberHi, T.ink, 1);
      drawPixelTextRight(ctx, rightTag, 360, ry + 19, T.greenHi, null, 1);
    }
  }

  drawBevelPanel(ctx, 12, 184, 360, 20, T, { pad: 6 });
  drawPixelText(ctx, "PATUNGAN:", 18, 191, T.amber, T.ink, 1);
  drawPixelText(ctx, "IURAN MODAL & TEBUS GEROBAK WARGA DISITA", 80, 191, T.crema, null, 1);
  return exportUpscaledPng(canvas, 3);
}
