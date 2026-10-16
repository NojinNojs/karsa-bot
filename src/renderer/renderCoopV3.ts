import type { ServerCoopRow } from "../db/index.ts";
import {
  CANVAS_H,
  CANVAS_W,
  createSurface,
  drawBevelPanel,
  drawCanvasBackdrop,
  drawDivider,
  drawInsetSlot,
  exportUpscaledPng,
  fmtRp,
  R,
  WARM_KOPI_THEME,
} from "./designSpec.ts";
import { drawPixelText, drawPixelTextCentered, drawPixelTextRight } from "./pixelFont.ts";
import { drawSpriteV3, type SpriteV3Name } from "./spritesV3.ts";

export function renderCoopV3(coop: ServerCoopRow): Buffer {
  const T = WARM_KOPI_THEME;
  const { canvas, ctx } = createSurface(CANVAS_W, CANVAS_H);

  drawCanvasBackdrop(ctx, T, CANVAS_W, CANVAS_H);

  // Header Bar
  drawBevelPanel(ctx, 12, 12, 360, 22, T, {
    fill: T.surface,
    hi: T.amber,
    lo: T.amberLo,
    accentTop: T.amberHi,
    headerDither: true,
    pad: 5,
  });
  drawSpriteV3(ctx, "koin_12", 18, 17, 1);
  drawPixelText(ctx, "KARSA • KOPERASI PEDAGANG", 34, 20, T.amberHi, T.ink, 1);

  const isHealthy = coop.eco_health >= 80;
  drawBevelPanel(ctx, 250, 15, 116, 16, T, {
    fill: isHealthy ? T.greenLo : T.amberLo,
    hi: isHealthy ? T.greenHi : T.amberHi,
    lo: T.ink,
    pad: 2,
  });
  drawPixelTextCentered(
    ctx,
    isHealthy ? `PASAR SEHAT ${coop.eco_health}%` : "PASAR RINTISAN",
    250,
    15,
    116,
    16,
    T.crema,
    T.ink,
    1,
  );

  const rawContribs = coop.contributors || [];
  let sortedContributors: Array<{ name: string; role: string; totalRp: number; warungSaved: number }> = [];
  if (Array.isArray(rawContribs) && rawContribs.length > 0) {
    sortedContributors = [...rawContribs]
      .filter((c) => c && typeof c.totalRp === "number" && c.totalRp > 0)
      .sort((a, b) => b.totalRp - a.totalRp);
  } else {
    try {
      const rawJson = (coop as ServerCoopRow & { contributors_json?: string }).contributors_json;
      const parsed = JSON.parse(rawJson || "[]");
      if (Array.isArray(parsed)) {
        sortedContributors = parsed
          .filter((c) => c && typeof c.totalRp === "number" && c.totalRp > 0)
          .sort((a, b) => b.totalRp - a.totalRp);
      } else if (parsed && typeof parsed === "object") {
        sortedContributors = Object.entries(parsed as Record<string, number>)
          .filter(([, amount]) => typeof amount === "number" && amount > 0)
          .sort((a, b) => b[1] - a[1])
          .map(([name, totalRp]) => ({ name, role: "MITRA AKTIF", totalRp, warungSaved: 0 }));
      }
    } catch {
      sortedContributors = [];
    }
  }

  // Left Column
  drawBevelPanel(ctx, 12, 40, 136, 48, T, { pad: 6 });
  drawInsetSlot(ctx, 18, 46, 28, 28, T, { dither: true });
  drawSpriteV3(ctx, "celengan_warga_16", 24, 52, 1);
  drawPixelText(ctx, "KAS BERSAMA", 52, 47, T.muted, T.ink, 1);
  drawPixelText(ctx, fmtRp(coop.pool_balance), 52, 58, T.amberHi, T.ink, 1);
  drawBevelPanel(ctx, 52, 67, 90, 15, T, {
    fill: T.greenLo,
    hi: T.greenHi,
    lo: T.ink,
    pad: 2,
  });
  drawPixelTextCentered(ctx, `${sortedContributors.length} MITRA AKTIF`, 52, 67, 90, 15, T.crema, T.ink, 1);

  drawBevelPanel(ctx, 12, 94, 136, 36, T, { pad: 6 });
  drawPixelText(ctx, "GEROBAK DITEBUS", 18, 100, T.muted, T.ink, 1);
  drawSpriteV3(ctx, "gerobak_kopi_16", 18, 110, 1);
  drawPixelText(ctx, `${coop.rescued_count} WARUNG SELAMAT`, 38, 114, T.greenHi, T.ink, 1);

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
  const marketLabel = isHealthy ? "SEHAT" : "RINTISAN";
  const rentLabel = isHealthy ? "SEWA -15%" : "SEWA NORMAL";
  drawPixelText(ctx, marketLabel, 18, 165, isHealthy ? T.greenHi : T.amber, T.ink, 1);
  drawPixelTextRight(ctx, rentLabel, 142, 165, T.amberHi, T.ink, 1);

  // Right Column: Top Contributors
  drawBevelPanel(ctx, 154, 40, 218, 138, T, { pad: 6 });
  drawPixelText(ctx, "PENYUMBANG UTAMA", 162, 46, T.crema, T.ink, 1);
  drawPixelTextRight(ctx, `LV.${coop.eco_level} • BAGI HASIL`, 364, 46, T.greenHi, T.ink, 1);
  drawDivider(ctx, 160, 56, 206, T);

  const rankIcons: readonly SpriteV3Name[] = ["barista_16", "emas_batangan_16", "celengan_warga_16"];

  for (let idx = 0; idx < 3; idx++) {
    const ry = 61 + idx * 38;
    const contrib = sortedContributors[idx];
    const isEmpty = !contrib;

    drawBevelPanel(ctx, 160, ry, 206, 34, T, {
      fill: isEmpty ? T.inset : T.surfaceAlt,
      hi: isEmpty ? T.shadow : T.highlight,
      lo: T.shadow,
      pad: 4,
    });
    drawInsetSlot(ctx, 165, ry + 5, 24, 24, T, { dither: true });
    drawSpriteV3(ctx, rankIcons[idx] ?? "celengan_warga_16", 169, ry + 9, 1);

    if (isEmpty) {
      drawPixelText(ctx, `${idx + 1}. LOWONG`, 195, ry + 7, T.muted, T.ink, 1);
      drawPixelText(ctx, "BELUM ADA PATUNGAN", 195, ry + 19, T.muted, null, 1);
      drawPixelTextRight(ctx, "RP 0", 360, ry + 7, T.muted, T.ink, 1);
      drawPixelTextRight(ctx, "KOSONG", 360, ry + 19, T.muted, null, 1);
    } else {
      const label = (contrib.name || "WARGA").toUpperCase().slice(0, 12);
      const roleStr = (contrib.role || "MITRA AKTIF").toUpperCase().slice(0, 16);
      const rightTag =
        contrib.warungSaved > 0 ? `${contrib.warungSaved} TEBUS` : idx === 0 ? "PELOPOR" : "AKTIF";
      drawPixelText(ctx, `${idx + 1}. ${label}`, 195, ry + 7, T.crema, T.ink, 1);
      drawPixelText(ctx, roleStr, 195, ry + 19, T.muted, null, 1);
      drawPixelTextRight(ctx, fmtRp(contrib.totalRp), 360, ry + 7, T.amberHi, T.ink, 1);
      drawPixelTextRight(ctx, rightTag, 360, ry + 19, T.greenHi, null, 1);
    }
  }

  // Footer
  drawBevelPanel(ctx, 12, 184, 360, 20, T, { pad: 6 });
  drawPixelText(ctx, "PATUNGAN:", 18, 191, T.amber, T.ink, 1);
  drawPixelText(ctx, "IURAN MODAL & TEBUS GEROBAK WARGA DISITA", 80, 191, T.crema, null, 1);

  return exportUpscaledPng(canvas, 3);
}
