import type { LeaderboardEntry, ServerCoopRow } from "../db/index.ts";
import {
  CANVAS_H,
  CANVAS_W,
  createSurface,
  drawBevelPanel,
  drawCanvasBackdrop,
  drawDivider,
  drawInsetSlot,
  exportUpscaledPng,
  fmtJt,
  fmtRp,
  WARM_KOPI_THEME,
} from "./designSpec.ts";
import { drawLeaderboardLeftCol } from "./leaderboardLeftCol.ts";
import { drawPixelText, drawPixelTextCentered, drawPixelTextRight } from "./pixelFont.ts";
import { drawSpriteV3, type SpriteV3Name } from "./spritesV3.ts";

export { fmtJt, fmtRp };

const RANK_SPRITES: readonly SpriteV3Name[] = ["barista_16", "emas_batangan_16", "gerobak_kopi_16"];
const BADGE_MAP: Record<string, string> = {
  "PEDAGANG PASAR": "WARGA PASAR",
  "WARUNG DISEGEL": "LAPAK DISEGEL",
  "BANGKIT KEMBALI": "BANGKIT LAGI",
};

export function renderLeaderboardV3(leaders: LeaderboardEntry[], coop: ServerCoopRow): Buffer {
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
  drawPixelText(ctx, "KARSA • PAPAN PERINGKAT", 34, 20, T.amberHi, T.ink, 1);

  drawBevelPanel(ctx, 250, 15, 116, 16, T, { fill: T.greenLo, hi: T.greenHi, lo: T.ink, pad: 2 });
  drawPixelTextCentered(ctx, `PASAR MALAM • LV.${coop.eco_level}`, 250, 15, 116, 16, T.crema, T.ink, 1);

  drawLeaderboardLeftCol(ctx, coop, T);

  drawBevelPanel(ctx, 154, 40, 218, 138, T, { pad: 6 });
  drawPixelText(ctx, "TOP 3 PEDAGANG", 162, 46, T.crema, T.ink, 1);
  drawPixelTextRight(ctx, "TOTAL HARTA", 364, 46, T.greenHi, T.ink, 1);
  drawDivider(ctx, 160, 56, 206, T);

  for (let idx = 0; idx < 3; idx++) {
    const entry = leaders[idx];
    const ry = 61 + idx * 38;
    const isEmpty = !entry;

    drawBevelPanel(ctx, 160, ry, 206, 34, T, {
      fill: isEmpty ? T.inset : T.surfaceAlt,
      hi: isEmpty ? T.shadow : T.highlight,
      lo: T.shadow,
      pad: 4,
    });
    drawInsetSlot(ctx, 165, ry + 5, 24, 24, T, { dither: true });
    drawSpriteV3(ctx, isEmpty ? "gerobak_kopi_16" : (RANK_SPRITES[idx] ?? "gerobak_kopi_16"), 169, ry + 9, 1);

    if (isEmpty) {
      drawPixelText(ctx, `${idx + 1}. LOWONG`, 195, ry + 7, T.muted, T.ink, 1);
      drawPixelText(ctx, "BELUM ADA PEDAGANG", 195, ry + 19, T.muted, null, 1);
      drawPixelTextRight(ctx, "RP 0", 360, ry + 7, T.muted, T.ink, 1);
      drawPixelTextRight(ctx, "LV.-", 360, ry + 19, T.muted, null, 1);
    } else {
      const uname = (entry.username || "PEDAGANG").toUpperCase().slice(0, 12);
      const rawBadge = (entry.badge || "WARUNG JUJUR").toUpperCase();
      const badge = BADGE_MAP[rawBadge] ?? rawBadge.slice(0, 13);
      drawPixelText(ctx, `${idx + 1}. ${uname}`, 195, ry + 7, T.crema, T.ink, 1);
      drawPixelText(ctx, `${badge} • ${entry.karma}/100`, 195, ry + 19, T.muted, null, 1);
      drawPixelTextRight(ctx, fmtRp(entry.netWorth), 360, ry + 7, T.amberHi, T.ink, 1);
      drawPixelTextRight(ctx, `LV.${entry.level}`, 360, ry + 19, T.greenHi, null, 1);
    }
  }

  drawBevelPanel(ctx, 12, 184, 360, 20, T, { pad: 6 });
  drawPixelText(ctx, "TIPS:", 18, 191, T.amber, T.ink, 1);
  drawPixelText(ctx, "JAGA NAMA BAIK MIN. 80 UNTUK DISKON SEWA 15%", 50, 191, T.crema, null, 1);
  return exportUpscaledPng(canvas, 3);
}
