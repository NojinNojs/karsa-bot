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
  R,
  WARM_KOPI_THEME,
} from "./designSpec.ts";
import { drawPixelText, drawPixelTextCentered, drawPixelTextRight } from "./pixelFont.ts";
import { drawSpriteV3, type SpriteV3Name } from "./spritesV3.ts";

export { fmtJt, fmtRp };

const RANK_SPRITES: readonly SpriteV3Name[] = ["barista_16", "emas_batangan_16", "gerobak_kopi_16"];

export function renderLeaderboardV3(leaders: LeaderboardEntry[], coop: ServerCoopRow): Buffer {
  const T = WARM_KOPI_THEME;
  const { canvas, ctx } = createSurface(CANVAS_W, CANVAS_H);

  // 1. Backdrop
  drawCanvasBackdrop(ctx, T, CANVAS_W, CANVAS_H);

  // 2. Top Header Bar (x=12, y=12, w=360, h=22)
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

  // Right Header Badge (x=250, y=15, w=116, h=16)
  drawBevelPanel(ctx, 250, 15, 116, 16, T, {
    fill: T.greenLo,
    hi: T.greenHi,
    lo: T.ink,
    pad: 2,
  });
  drawPixelTextCentered(ctx, `PASAR MALAM • LV.${coop.eco_level}`, 250, 15, 116, 16, T.crema, T.ink, 1);

  // 3. Left Column (x=12, w=136)
  // L1 (y=40, h=48): celengan_warga_16 in 28x28 inset slot, "KAS KOPERASI", formatted coop.pool_balance, and badge "GOTONG ROYONG".
  drawBevelPanel(ctx, 12, 40, 136, 48, T, { pad: 6 });
  drawInsetSlot(ctx, 18, 46, 28, 28, T, { dither: true });
  drawSpriteV3(ctx, "celengan_warga_16", 24, 52, 1);
  drawPixelText(ctx, "KAS KOPERASI", 52, 47, T.muted, T.ink, 1);
  drawPixelText(ctx, fmtRp(coop.pool_balance), 52, 58, T.amberHi, T.ink, 1);
  drawBevelPanel(ctx, 52, 67, 90, 15, T, {
    fill: T.greenLo,
    hi: T.greenHi,
    lo: T.ink,
    pad: 2,
  });
  drawPixelTextCentered(ctx, "GOTONG ROYONG", 52, 67, 90, 15, T.crema, T.ink, 1);

  // L2 (y=94, h=36): "GEROBAK DITEBUS", gerobak_kopi_16 sprite + `${coop.rescued_count} WARUNG SELAMAT`.
  drawBevelPanel(ctx, 12, 94, 136, 36, T, { pad: 6 });
  drawPixelText(ctx, "GEROBAK DITEBUS", 18, 100, T.muted, T.ink, 1);
  drawSpriteV3(ctx, "gerobak_kopi_16", 18, 110, 1);
  drawPixelText(ctx, `${coop.rescued_count} WARUNG SELAMAT`, 38, 114, T.greenHi, T.ink, 1);

  // L3 (y=136, h=42): "KONDISI PASAR", `${coop.eco_health}/100` right-aligned, 10-segment bar at x=18, y=152, w=122, h=10, and bottom labels "PASAR SEHAT" / "SEWA -15%".
  drawBevelPanel(ctx, 12, 136, 136, 42, T, { pad: 6 });
  drawPixelText(ctx, "KONDISI PASAR", 18, 142, T.muted, T.ink, 1);
  drawPixelTextRight(
    ctx,
    `${coop.eco_health}/100`,
    142,
    142,
    coop.eco_health >= 80 ? T.greenHi : T.amberHi,
    T.ink,
    1,
  );
  drawInsetSlot(ctx, 18, 152, 122, 10, T, { pad: 2 });
  const segs = Math.round(Math.max(0, Math.min(100, coop.eco_health)) / 10);
  for (let i = 0; i < 10; i++) {
    const sx = 20 + i * 12;
    if (i < segs) {
      R(ctx, sx, 154, 10, 6, T.green);
      R(ctx, sx, 154, 10, 1, T.greenHi);
      R(ctx, sx, 159, 10, 1, T.greenLo);
    } else {
      R(ctx, sx, 154, 10, 6, T.insetLo);
    }
  }
  const isHealthy = coop.eco_health >= 80;
  const marketLabel = isHealthy ? "SEHAT" : "RINTISAN";
  const rentLabel = isHealthy ? "SEWA -15%" : "SEWA NORMAL";
  drawPixelText(ctx, marketLabel, 18, 165, isHealthy ? T.greenHi : T.amber, T.ink, 1);
  drawPixelTextRight(ctx, rentLabel, 142, 165, T.amberHi, T.ink, 1);

  // 4. Right Column (x=154, y=40, w=218, h=138)
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
    const sprite = isEmpty ? "gerobak_kopi_16" : (RANK_SPRITES[idx] ?? "gerobak_kopi_16");
    drawSpriteV3(ctx, sprite, 169, ry + 9, 1);

    if (isEmpty) {
      drawPixelText(ctx, `${idx + 1}. LOWONG`, 195, ry + 7, T.muted, T.ink, 1);
      drawPixelText(ctx, "BELUM ADA PEDAGANG", 195, ry + 19, T.muted, null, 1);
      drawPixelTextRight(ctx, "RP 0", 360, ry + 7, T.muted, T.ink, 1);
      drawPixelTextRight(ctx, "LV.-", 360, ry + 19, T.muted, null, 1);
    } else {
      const uname = (entry.username || "PEDAGANG").toUpperCase().slice(0, 12);
      const rawBadge = (entry.badge || "WARUNG JUJUR").toUpperCase();
      const badge =
        rawBadge === "PEDAGANG PASAR"
          ? "WARGA PASAR"
          : rawBadge === "WARUNG DISEGEL"
            ? "LAPAK DISEGEL"
            : rawBadge === "BANGKIT KEMBALI"
              ? "BANGKIT LAGI"
              : rawBadge.slice(0, 13);
      const titleStr = `${idx + 1}. ${uname}`;
      const subStr = `${badge} • ${entry.karma}/100`;
      const nwStr = fmtRp(entry.netWorth);
      const lvStr = `LV.${entry.level}`;

      drawPixelText(ctx, titleStr, 195, ry + 7, T.crema, T.ink, 1);
      drawPixelText(ctx, subStr, 195, ry + 19, T.muted, null, 1);
      drawPixelTextRight(ctx, nwStr, 360, ry + 7, T.amberHi, T.ink, 1);
      drawPixelTextRight(ctx, lvStr, 360, ry + 19, T.greenHi, null, 1);
    }
  }

  // 5. Bottom Footer Bar (x=12, y=184, w=360, h=20)
  drawBevelPanel(ctx, 12, 184, 360, 20, T, { pad: 6 });
  drawPixelText(ctx, "TIPS:", 18, 191, T.amber, T.ink, 1);
  drawPixelText(ctx, "JAGA NAMA BAIK MIN. 80 UNTUK DISKON SEWA 15%", 50, 191, T.crema, null, 1);

  return exportUpscaledPng(canvas, 3);
}
