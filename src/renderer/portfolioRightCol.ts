import type { SKRSContext2D } from "@napi-rs/canvas";
import type { UserBusinessRow, UserRow } from "../db/index.ts";
import { BUSINESS_CATALOG } from "../game/mechanics.ts";
import { drawBevelPanel, drawDivider, drawInsetSlot, fmtRp, type KarsaTheme } from "./designSpec.ts";
import { drawPixelText, drawPixelTextRight } from "./pixelFont.ts";
import { drawSpriteV3, type SpriteV3Name } from "./spritesV3.ts";

const SPRITE_BY_TYPE: Record<string, SpriteV3Name> = {
  kedai_kopi: "gerobak_kopi_16",
  brankas_darurat: "emas_batangan_16",
  saham_koperasi: "celengan_warga_16",
};
const TITLE_BY_TYPE: Record<string, string> = {
  kedai_kopi: "KEDAI KOPI",
  brankas_darurat: "TABUNGAN EMAS",
  saham_koperasi: "KOPERASI WARGA",
};
const REQ_BY_TYPE: Record<string, string> = {
  kedai_kopi: "BUKA DI /BISNIS",
  brankas_darurat: "SYARAT: KEDAI LV.2",
  saham_koperasi: "SYARAT: KEDAI LV.3",
};

export function drawPortfolioRightColumn(ctx: SKRSContext2D, user: UserRow, businesses: UserBusinessRow[], T: KarsaTheme): void {
  drawBevelPanel(ctx, 154, 40, 218, 138, T, { pad: 6 });
  const totalNw = Math.max(0, businesses.reduce((a, b) => a + b.value, 0) + user.balance - (user.pinjol_debt || 0));
  drawPixelText(ctx, "LAPAK & SIMPANAN", 162, 46, T.crema, T.ink, 1);
  drawPixelTextRight(ctx, `HARTA ${fmtRp(totalNw)}`, 364, 46, T.greenHi, T.ink, 1);
  drawDivider(ctx, 160, 56, 206, T);

  const kedaiLvl = businesses.find((x) => x.biz_type === "kedai_kopi")?.level ?? 1;
  businesses.slice(0, 3).forEach((b, idx) => {
    const ry = 61 + idx * 38;
    const cat = BUSINESS_CATALOG[b.biz_type];
    const isUnbought = b.level <= 0;
    const prereqMet = kedaiLvl >= (cat?.requiredKedaiLevel ?? 1) && user.karma >= (cat?.requiredKarma ?? 0);
    const isLocked = isUnbought && !prereqMet;
    const isReady = isUnbought && prereqMet;

    drawBevelPanel(ctx, 160, ry, 206, 34, T, {
      fill: isLocked ? T.inset : T.surfaceAlt,
      hi: isLocked ? T.shadow : isReady ? T.amber : T.highlight,
      lo: T.shadow,
      pad: 4,
    });
    drawInsetSlot(ctx, 165, ry + 5, 24, 24, T, { dither: true });
    drawSpriteV3(ctx, isLocked ? "segel_gembok_16" : SPRITE_BY_TYPE[b.biz_type] || "gerobak_kopi_16", 169, ry + 9, 1);

    if (isLocked) {
      const reqStr =
        b.biz_type === "saham_koperasi" && kedaiLvl >= 3 && user.karma < 65
          ? "SYARAT: NAMA BAIK 65"
          : (REQ_BY_TYPE[b.biz_type] ?? "BUKA DI KELOLA USAHA");
      drawPixelText(ctx, TITLE_BY_TYPE[b.biz_type] ?? "USAHA", 195, ry + 7, T.redHi, T.ink, 1);
      drawPixelText(ctx, reqStr, 195, ry + 19, T.amber, null, 1);
      drawPixelTextRight(ctx, fmtRp(0), 360, ry + 7, T.muted, T.ink, 1);
      drawPixelTextRight(ctx, "TERKUNCI", 360, ry + 19, T.muted, null, 1);
    } else if (isReady) {
      const openCost = user.karma >= 80 ? Math.round((cat?.baseCost ?? 2_000_000) * 0.85) : (cat?.baseCost ?? 2_000_000);
      drawPixelText(ctx, TITLE_BY_TYPE[b.biz_type] ?? "USAHA", 195, ry + 7, T.amberHi, T.ink, 1);
      drawPixelText(ctx, "KLIK KELOLA USAHA", 195, ry + 19, T.greenHi, null, 1);
      drawPixelTextRight(ctx, fmtRp(openCost), 360, ry + 7, T.amberHi, T.ink, 1);
      drawPixelTextRight(ctx, "SIAP BUKA", 360, ry + 19, T.greenHi, null, 1);
    } else {
      const isSealed = (user.is_seized === 1 || user.pinjol_debt > 0) && b.biz_type !== "brankas_darurat";
      const yldStr = isSealed ? "DISEGEL" : (cat ? cat.yieldLabel(b.level, b.daily_yield) : "+250 RB/HR").toUpperCase();
      drawPixelText(ctx, (b.name || cat?.name || "Kedai Kopi Karsa").toUpperCase().slice(0, 18), 195, ry + 7, T.crema, T.ink, 1);
      drawPixelText(
        ctx,
        (cat ? `LV.${b.level} • ${cat.subtitle}` : `LV.${b.level} • Gerobak`).toUpperCase().slice(0, 18),
        195,
        ry + 19,
        T.muted,
        null,
        1,
      );
      drawPixelTextRight(ctx, fmtRp(b.value), 360, ry + 7, T.amberHi, T.ink, 1);
      drawPixelTextRight(ctx, yldStr, 360, ry + 19, isSealed ? T.redHi : T.greenHi, null, 1);
    }
  });
}
