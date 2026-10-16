import type { SKRSContext2D } from "@napi-rs/canvas";
import type { ServerCoopRow } from "../db/index.ts";
import { drawBevelPanel, drawInsetSlot, fmtRp, type KarsaTheme, R } from "./designSpec.ts";
import { drawPixelText, drawPixelTextCentered, drawPixelTextRight } from "./pixelFont.ts";
import { drawSpriteV3 } from "./spritesV3.ts";

export function drawLeaderboardLeftCol(ctx: SKRSContext2D, coop: ServerCoopRow, T: KarsaTheme): void {
  drawBevelPanel(ctx, 12, 40, 136, 48, T, { pad: 6 });
  drawInsetSlot(ctx, 18, 46, 28, 28, T, { dither: true });
  drawSpriteV3(ctx, "celengan_warga_16", 24, 52, 1);
  drawPixelText(ctx, "KAS KOPERASI", 52, 47, T.muted, T.ink, 1);
  drawPixelText(ctx, fmtRp(coop.pool_balance), 52, 58, T.amberHi, T.ink, 1);
  drawBevelPanel(ctx, 52, 67, 90, 15, T, { fill: T.greenLo, hi: T.greenHi, lo: T.ink, pad: 2 });
  drawPixelTextCentered(ctx, "GOTONG ROYONG", 52, 67, 90, 15, T.crema, T.ink, 1);

  drawBevelPanel(ctx, 12, 94, 136, 36, T, { pad: 6 });
  drawPixelText(ctx, "GEROBAK DITEBUS", 18, 100, T.muted, T.ink, 1);
  drawSpriteV3(ctx, "gerobak_kopi_16", 18, 110, 1);
  drawPixelText(ctx, `${coop.rescued_count} WARUNG SELAMAT`, 38, 114, T.greenHi, T.ink, 1);

  const isHealthy = coop.eco_health >= 80;
  drawBevelPanel(ctx, 12, 136, 136, 42, T, { pad: 6 });
  drawPixelText(ctx, "KONDISI PASAR", 18, 142, T.muted, T.ink, 1);
  drawPixelTextRight(ctx, `${coop.eco_health}/100`, 142, 142, isHealthy ? T.greenHi : T.amberHi, T.ink, 1);
  drawInsetSlot(ctx, 18, 152, 122, 10, T, { pad: 2 });
  const segs = Math.round(Math.max(0, Math.min(100, coop.eco_health)) / 10);
  for (let i = 0; i < 10; i++) {
    const sx = 20 + i * 12;
    if (i < segs) {
      R(ctx, sx, 154, 10, 6, T.green);
      R(ctx, sx, 154, 10, 1, T.greenHi);
    } else {
      R(ctx, sx, 154, 10, 6, T.insetLo);
    }
  }
  drawPixelText(ctx, isHealthy ? "SEHAT" : "RINTISAN", 18, 165, isHealthy ? T.greenHi : T.amber, T.ink, 1);
  drawPixelTextRight(ctx, isHealthy ? "SEWA -15%" : "SEWA NORMAL", 142, 165, T.amberHi, T.ink, 1);
}
