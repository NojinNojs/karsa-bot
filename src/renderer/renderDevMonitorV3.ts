import type { DeveloperTelemetry } from "../db/index.ts";
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
} from "./designSpec.ts";
import { drawDevMonitorLeftCol } from "./devMonitorLeftCol.ts";
import { drawPixelText, drawPixelTextCentered, drawPixelTextRight } from "./pixelFont.ts";
import { drawSpriteV3 } from "./spritesV3.ts";

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

  drawBevelPanel(ctx, 250, 15, 116, 16, T, { fill: T.greenLo, hi: T.greenHi, lo: T.ink, pad: 2 });
  drawPixelTextCentered(ctx, `PING ${Math.max(1, Math.round(wsPingMs))}MS • LIVE`, 250, 15, 116, 16, T.crema, T.ink, 1);

  drawDevMonitorLeftCol(ctx, telemetry, T);

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
  drawPixelText(ctx, `DOCKER AKTIF • ${telemetry.marketTitleClean}`.slice(0, 44), 66, 191, T.crema, null, 1);

  return exportUpscaledPng(canvas);
}
