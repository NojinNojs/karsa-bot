import type { SKRSContext2D } from "@napi-rs/canvas";
import type { UserRow } from "../db/index.ts";
import { drawBevelPanel, drawInsetSlot, fmtRp, type KarsaTheme, R } from "./designSpec.ts";
import { drawPixelText, drawPixelTextCentered, drawPixelTextRight } from "./pixelFont.ts";
import { drawSpriteV3 } from "./spritesV3.ts";

export function drawPortfolioLeftColumn(ctx: SKRSContext2D, user: UserRow, T: KarsaTheme): void {
  drawBevelPanel(ctx, 12, 40, 136, 48, T, { pad: 6 });
  drawInsetSlot(ctx, 18, 46, 28, 28, T, { dither: true });
  drawSpriteV3(ctx, "barista_16", 24, 52, 1);
  drawPixelTextCentered(ctx, `LV.${user.level}`, 18, 76, 28, 8, T.muted, null, 1);

  drawPixelText(ctx, (user.username || "AQSAN").toUpperCase().slice(0, 10), 52, 47, T.crema, T.ink, 1);
  drawPixelText(ctx, (user.job_title || "PERACIK UTAMA").slice(0, 14), 52, 57, T.cyan, T.ink, 1);

  drawBevelPanel(ctx, 52, 67, 90, 15, T, { fill: T.amberLo, hi: T.amberHi, lo: T.ink, pad: 2 });
  const rawBadge = (user.badge || "WARUNG JUJUR").toUpperCase();
  const cleanBadge =
    rawBadge === "PEDAGANG PASAR"
      ? "WARGA PASAR"
      : rawBadge === "WARUNG DISEGEL"
        ? "LAPAK DISEGEL"
        : rawBadge === "BANGKIT KEMBALI"
          ? "BANGKIT LAGI"
          : rawBadge.slice(0, 13);
  drawPixelTextCentered(ctx, cleanBadge, 52, 67, 90, 15, T.crema, T.ink, 1);

  drawBevelPanel(ctx, 12, 94, 136, 36, T, { pad: 6 });
  drawPixelText(ctx, "LACI KAS", 18, 100, T.muted, T.ink, 1);
  drawSpriteV3(ctx, "koin_12", 18, 111, 1);
  drawPixelText(ctx, fmtRp(user.balance), 33, 114, T.amberHi, T.ink, 1);
  drawInsetSlot(ctx, 102, 109, 40, 15, T);
  drawSpriteV3(ctx, "bintang_12", 105, 111, 1);
  drawPixelText(ctx, `X${user.gems}`, 120, 113, T.amber, T.ink, 1);

  drawBevelPanel(ctx, 12, 136, 136, 42, T, { pad: 6 });
  drawPixelText(ctx, "NAMA BAIK", 18, 142, T.muted, T.ink, 1);
  drawPixelTextRight(ctx, `${user.karma}/100`, 142, 142, T.greenHi, T.ink, 1);

  drawInsetSlot(ctx, 18, 152, 122, 10, T, { pad: 2 });
  const segs = Math.round(Math.max(0, Math.min(100, user.karma)) / 10);
  for (let i = 0; i < 10; i++) {
    const sx = 20 + i * 12;
    if (i < segs) {
      R(ctx, sx, 154, 10, 6, T.green);
      R(ctx, sx, 154, 10, 1, T.greenHi);
      R(ctx, sx, 159, 10, 1, T.greenLo);
    } else R(ctx, sx, 154, 10, 6, T.insetLo);
  }

  const hasDebt = user.pinjol_debt > 0 || user.is_seized === 1;
  drawPixelText(ctx, hasDebt ? "TUNGGAKAN" : "AMAN", 18, 165, hasDebt ? T.redHi : T.greenHi, T.ink, 1);
  drawPixelTextRight(
    ctx,
    hasDebt ? fmtRp(user.pinjol_debt) : user.karma >= 80 ? "SEWA -15%" : "SEWA NORMAL",
    142,
    165,
    T.amberHi,
    T.ink,
    1,
  );
}
