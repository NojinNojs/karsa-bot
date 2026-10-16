import {
  CANVAS_H,
  CANVAS_W,
  CYBER_KOPI_THEME,
  createSurface,
  drawBevelPanel,
  drawCanvasBackdrop,
  drawDivider,
  drawInsetSlot,
  exportUpscaledPng,
  fmtRp,
  R,
} from "./designSpec.ts";
import {
  drawPixelText,
  drawPixelTextCentered,
  drawPixelTextRight,
} from "./pixelFont.ts";
import { drawSpriteV3 } from "./spritesV3.ts";
import type { DeveloperTelemetry } from "../db/index.ts";

export function renderDevMonitorV3(telemetry: DeveloperTelemetry, wsPingMs = 42): Buffer {
  const T = CYBER_KOPI_THEME;
  const { canvas, ctx } = createSurface(CANVAS_W, CANVAS_H);

  drawCanvasBackdrop(ctx, T, CANVAS_W, CANVAS_H);

  // 1. Top Header Bar (x=12, y=12, w=360, h=22)
  drawBevelPanel(ctx, 12, 12, 360, 22, T, {
    fill: T.surface,
    hi: T.amber,
    lo: T.amberLo,
    accentTop: T.amberHi,
    headerDither: true,
    pad: 5,
  });
  drawSpriteV3(ctx, "koin_12", 18, 17, 1);
  drawPixelText(ctx, "KARSA • DEV OPS MONITOR", 34, 20, T.amberHi, T.ink, 1);

  drawBevelPanel(ctx, 250, 15, 116, 16, T, {
    fill: T.greenLo,
    hi: T.greenHi,
    lo: T.ink,
    pad: 2,
  });
  drawPixelTextCentered(
    ctx,
    `PING ${Math.max(1, Math.round(wsPingMs))}MS • LIVE`,
    250,
    15,
    116,
    16,
    T.crema,
    T.ink,
    1
  );

  // 2. Left Column (x=12, y=40, w=136)
  // L1: Runtime & Memory (y=40, h=48)
  drawBevelPanel(ctx, 12, 40, 136, 48, T, { pad: 6 });
  drawPixelText(ctx, "ENGINE & RUNTIME", 18, 46, T.muted, T.ink, 1);
  drawPixelText(ctx, `RAM ${telemetry.memoryRssMb} MB`, 18, 57, T.amberHi, T.ink, 1);
  drawPixelTextRight(ctx, `UP ${telemetry.uptimeShort}`, 142, 57, T.greenHi, T.ink, 1);

  drawBevelPanel(ctx, 18, 67, 124, 15, T, {
    fill: T.greenLo,
    hi: T.greenHi,
    lo: T.ink,
    pad: 2,
  });
  drawPixelTextCentered(
    ctx,
    telemetry.marketOverride ? "CUACA: MANUAL" : "CUACA: OTOMATIS",
    18,
    67,
    124,
    15,
    T.crema,
    T.ink,
    1
  );

  // L2: Database Entities (y=94, h=36)
  drawBevelPanel(ctx, 12, 94, 136, 36, T, { pad: 6 });
  drawPixelText(ctx, "DATABASE SQLITE WAL", 18, 100, T.muted, T.ink, 1);
  drawPixelText(ctx, `${telemetry.totalUsers} WARGA`, 18, 113, T.crema, T.ink, 1);
  drawPixelTextRight(ctx, `${telemetry.totalLogs} LOG`, 142, 113, T.amberHi, T.ink, 1);

  // L3: Market Health & Seizures (y=136, h=42)
  drawBevelPanel(ctx, 12, 136, 136, 42, T, { pad: 6 });
  drawPixelText(ctx, "AVG NAMA BAIK", 18, 142, T.muted, T.ink, 1);
  drawPixelTextRight(ctx, `${telemetry.avgKarma}/100`, 142, 142, T.greenHi, T.ink, 1);
  drawInsetSlot(ctx, 18, 152, 122, 10, T, { pad: 2 });
  const segs = Math.round(Math.max(0, Math.min(100, telemetry.avgKarma)) / 10);
  for (let i = 0; i < 10; i++) {
    const sx = 20 + i * 12;
    if (i < segs) {
      R(ctx, sx, 154, 10, 6, T.green);
      R(ctx, sx, 154, 10, 1, T.greenHi);
    } else {
      R(ctx, sx, 154, 10, 6, T.insetLo);
    }
  }
  drawPixelText(ctx, `SEGEL: ${telemetry.seizedCount}`, 18, 165, telemetry.seizedCount > 0 ? T.redHi : T.greenHi, T.ink, 1);
  drawPixelTextRight(ctx, `PASAR LV.${telemetry.coopLevel}`, 142, 165, T.amberHi, T.ink, 1);

  // 3. Right Column: Macro Money Supply M1/M2 (x=154, y=40, w=218, h=138)
  drawBevelPanel(ctx, 154, 40, 218, 138, T, { pad: 6 });
  drawPixelText(ctx, "SUPLAI EKONOMI SERVER", 162, 46, T.crema, T.ink, 1);
  drawPixelTextRight(ctx, `M2 ${fmtRp(telemetry.totalNetWorth)}`, 364, 46, T.greenHi, T.ink, 1);
  drawDivider(ctx, 160, 56, 206, T);

  const macroRows = [
    {
      title: "KAS & EMAS WARGA",
      sub: `KAS ${fmtRp(telemetry.totalCash)}`,
      val: fmtRp(telemetry.totalCash + telemetry.totalEmergency),
      rightSub: `EMAS ${fmtRp(telemetry.totalEmergency)}`,
      icon: "emas_batangan_16" as const,
      ok: true,
    },
    {
      title: "ASET & KOPERASI",
      sub: `${telemetry.activeBizCount} UNIT AKTIF`,
      val: fmtRp(telemetry.totalBizValue),
      rightSub: `POOL ${fmtRp(telemetry.coopPool)}`,
      icon: "gerobak_kopi_16" as const,
      ok: true,
    },
    {
      title: "TUNGGAKAN SEGEL",
      sub: `${telemetry.seizedCount} LAPAK DISEGEL`,
      val: fmtRp(telemetry.totalDebt),
      rightSub: telemetry.totalDebt > 0 ? "ADA UTANG" : "0 UTANG",
      icon: "segel_gembok_16" as const,
      ok: telemetry.totalDebt === 0,
    },
  ];

  macroRows.forEach((r, idx) => {
    const ry = 61 + idx * 38;
    drawBevelPanel(ctx, 160, ry, 206, 34, T, {
      fill: T.surfaceAlt,
      hi: T.highlight,
      lo: T.shadow,
      pad: 4,
    });
    drawInsetSlot(ctx, 165, ry + 5, 24, 24, T, { dither: true });
    drawSpriteV3(ctx, r.icon, 169, ry + 9, 1);

    drawPixelText(ctx, r.title.slice(0, 19), 195, ry + 7, T.crema, T.ink, 1);
    drawPixelText(ctx, r.sub.slice(0, 17), 195, ry + 19, T.muted, null, 1);
    drawPixelTextRight(ctx, r.val, 360, ry + 7, r.ok ? T.amberHi : T.redHi, T.ink, 1);
    drawPixelTextRight(ctx, r.rightSub, 360, ry + 19, r.ok ? T.greenHi : T.redHi, null, 1);
  });

  // 4. Bottom Footer Bar (x=12, y=184, w=360, h=20)
  drawBevelPanel(ctx, 12, 184, 360, 20, T, { pad: 6 });
  drawPixelText(ctx, "STATUS:", 18, 191, T.amber, T.ink, 1);
  drawPixelText(
    ctx,
    `DOCKER AKTIF • ${telemetry.marketTitleClean}`.slice(0, 44),
    66,
    191,
    T.crema,
    null,
    1
  );

  return exportUpscaledPng(canvas);
}
