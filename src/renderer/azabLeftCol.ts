import type { SKRSContext2D } from "@napi-rs/canvas";
import { drawBevelPanel, drawInsetSlot, fmtRp, type KarsaTheme, R } from "./designSpec.ts";
import { drawPixelText, drawPixelTextCentered, drawPixelTextRight } from "./pixelFont.ts";
import { drawSpriteV3 } from "./spritesV3.ts";

export interface AzabLeftColInput {
  username: string;
  totalDebt: number;
  karmaAfter: number;
}

export function drawAzabLeftCol(ctx: SKRSContext2D, input: AzabLeftColInput, T: KarsaTheme): void {
  drawBevelPanel(ctx, 12, 40, 136, 48, T, { pad: 6 });
  drawInsetSlot(ctx, 18, 46, 28, 28, T, { dither: true });
  drawSpriteV3(ctx, "barista_16", 24, 52, 1);
  drawPixelText(ctx, input.username.toUpperCase().slice(0, 10), 52, 47, T.crema, T.ink, 1);
  drawPixelText(ctx, "LAPAK DISITA", 52, 57, T.amber, T.ink, 1);
  drawBevelPanel(ctx, 52, 68, 90, 14, T, { fill: T.redLo, hi: T.redHi, lo: T.ink, pad: 2 });
  drawPixelTextCentered(ctx, "MACET BAYAR", 52, 68, 90, 14, T.crema, T.ink, 1);

  drawBevelPanel(ctx, 12, 94, 136, 36, T, { pad: 6 });
  drawPixelText(ctx, "TUNGGAKAN BUNGA", 18, 100, T.muted, T.ink, 1);
  drawPixelText(ctx, fmtRp(input.totalDebt), 18, 114, T.amberHi, T.ink, 1);

  drawBevelPanel(ctx, 12, 136, 136, 42, T, { pad: 6 });
  drawPixelText(ctx, "NAMA BAIK", 18, 142, T.muted, T.ink, 1);
  drawPixelTextRight(ctx, `${input.karmaAfter}/100`, 142, 142, T.redHi, T.ink, 1);
  drawInsetSlot(ctx, 18, 152, 122, 10, T, { pad: 2 });
  const azabSegs = Math.max(1, Math.round(Math.max(0, Math.min(100, input.karmaAfter)) / 10));
  for (let i = 0; i < 10; i++) {
    const sx = 20 + i * 12;
    if (i < azabSegs) {
      R(ctx, sx, 154, 10, 6, T.red);
      R(ctx, sx, 154, 10, 1, T.redHi);
    } else {
      R(ctx, sx, 154, 10, 6, T.insetLo);
    }
  }
  drawPixelText(ctx, "MACET", 18, 165, T.redHi, T.ink, 1);
  drawPixelTextRight(ctx, "SEWA +20%", 142, 165, T.amberHi, T.ink, 1);
}
