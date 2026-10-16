import type { SKRSContext2D } from "@napi-rs/canvas";

/**
 * Bold 24x22 Side-Profile Kopi Karsa Mug Motif (designed on a 32x32 icon grid
 * so it fills ~70% of Discord's circular avatar and reads crystal-clear even
 * at 32x32 and 40x40 in chat!).
 */
export function drawSideMugMotif(ctx: SKRSContext2D, ox: number, oy: number, s = 1): void {
  const P: Record<string, string> = {
    k: "#0B080E", // crisp ink outline
    s: "#FFFDF7", // bright warm steam
    S: "#D8C8B8", // secondary steam
    c: "#FFF6E6", // ceramic bright left highlight
    C: "#F2DEC4", // ceramic warm cream body
    d: "#D4B896", // ceramic right shadow
    y: "#FFF7C2", // gold band specular
    Y: "#FFD452", // amber gold band
    g: "#E09628", // warm gold mid-shadow
    G: "#9E5818", // deep bronze shadow
    e: "#6E3B26", // roasted coffee bean highlight
    E: "#3A1F18", // dark roasted coffee bean body
    w: "#E69D52", // sunlit teak coaster highlight
    W: "#B86B32", // warm teak coaster body
    m: "#7D4020", // mahogany coaster shadow
  };

  const rows = [
    ".......ss....SS.........", // 0
    "......sS....sS..........", // 1
    "......s.....s...........", // 2
    ".......sS....sS.........", // 3
    "..kkkkkkkkkkkkkkkk......", // 4: wide top rim outline
    ".kccccccccCCCCCCCdk.....", // 5: bright ceramic lip
    ".kccCCCCCCCCCCCCddk.....", // 6: upper rim
    ".kggYYYYYYYYYYYYgGk.....", // 7: warm amber-gold collar band
    ".kccCCCCCCCCCCCCddkkkk..", // 8: handle top join
    ".kccCCCkkkkkkCCCddkccck.", // 9: handle top bar + bean top outline
    ".kccCCkeEEkEEkCCddkckkck", // 10: coffee bean emblem row 1 + clean handle hole
    ".kccCCkeEkEEEkCCddkckkck", // 11: coffee bean emblem row 2
    ".kccCCkEEkEEEkCCddkckkck", // 12: coffee bean emblem row 3
    ".kccCCkEEkEEekCCddkckkck", // 13: coffee bean emblem row 4
    ".kccCCCkkkkkkCCCddkccck.", // 14: handle bottom bar + bean bottom outline
    ".kccCCCCCCCCCCCCddkkkk..", // 15: handle bottom join
    ".kccCCCCCCCCCCCCddk.....", // 16: lower body
    "..kccCCCCCCCCCCddk......", // 17: tapered base
    "...kddddddddddddk.......", // 18: mug bottom shadow
    ".kkkkkkkkkkkkkkkkkk.....", // 19: wooden coaster top outline
    "kwwwwwWWWWWWWWmmmmmk....", // 20: wooden coaster body
    ".kkkkkkkkkkkkkkkkkk.....", // 21: wooden coaster bottom outline
  ];

  for (let r = 0; r < rows.length; r++) {
    const line = rows[r]!;
    for (let col = 0; col < line.length; col++) {
      const ch = line[col]!;
      if (ch === ".") continue;
      const color = P[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect((ox + col * s) | 0, (oy + r * s) | 0, s | 0, s | 0);
    }
  }
}
