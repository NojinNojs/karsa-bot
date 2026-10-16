export type SkinId = "retro_gold" | "gameboy_green" | "cyberpunk_neon" | "keraton_royal";

export interface Palette {
  id: SkinId | "azab_crimson";
  name: string;
  priceRp: number;
  priceGems: number;
  desc: string;
}

export const SKIN_PALETTES: Record<SkinId, Palette> = {
  retro_gold: {
    id: "retro_gold",
    name: "Retro Arcade Gold",
    priceRp: 0,
    priceGems: 0,
    desc: "Tema klasik 16-bit Nusantara Reserve (Default)",
  },
  gameboy_green: {
    id: "gameboy_green",
    name: "GameBoy DMG-01",
    priceRp: 2_500_000,
    priceGems: 5,
    desc: "Palet hijau monokrom 1989 ala konsol genggam klasik",
  },
  cyberpunk_neon: {
    id: "cyberpunk_neon",
    name: "Glodok Cyber 2077",
    priceRp: 4_500_000,
    priceGems: 10,
    desc: "Neon magenta & cyan elektrik ala distrik malam",
  },
  keraton_royal: {
    id: "keraton_royal",
    name: "Keraton Royal Emerald",
    priceRp: 7_500_000,
    priceGems: 20,
    desc: "Hijau zamrud & emas murni bangsawan Nusantara",
  },
};
