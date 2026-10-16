import { drawAzabLeftCol } from "./azabLeftCol.ts";
import {
  AZAB_KOPI_THEME,
  CANVAS_H,
  CANVAS_W,
  createSurface,
  drawBevelPanel,
  drawCanvasBackdrop,
  drawDivider,
  drawInsetSlot,
  exportUpscaledPng,
  fmtRp,
} from "./designSpec.ts";
import { drawPixelText, drawPixelTextCentered, drawPixelTextRight } from "./pixelFont.ts";
import { drawSpriteV3, type SpriteV3Name } from "./spritesV3.ts";

export interface AzabV3Input {
  username: string;
  mode: "pinjol" | "slot";
  cashLost: number;
  totalDebt: number;
  assetSeizedName: string;
  karmaAfter: number;
}

export function renderAzabV3(input: AzabV3Input): Buffer {
  const T = AZAB_KOPI_THEME;
  const { canvas, ctx } = createSurface(CANVAS_W, CANVAS_H);

  drawCanvasBackdrop(ctx, T, CANVAS_W, CANVAS_H);

  // Header Bar (x=12, y=12, w=360, h=22)
  drawBevelPanel(ctx, 12, 12, 360, 22, T, {
    fill: T.surface,
    hi: T.redHi,
    lo: T.redLo,
    accentTop: T.redHi,
    headerDither: true,
    pad: 5,
  });
  drawSpriteV3(ctx, "koin_12", 18, 17, 1);
  drawPixelText(ctx, "SURAT SEGEL LAPAK", 34, 20, T.amberHi, T.ink, 1);

  drawBevelPanel(ctx, 268, 15, 98, 16, T, { fill: T.redLo, hi: T.redHi, lo: T.ink, pad: 2 });
  drawPixelTextCentered(ctx, "TUTUP PAKSA", 268, 15, 98, 16, T.crema, T.ink, 1);

  drawAzabLeftCol(ctx, input, T);

  // Right Column: Seizure Details (x=154, y=40, w=218, h=138)
  drawBevelPanel(ctx, 154, 40, 218, 138, T, { pad: 6 });
  drawPixelText(ctx, "RINCIAN PENYITAAN", 162, 46, T.crema, T.ink, 1);
  drawPixelTextRight(ctx, "STATUS: BEKU", 364, 46, T.redHi, T.ink, 1);
  drawDivider(ctx, 160, 56, 206, T);

  const rows: Array<{ icon: SpriteV3Name; t: string; d: string; v: string }> = [
    {
      icon: "koin_12",
      t: "BUNGA HARIAN 8%",
      d: "KAS WARUNG TERKURAS",
      v: `-${fmtRp(input.cashLost)}`,
    },
    {
      icon: "segel_gembok_16",
      t: "ALAT USAHA DISITA",
      d: "MESIN KOPI & GEROBAK",
      v: "DISEGEL",
    },
    {
      icon: "gerobak_kopi_16",
      t: "NASIB LANGGANAN",
      d: "PINDAH WARUNG SEBELAH",
      v: "SEPI",
    },
  ];

  rows.forEach((r, idx) => {
    const ry = 61 + idx * 38;
    drawBevelPanel(ctx, 160, ry, 206, 34, T, {
      fill: T.surfaceAlt,
      hi: T.highlight,
      lo: T.shadow,
      pad: 4,
    });
    drawInsetSlot(ctx, 165, ry + 5, 24, 24, T, { dither: true });
    const spOffset = r.icon === "koin_12" ? 6 : 4;
    drawSpriteV3(ctx, r.icon, 165 + spOffset, ry + 5 + spOffset, 1);

    drawPixelText(ctx, r.t, 195, ry + 7, T.crema, T.ink, 1);
    drawPixelText(ctx, r.d, 195, ry + 19, T.muted, null, 1);
    drawPixelTextRight(ctx, r.v, 360, ry + 7, T.amberHi, T.ink, 1);
  });

  // Footer Bar (x=12, y=184, w=360, h=20)
  drawBevelPanel(ctx, 12, 184, 360, 20, T, { pad: 6 });
  drawPixelText(ctx, "SOLUSI:", 18, 191, T.amberHi, T.ink, 1);
  drawPixelText(ctx, "TEBUS GEROBAK BARENG WARGA DI /KOPERASI", 66, 191, T.crema, null, 1);

  return exportUpscaledPng(canvas, 3);
}
