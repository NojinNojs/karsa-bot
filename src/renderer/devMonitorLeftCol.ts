import type { SKRSContext2D } from "@napi-rs/canvas";
import type { DeveloperTelemetry } from "../db/index.ts";
import { drawBevelPanel, drawInsetSlot, type KarsaTheme, R } from "./designSpec.ts";
import { drawPixelText, drawPixelTextCentered, drawPixelTextRight } from "./pixelFont.ts";

export function drawDevMonitorLeftCol(ctx: SKRSContext2D, telemetry: DeveloperTelemetry, T: KarsaTheme): void {
  drawBevelPanel(ctx, 12, 40, 136, 48, T, { pad: 6 });
  drawPixelText(ctx, "KONTAINER DOCKER", 18, 46, T.muted, T.ink, 1);
  drawPixelText(ctx, `${telemetry.containerVcpu} VCPU`, 18, 57, T.amberHi, T.ink, 1);
  drawPixelTextRight(ctx, `LOAD ${telemetry.cpuLoadPct}%`, 142, 57, T.greenHi, T.ink, 1);
  drawBevelPanel(ctx, 18, 67, 124, 15, T, { fill: T.greenLo, hi: T.greenHi, lo: T.ink, pad: 2 });
  drawPixelTextCentered(ctx, `LIMIT ${telemetry.containerRamLimitMb} MB RAM`, 18, 67, 124, 15, T.crema, T.ink, 1);

  drawBevelPanel(ctx, 12, 94, 136, 36, T, { pad: 6 });
  drawPixelText(ctx, `SQLITE ${telemetry.dbSizeKb} • ${telemetry.totalLogs} LOG`, 18, 100, T.muted, T.ink, 1);
  drawPixelText(ctx, `${telemetry.totalUsers} WARGA`, 18, 113, T.crema, T.ink, 1);
  drawPixelTextRight(ctx, `${telemetry.activeBizCount} USAHA`, 142, 113, T.amberHi, T.ink, 1);

  const ramPct = telemetry.containerRamPct;
  drawBevelPanel(ctx, 12, 136, 136, 42, T, { pad: 6 });
  drawPixelText(ctx, `RAM ${telemetry.containerRamUsedMb}/${telemetry.containerRamLimitMb}MB`, 18, 142, T.muted, T.ink, 1);
  drawPixelTextRight(ctx, `${ramPct}%`, 142, 142, ramPct >= 85 ? T.redHi : T.greenHi, T.ink, 1);
  drawInsetSlot(ctx, 18, 152, 122, 10, T, { pad: 2 });
  const segs = Math.round(Math.max(0, Math.min(100, ramPct)) / 10);
  for (let i = 0; i < 10; i++) {
    const sx = 20 + i * 12;
    if (i < segs) {
      R(ctx, sx, 154, 10, 6, ramPct >= 85 ? T.red : T.green);
      R(ctx, sx, 154, 10, 1, ramPct >= 85 ? T.redHi : T.greenHi);
    } else {
      R(ctx, sx, 154, 10, 6, T.insetLo);
    }
  }
  drawPixelText(ctx, `HEAP ${telemetry.memoryHeapMb}MB`, 18, 165, T.greenHi, T.ink, 1);
  drawPixelTextRight(ctx, `UP ${telemetry.uptimeShort}`, 142, 165, T.amberHi, T.ink, 1);
}
