import type { SKRSContext2D } from "@napi-rs/canvas";

export type SpriteV3Name =
  | "coffee_cup_24"
  | "barista_16"
  | "gerobak_kopi_16"
  | "emas_batangan_16"
  | "celengan_warga_16"
  | "segel_gembok_16"
  | "koin_12"
  | "bintang_12";

export interface SpriteV3Def {
  width: number;
  height: number;
  map: string[];
  pal: Record<string, string>;
}

/**
 * Unified KARSA V3 Palette (Warm Espresso & Amber Gold)
 * - 1px dark outline: #0F0B14
 * - Top-left light source
 * - Hand-shifted warm highlights & cool/deep espresso shadows
 */
export const KARSA_V3_PALETTE: Record<string, string> = {
  // Outline
  k: "#0F0B14",

  // Steam & Specular Highlights
  s: "#FFFDF7", // pure warm steam / specular highlight
  S: "#E8D8C8", // soft steam wisp / secondary sheen

  // Warm Ceramic / Cream / Parchment
  c: "#FFF6E6", // ceramic bright highlight (top-left)
  C: "#F2DEC4", // ceramic body midtone
  d: "#D4B896", // ceramic warm shadow
  D: "#A6866A", // ceramic deep rim shadow (bottom-right)

  // Rich Espresso & Crema
  e: "#3A1F18", // dark roasted espresso
  E: "#6E3B26", // rich crema midtone
  l: "#C87D46", // golden crema swirl
  L: "#FFE8C8", // latte art heart/leaf foam

  // Warm Teak / Mahogany Wood & Saucer
  w: "#E69D52", // sunlit wood highlight
  W: "#B86B32", // warm teak wood body
  m: "#7D4020", // mahogany shadow
  M: "#4D2312", // deep espresso wood shade

  // Amber Gold / Brass / Bullion
  y: "#FFF7C2", // gleaming gold specular
  Y: "#FFD452", // bright amber gold
  g: "#E09628", // warm gold mid-shadow
  G: "#9E5818", // deep bronze-gold shadow

  // Warm Olive Barista Apron & Leaf Accent
  o: "#9AE68A", // sunlit olive-sage highlight
  O: "#52B868", // barista olive-emerald midtone
  v: "#297A48", // deep olive-forest shadow
  V: "#164730", // dark pine shade

  // Terracotta / Crimson Seal & Awning
  r: "#FF7A7A", // bright coral-red highlight
  R: "#E63E4A", // crimson seal / awning red
  z: "#9E1E2E", // deep maroon shadow

  // Warm Skin & Hair (Aqsan)
  p: "#FFE0BA", // sunlit warm skin
  P: "#E0A878", // skin mid-shadow
  h: "#4A2A22", // dark espresso hair highlight
  H: "#261414", // deep hair shade

  // Heavy Iron / Steel (Padlock & Hardware)
  i: "#D0D8E8", // steel top-left highlight
  I: "#8A96AD", // brushed iron midtone
  j: "#525B70", // dark iron shadow
  J: "#2E3342", // deep gunmetal shade
};

export const SPRITES_V3: Record<SpriteV3Name, SpriteV3Def> = {
  /**
   * 1. coffee_cup_24 (24x24 centerpiece icon for the KARSA Avatar)
   * Warm ceramic mug on a wooden saucer, rich dark crema, latte art heart,
   * and rising twin wisps of warm steam.
   */
  coffee_cup_24: {
    width: 24,
    height: 24,
    map: [
      ".........ss...SS........",
      "........sS...sS.........",
      "........s....s...ss.....",
      ".........sS...s..sS.....",
      ".........s....S.s.......",
      "....kkkkkkkkkkkkkk......",
      "...kcccccccccccccck.....",
      "..kccEEEEEEEEEEEEcck....",
      "..kcEEllLLllLLllEEck....",
      "..kcElLLLLLLLLLLlEckkkk.",
      "..kceeeLLLLLLLLeeedkccck",
      "..kceeeeLLLLLLeeeedkckck",
      "...kceeeeLLLLeeeedkcckck",
      "...kcccccccccccccckcckck",
      "...kccCCCCCCCCCCddkcckck",
      "...kccCCCCCCCCCCddkddkck",
      "....kcCCCCCCCCCCddkkkk..",
      "....kccCCCCCCCCdddk.....",
      ".....kccCCCCCCdddk......",
      "..kkkkkddddddddddkkkkk..",
      ".kwwwwwWWWWWWWWWWmmmmmk.",
      ".kWWWWWWWWWWWWWWWmmmmMk.",
      "..kkkkkMMMMMMMMMMkkkkk..",
      ".......kkkkkkkkkk.......",
    ],
    pal: KARSA_V3_PALETTE,
  },

  /**
   * 2. barista_16 (16x16 portrait of Aqsan in a warm olive barista apron & headband)
   */
  barista_16: {
    width: 16,
    height: 16,
    map: [
      "...kkkkkkkkkk...",
      "..khhhhhHHHHHk..",
      "..khHHHHHHHHHk..",
      "..kooOOOOOOvvk..",
      "..kYYyyyyyyggk..",
      "..kppppppppPPk..",
      ".kppkppppkppPPk.",
      ".kppppppppppPPk.",
      "..kppppWWpppPk..",
      "...kppppppppk...",
      "..kkoooooooOkk..",
      ".koooOOOOOOOvvk.",
      ".koOOOOYYOOOvvk.",
      ".koOOOOGGOOOvvk.",
      ".kvoOOOOOOOOvVk.",
      "..kkkkkkkkkkkk..",
    ],
    pal: KARSA_V3_PALETTE,
  },

  /**
   * 3. gerobak_kopi_16 (16x16 Kopi Karsa wooden cart with warm lantern and awning)
   */
  gerobak_kopi_16: {
    width: 16,
    height: 16,
    map: [
      "..kkkkkkkkkkkk..",
      ".krRccrRccrRcck.",
      ".kRzrdkRzrdkRzrk",
      ".kkkkkkkkkkkkkk.",
      "..kwm......mwk..",
      "..kwm.kyyk.mwk..",
      "..kwm.kYsk.mwk..",
      "..kwm..kk..mwk..",
      ".kkkkkkkkkkkkkk.",
      ".kwwwwWWWWWWWWk.",
      ".kWWWWmmmmmmmmk.",
      ".kWWWWmmmmmmmmk.",
      ".kkkkkkkkkkkkkk.",
      "..kIk......kIk..",
      "..kjk......kjk..",
      "...k........k...",
    ],
    pal: KARSA_V3_PALETTE,
  },

  /**
   * 4. emas_batangan_16 (16x16 gleaming gold bullion bar with sparkle)
   */
  emas_batangan_16: {
    width: 16,
    height: 16,
    map: [
      "............s...",
      "...........sys..",
      "..s.........s...",
      ".sys............",
      "..s.kkkkkkkkkk..",
      "...kyyyyyyyyyYk.",
      "..kyyYYYYYYYYgGk",
      ".kyyYYYYYYYYggGk",
      ".kyYYYYYYYYgggGk",
      ".kYYYYYYYYggggGk",
      ".kggggggggGGGGk.",
      "..kGGGGGGGGGGk..",
      "...kkkkkkkkkk...",
      "................",
      "................",
      "................",
    ],
    pal: KARSA_V3_PALETTE,
  },

  /**
   * 5. celengan_warga_16 (16x16 wooden community cooperative chest with brass lock)
   */
  celengan_warga_16: {
    width: 16,
    height: 16,
    map: [
      "................",
      "..kkkkkkkkkkkk..",
      ".kyywwwwwwwwYYk.",
      ".kYWWWWkkkkWWgk.",
      ".kYWWWWWWWWWWgk.",
      ".kkkkkkkkkkkkkk.",
      ".kYwwwwkyykWWgk.",
      ".kYWWWWkYgkWWgk.",
      ".kYWWWWkYgkWWgk.",
      ".kYWWWWkkkkWWgk.",
      ".kYWWWWmmmmmmgk.",
      ".kYmmmmmmmmmmgk.",
      ".kGggggggggggGk.",
      "..kkkkkkkkkkkk..",
      "..kk........kk..",
      "................",
    ],
    pal: KARSA_V3_PALETTE,
  },

  /**
   * 6. segel_gembok_16 (16x16 heavy iron padlock & red seal tag for the Seizure card)
   */
  segel_gembok_16: {
    width: 16,
    height: 16,
    map: [
      "....kkkkkkkk....",
      "...kiiIIIIjjk...",
      "..kiIIkkkkIIjk..",
      "..kiIk....kIjk..",
      "..kiIk....kIjk..",
      ".kkkkkkkkkkkkkk.",
      ".kiiIIIIIIIIjjk.",
      ".kiIIrrrrrRIIjk.",
      ".kiIrRRRRRRzIjk.",
      ".kiIrRRkkRRzIjk.",
      ".kiIrRRkkRRzIjk.",
      ".kiIjrRRRRzzIjk.",
      ".kjjjzzzzzzjjJk.",
      ".kJJJJJJJJJJJJk.",
      "..kkkkkkkkkkkk..",
      "................",
    ],
    pal: KARSA_V3_PALETTE,
  },

  /**
   * 7a. koin_12 (12x12 gold coin)
   */
  koin_12: {
    width: 12,
    height: 12,
    map: [
      "...kkkkkk...",
      "..kyyyyyYk..",
      ".kyyYYYYYgk.",
      "kyyYYkykYYgk",
      "kyYYkyGgkYgk",
      "kyYYkyGgkYgk",
      "kyYYkyGgkYgk",
      "kYYYkyGgkggk",
      "kYYYYkkkggGk",
      ".kYYYYgggGk.",
      "..kggggGGk..",
      "...kkkkkk...",
    ],
    pal: KARSA_V3_PALETTE,
  },

  /**
   * 7b. bintang_12 (12x12 star/token)
   */
  bintang_12: {
    width: 12,
    height: 12,
    map: [
      ".....kk.....",
      "....kyYk....",
      "....kyYk....",
      ".kkkkyYkkkk.",
      "kyyyyyYYYYgk",
      ".kyyYYYYYgk.",
      "..kyYYYYgk..",
      "..kyYkkYgk..",
      ".kyYk..kYgk.",
      ".kYgk..kgGk.",
      "..kk....kk..",
      "............",
    ],
    pal: KARSA_V3_PALETTE,
  },
};

/**
 * Runtime assertion verifying every sprite's row count, row character length,
 * and palette mapping so a single short row or unmapped character never shifts a sprite.
 */
export function assertSpritesV3Valid(): void {
  for (const [name, def] of Object.entries(SPRITES_V3)) {
    if (def.map.length !== def.height) {
      throw new Error(`[spritesV3] Sprite "${name}" expected ${def.height} rows, got ${def.map.length}`);
    }
    def.map.forEach((row, rowIdx) => {
      if (row.length !== def.width) {
        throw new Error(
          `[spritesV3] Sprite "${name}" row ${rowIdx} expected length ${def.width}, got ${row.length} ("${row}")`,
        );
      }
      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        const ch = row[colIdx]!;
        if (ch !== "." && !def.pal[ch]) {
          throw new Error(
            `[spritesV3] Sprite "${name}" row ${rowIdx} col ${colIdx} has unmapped char "${ch}"`,
          );
        }
      }
    });
  }
}

// Run assertion immediately on module load
assertSpritesV3Valid();

/**
 * Draw a V3 pixel sprite onto any 2D canvas context at integer coordinates and scale.
 */
export function drawSpriteV3(
  ctx: SKRSContext2D | CanvasRenderingContext2D,
  name: SpriteV3Name | string,
  x: number,
  y: number,
  scale = 1,
): void {
  const sprite = SPRITES_V3[name as SpriteV3Name];
  if (!sprite) {
    throw new Error(`[spritesV3] Unknown sprite name: "${name}"`);
  }
  const s = Math.max(1, Math.round(scale));
  const ox = Math.round(x);
  const oy = Math.round(y);

  for (let r = 0; r < sprite.height; r++) {
    const row = sprite.map[r]!;
    for (let c = 0; c < sprite.width; c++) {
      const ch = row[c]!;
      if (ch === ".") continue;
      const color = sprite.pal[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + c * s, oy + r * s, s, s);
    }
  }
}
