import { KARSA_V3_PALETTE, type SpriteV3Def } from "./spritesV3Palette.ts";

export const SPRITES_V3_PART3: Record<string, SpriteV3Def> = {
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
