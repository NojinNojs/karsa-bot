import type { SKRSContext2D } from "@napi-rs/canvas";
import { SPRITES_V3_PART1 } from "./spritesV3Data1.ts";
import { SPRITES_V3_PART2 } from "./spritesV3Data2.ts";
import { SPRITES_V3_PART3 } from "./spritesV3Data3.ts";
import { KARSA_V3_PALETTE, type SpriteV3Def, type SpriteV3Name } from "./spritesV3Palette.ts";

export { KARSA_V3_PALETTE, type SpriteV3Def, type SpriteV3Name };
export const SPRITES_V3 = { ...SPRITES_V3_PART1, ...SPRITES_V3_PART2, ...SPRITES_V3_PART3 } as Record<SpriteV3Name, SpriteV3Def>;

export function assertSpritesV3Valid(): void {
  for (const [name, def] of Object.entries(SPRITES_V3)) {
    if (def.map.length !== def.height) throw new Error(`[SpritesV3] ${name}: expected ${def.height} rows`);
    for (let r = 0; r < def.map.length; r++) {
      if (def.map[r]!.length !== def.width) throw new Error(`[SpritesV3] ${name} row ${r}: expected width ${def.width}`);
    }
  }
}

export function drawSpriteV3(ctx: SKRSContext2D, name: SpriteV3Name, x: number, y: number, scale = 1): void {
  const def = SPRITES_V3[name];
  if (!def) return;
  const s = Math.max(1, Math.round(scale));
  const bx = Math.round(x);
  const by = Math.round(y);
  for (let ry = 0; ry < def.height; ry++) {
    const row = def.map[ry]!;
    for (let rx = 0; rx < def.width; rx++) {
      const ch = row[rx]!;
      if (ch === ".") continue;
      const hex = def.pal[ch] ?? KARSA_V3_PALETTE[ch];
      if (!hex) continue;
      ctx.fillStyle = hex;
      ctx.fillRect(bx + rx * s, by + ry * s, s, s);
    }
  }
}
