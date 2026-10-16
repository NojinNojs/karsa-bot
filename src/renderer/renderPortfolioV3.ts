import type { ServerCoopRow, UserBusinessRow, UserRow } from "../db/index.ts";
import { BUSINESS_CATALOG } from "../game/mechanics.ts";
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
  SKIN_THEMES_V3,
  WARM_KOPI_THEME,
} from "./designSpec.ts";
import { drawPixelText, drawPixelTextCentered, drawPixelTextRight } from "./pixelFont.ts";
import { drawSpriteV3, type SpriteV3Name } from "./spritesV3.ts";

export { fmtJt, fmtRp };

export interface PortfolioV3Input {
  user: UserRow;
  businesses: UserBusinessRow[];
  coop: ServerCoopRow;
  overrideSkin?: string;
}

export function renderPortfolioV3(input: PortfolioV3Input): Buffer {
  const { user, businesses, coop, overrideSkin } = input;
  const skinKey = overrideSkin || user.skin_id || "retro_gold";
  const T = SKIN_THEMES_V3[skinKey] ?? WARM_KOPI_THEME;
  const { canvas, ctx } = createSurface(CANVAS_W, CANVAS_H);

  // 1. Backdrop (OUTER_MARGIN = 12 -> playable area x=12..372, y=12..204, w=360, h=192)
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
  drawPixelText(ctx, "KARSA • CATATAN USAHA", 34, 20, T.amberHi, T.ink, 1);

  // Right Header Badge (x=250, y=15, w=116, h=16)
  drawBevelPanel(ctx, 250, 15, 116, 16, T, {
    fill: T.greenLo,
    hi: T.greenHi,
    lo: T.ink,
    pad: 2,
  });
  drawPixelTextCentered(ctx, `PASAR MALAM • LV.${coop.eco_level}`, 250, 15, 116, 16, T.crema, T.ink, 1);

  // 3. Left Column (x=12, w=136) — 3 stacked panels with exact 6px vertical gaps:
  //    Panel L1 (Profile): y=40, h=48  (40..88)
  //    Panel L2 (Cash):    y=94, h=36  (94..130)
  //    Panel L3 (Reputasi):y=136, h=42 (136..178)

  // L1: Profile Box (x=12, y=40, w=136, h=48)
  drawBevelPanel(ctx, 12, 40, 136, 48, T, { pad: 6 });
  drawInsetSlot(ctx, 18, 46, 28, 28, T, { dither: true });
  drawSpriteV3(ctx, "barista_16", 24, 52, 1);
  drawPixelTextCentered(ctx, `LV.${user.level}`, 18, 76, 28, 9, T.muted, null, 1);

  const uname = (user.username || "AQSAN").toUpperCase().slice(0, 10);
  drawPixelText(ctx, uname, 52, 47, T.crema, T.ink, 1);
  drawPixelText(ctx, (user.job_title || "PERACIK UTAMA").slice(0, 14), 52, 57, T.cyan, T.ink, 1);

  drawBevelPanel(ctx, 52, 67, 90, 15, T, {
    fill: T.amberLo,
    hi: T.amberHi,
    lo: T.ink,
    pad: 2,
  });
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

  // L2: Cash Box (x=12, y=94, w=136, h=36)
  drawBevelPanel(ctx, 12, 94, 136, 36, T, { pad: 6 });
  drawPixelText(ctx, "LACI KAS", 18, 100, T.muted, T.ink, 1);
  drawSpriteV3(ctx, "koin_12", 18, 111, 1);
  drawPixelText(ctx, fmtRp(user.balance), 33, 114, T.amberHi, T.ink, 1);

  drawInsetSlot(ctx, 102, 109, 40, 15, T);
  drawSpriteV3(ctx, "bintang_12", 105, 111, 1);
  drawPixelText(ctx, `X${user.gems}`, 120, 113, T.amber, T.ink, 1);

  // L3: Reputation Box (x=12, y=136, w=136, h=42)
  drawBevelPanel(ctx, 12, 136, 136, 42, T, { pad: 6 });
  drawPixelText(ctx, "NAMA BAIK", 18, 142, T.muted, T.ink, 1);
  drawPixelTextRight(ctx, `${user.karma}/100`, 142, 142, T.greenHi, T.ink, 1);

  // 10-segment bar (x=18, y=152, w=124, h=10)
  drawInsetSlot(ctx, 18, 152, 122, 10, T, { pad: 2 });
  const segs = Math.round(Math.max(0, Math.min(100, user.karma)) / 10);
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

  const hasDebt = user.pinjol_debt > 0 || user.is_seized === 1;
  const leftStatus = hasDebt ? "TUNGGAKAN" : "AMAN";
  const rightStatus = hasDebt ? fmtRp(user.pinjol_debt) : user.karma >= 80 ? "SEWA -15%" : "SEWA NORMAL";
  drawPixelText(ctx, leftStatus, 18, 165, hasDebt ? T.redHi : T.greenHi, T.ink, 1);
  drawPixelTextRight(ctx, rightStatus, 142, 165, hasDebt ? T.amberHi : T.amberHi, T.ink, 1);

  // 4. Right Column: Assets & Savings (x=154, y=40, w=218, h=138) — exact 6px gap from Left Column
  drawBevelPanel(ctx, 154, 40, 218, 138, T, { pad: 6 });
  const totalNw = Math.max(
    0,
    businesses.reduce((a, b) => a + b.value, 0) + user.balance - (user.pinjol_debt || 0),
  );
  drawPixelText(ctx, "LAPAK & SIMPANAN", 162, 46, T.crema, T.ink, 1);
  drawPixelTextRight(ctx, `HARTA ${fmtRp(totalNw)}`, 364, 46, T.greenHi, T.ink, 1);
  drawDivider(ctx, 160, 56, 206, T);

  const spriteByType: Record<string, SpriteV3Name> = {
    kedai_kopi: "gerobak_kopi_16",
    brankas_darurat: "emas_batangan_16",
    saham_koperasi: "celengan_warga_16",
  };

  const lockedTitleByType: Record<string, string> = {
    kedai_kopi: "KEDAI KOPI",
    brankas_darurat: "TABUNGAN EMAS",
    saham_koperasi: "KOPERASI WARGA",
  };

  const lockRequirementByType: Record<string, string> = {
    kedai_kopi: "BUKA DI /BISNIS",
    brankas_darurat: "SYARAT: KEDAI LV.2",
    saham_koperasi: "SYARAT: KEDAI LV.3",
  };

  const kedaiLvl = businesses.find((x) => x.biz_type === "kedai_kopi")?.level ?? 1;

  businesses.slice(0, 3).forEach((b, idx) => {
    const ry = 61 + idx * 38; // y = 61, 99, 137 (each h=34, gap=4px, bottom=171 -> 7px pad inside 178)
    const cat = BUSINESS_CATALOG[b.biz_type];
    const isUnbought = b.level <= 0;
    const reqKedai = cat?.requiredKedaiLevel ?? 1;
    const reqKarma = cat?.requiredKarma ?? 0;
    const prereqMet = kedaiLvl >= reqKedai && user.karma >= reqKarma;
    const isReallyLocked = isUnbought && !prereqMet;
    const isReadyToOpen = isUnbought && prereqMet;

    drawBevelPanel(ctx, 160, ry, 206, 34, T, {
      fill: isReallyLocked ? T.inset : T.surfaceAlt,
      hi: isReallyLocked ? T.shadow : isReadyToOpen ? T.amber : T.highlight,
      lo: T.shadow,
      pad: 4,
    });

    // 24x24 Icon Slot (x=165, y=ry+5)
    drawInsetSlot(ctx, 165, ry + 5, 24, 24, T, { dither: true });
    const iconName: SpriteV3Name = isReallyLocked
      ? "segel_gembok_16"
      : spriteByType[b.biz_type] || "gerobak_kopi_16";
    drawSpriteV3(ctx, iconName, 169, ry + 9, 1);

    if (isReallyLocked) {
      const lockedTitle =
        lockedTitleByType[b.biz_type] ?? (b.name || cat?.name || "USAHA").toUpperCase().slice(0, 15);
      const reqStr =
        b.biz_type === "saham_koperasi" && kedaiLvl >= 3 && user.karma < 65
          ? "SYARAT: NAMA BAIK 65"
          : (lockRequirementByType[b.biz_type] ?? "BUKA DI KELOLA USAHA");
      drawPixelText(ctx, lockedTitle, 195, ry + 7, T.redHi, T.ink, 1);
      drawPixelText(ctx, reqStr, 195, ry + 19, T.amber, null, 1);
      drawPixelTextRight(ctx, fmtRp(0), 360, ry + 7, T.muted, T.ink, 1);
      drawPixelTextRight(ctx, "TERKUNCI", 360, ry + 19, T.muted, null, 1);
    } else if (isReadyToOpen) {
      const openTitle =
        lockedTitleByType[b.biz_type] ?? (b.name || cat?.name || "USAHA").toUpperCase().slice(0, 15);
      const rawOpenCost = cat?.baseCost ?? 2_000_000;
      const openCost = user.karma >= 80 ? Math.round(rawOpenCost * 0.85) : rawOpenCost;
      drawPixelText(ctx, openTitle, 195, ry + 7, T.amberHi, T.ink, 1);
      drawPixelText(ctx, "KLIK KELOLA USAHA", 195, ry + 19, T.greenHi, null, 1);
      drawPixelTextRight(ctx, fmtRp(openCost), 360, ry + 7, T.amberHi, T.ink, 1);
      drawPixelTextRight(ctx, "SIAP BUKA", 360, ry + 19, T.greenHi, null, 1);
    } else {
      const title = (b.name || cat?.name || "Kedai Kopi Karsa").toUpperCase().slice(0, 18);
      const sub = (cat ? `LV.${b.level} • ${cat.subtitle}` : `LV.${b.level} • Gerobak`)
        .toUpperCase()
        .slice(0, 18);
      const valStr = fmtRp(b.value);
      const isBizSealed = (user.is_seized === 1 || user.pinjol_debt > 0) && b.biz_type !== "brankas_darurat";
      const yldStr = isBizSealed
        ? "DISEGEL"
        : (cat ? cat.yieldLabel(b.level, b.daily_yield) : "+250 RB/HR").toUpperCase();

      drawPixelText(ctx, title, 195, ry + 7, T.crema, T.ink, 1);
      drawPixelText(ctx, sub, 195, ry + 19, T.muted, null, 1);
      drawPixelTextRight(ctx, valStr, 360, ry + 7, T.amberHi, T.ink, 1);
      drawPixelTextRight(ctx, yldStr, 360, ry + 19, isBizSealed ? T.redHi : T.greenHi, null, 1);
    }
  });

  // 5. Bottom Footer Bar (x=12, y=184, w=360, h=20) — exact 6px gap below columns
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

export { type AzabV3Input, renderAzabV3 } from "./renderAzabV3.ts";
export { renderCoopV3 } from "./renderCoopV3.ts";
