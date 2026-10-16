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
