export interface KarsaTheme {
  id: string;
  name: string;
  ink: string; // Deepest outline / shadow (#0B080E)
  bg: string; // Deep espresso-slate (#141019)
  bgAlt: string; // Subtle dither pair (#181320)
  surface: string; // Card surface (#1E1826)
  surfaceAlt: string; // Elevated row surface (#251E30)
  inset: string; // Recessed slot surface (#16121C)
  insetLo: string; // Deep recessed shadow (#100D15)
  highlight: string; // Warm top/left bevel highlight (#3A2E47)
  shadow: string; // Bottom/right bevel shadow (#120E17)
  amber: string; // Primary Amber Gold (#F4B446)
  amberHi: string; // Bright gold highlight (#FFE08A)
  amberLo: string; // Dark bronze shadow (#A86E1E)
  crema: string; // Primary warm white text (#FFF3D6)
  muted: string; // Muted warm grey label (#9E92A8)
  green: string; // Leaf green positive (#45C486)
  greenHi: string; // Bright mint highlight (#89E8B6)
  greenLo: string; // Deep forest shadow (#1E6B47)
  red: string; // Terracotta red danger (#E85D5D)
  redHi: string; // Soft coral highlight (#FF9494)
  redLo: string; // Deep rust shadow (#872626)
  cyan: string; // Crisp sky accent (#68C8E8)
}

/**
 * Default "Warm Espresso & Amber Gold" (Indonesian Night Kopi) palette.
 */
export const WARM_KOPI_THEME: KarsaTheme = {
  id: "warm_kopi",
  name: "Warm Espresso & Amber Gold",
  ink: "#0B080E",
  bg: "#141019",
  bgAlt: "#181320",
  surface: "#1E1826",
  surfaceAlt: "#251E30",
  inset: "#16121C",
  insetLo: "#100D15",
  highlight: "#3A2E47",
  shadow: "#120E17",
  amber: "#F4B446",
  amberHi: "#FFE08A",
  amberLo: "#A86E1E",
  crema: "#FFF3D6",
  muted: "#9E92A8",
  green: "#45C486",
  greenHi: "#89E8B6",
  greenLo: "#1E6B47",
  red: "#E85D5D",
  redHi: "#FF9494",
  redLo: "#872626",
  cyan: "#68C8E8",
};

/**
 * Crimson emergency palette for Azab / Debt Collector events, tuned to the
 * same warm tonal family and contrast ratios as WARM_KOPI_THEME.
 */
export const AZAB_KOPI_THEME: KarsaTheme = {
  ...WARM_KOPI_THEME,
  id: "azab_crimson",
  name: "Segel Darurat",
  bg: "#1C0E14",
  bgAlt: "#241119",
  surface: "#2B141E",
  surfaceAlt: "#361926",
  inset: "#180B10",
  insetLo: "#11070B",
  highlight: "#5E273B",
  shadow: "#14080D",
  amber: "#F4B446",
  amberHi: "#FFE08A",
  amberLo: "#9E3535",
};

export const GAMEBOY_KOPI_THEME: KarsaTheme = {
  id: "gameboy_green",
  name: "GameBoy DMG-01",
  ink: "#08140C",
  bg: "#0F2417",
  bgAlt: "#142E1E",
  surface: "#1B3B28",
  surfaceAlt: "#224932",
  inset: "#11281B",
  insetLo: "#0B1B12",
  highlight: "#4A855E",
  shadow: "#0C1E14",
  amber: "#B8E89C",
  amberHi: "#E2F8CF",
  amberLo: "#4A7D46",
  crema: "#E8FCE0",
  muted: "#7AB088",
  green: "#9CD878",
  greenHi: "#E0F8CF",
  greenLo: "#2E5E36",
  red: "#B8E89C",
  redHi: "#E2F8CF",
  redLo: "#386640",
  cyan: "#B8E89C",
};

export const CYBER_KOPI_THEME: KarsaTheme = {
  id: "cyberpunk_neon",
  name: "Glodok Cyber 2077",
  ink: "#070414",
  bg: "#100826",
  bgAlt: "#160C33",
  surface: "#1F1147",
  surfaceAlt: "#29175C",
  inset: "#13092E",
  insetLo: "#0B051C",
  highlight: "#FF3898",
  shadow: "#0D0621",
  amber: "#38F6FF",
  amberHi: "#B8FCFF",
  amberLo: "#941159",
  crema: "#FFFFFF",
  muted: "#B088E8",
  green: "#00F5B8",
  greenHi: "#B8FFEA",
  greenLo: "#005E54",
  red: "#FF4769",
  redHi: "#FF99AC",
  redLo: "#7A1230",
  cyan: "#38F6FF",
};

export const KERATON_KOPI_THEME: KarsaTheme = {
  id: "keraton_royal",
  name: "Keraton Royal Emerald",
  ink: "#070D09",
  bg: "#101E15",
  bgAlt: "#15261B",
  surface: "#1B3324",
  surfaceAlt: "#23402E",
  inset: "#112117",
  insetLo: "#0A140E",
  highlight: "#D4AF37",
  shadow: "#0B1710",
  amber: "#FFD966",
  amberHi: "#FFF6C2",
  amberLo: "#8C5818",
  crema: "#FCF8EC",
  muted: "#9CB8A6",
  green: "#5CE6A0",
  greenHi: "#B8FFD8",
  greenLo: "#18593D",
  red: "#FF6666",
  redHi: "#FFA3A3",
  redLo: "#7A2020",
  cyan: "#80E5FF",
};

export const SKIN_THEMES_V3: Record<string, KarsaTheme> = {
  retro_gold: WARM_KOPI_THEME,
  gameboy_green: GAMEBOY_KOPI_THEME,
  cyberpunk_neon: CYBER_KOPI_THEME,
  keraton_royal: KERATON_KOPI_THEME,
};
