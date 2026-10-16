import type { ServerCoopRow, UserBusinessRow, UserRow } from "../db/index.ts";
import {
  CANVAS_H,
  CANVAS_W,
  createSurface,
  drawBevelPanel,
  drawCanvasBackdrop,
  exportUpscaledPng,
  fmtJt,
  fmtRp,
  SKIN_THEMES_V3,
  WARM_KOPI_THEME,
} from "./designSpec.ts";
import { drawPixelText, drawPixelTextCentered } from "./pixelFont.ts";
import { drawPortfolioLeftColumn } from "./portfolioLeftCol.ts";
import { drawPortfolioRightColumn } from "./portfolioRightCol.ts";
import { type AzabV3Input, renderAzabV3 } from "./renderAzabV3.ts";
import { renderCoopV3 } from "./renderCoopV3.ts";
import { drawSpriteV3 } from "./spritesV3.ts";

export { type AzabV3Input, fmtJt, fmtRp, renderAzabV3, renderCoopV3 };

export interface PortfolioV3Input {
  user: UserRow;
  businesses: UserBusinessRow[];
  coop: ServerCoopRow;
  overrideSkin?: string;
}

export function renderPortfolioV3(input: PortfolioV3Input): Buffer {
  const { user, businesses, coop, overrideSkin } = input;
  const T = SKIN_THEMES_V3[overrideSkin || user.skin_id || "retro_gold"] ?? WARM_KOPI_THEME;
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
  drawPixelText(ctx, "KARSA • CATATAN USAHA", 34, 20, T.amberHi, T.ink, 1);
  drawBevelPanel(ctx, 250, 15, 116, 16, T, { fill: T.greenLo, hi: T.greenHi, lo: T.ink, pad: 2 });
  drawPixelTextCentered(ctx, `PASAR MALAM • LV.${coop.eco_level}`, 250, 15, 116, 16, T.crema, T.ink, 1);

  drawPortfolioLeftColumn(ctx, user, T);
  drawPortfolioRightColumn(ctx, user, businesses, T);

  drawBevelPanel(ctx, 12, 184, 360, 20, T, { pad: 6 });
  drawPixelText(ctx, "CATATAN:", 18, 191, T.amber, T.ink, 1);
  const cleanQuest = (user.active_quest || "KLIK SEDUH KOPI 3X UNTUK NAIK KE LV.2")
    .replace(/\/bisnis/gi, "Kelola Usaha")
    .replace(/\/work/gi, "Seduh Kopi")
    .replace(/\/koperasi/gi, "Koperasi")
    .toUpperCase()
    .slice(0, 44);
  drawPixelText(ctx, cleanQuest, 72, 191, T.crema, null, 1);

  return exportUpscaledPng(canvas, 3);
}
