import { KARSA_V3_PALETTE, type SpriteV3Def } from "./spritesV3Palette.ts";

export const SPRITES_V3_PART2: Record<string, SpriteV3Def> = {
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
};
