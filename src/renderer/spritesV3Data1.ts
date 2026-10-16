import { KARSA_V3_PALETTE, type SpriteV3Def } from "./spritesV3Palette.ts";

export const SPRITES_V3_PART1: Record<string, SpriteV3Def> = {
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
};
