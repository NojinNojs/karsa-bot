export interface PrestigeRank {
  minLevel: number;
  title: string;
  perkNote: string;
}

export const PRESTIGE_RANKS: PrestigeRank[] = [
  { minLevel: 1, title: "PERINTIS LAPAK", perkNote: "Buka Gerobak Kopi Lv.1" },
  { minLevel: 2, title: "BARISTA PASAR", perkNote: "Akses Koperasi Pasar Terbuka" },
  { minLevel: 3, title: "PERACIK UTAMA", perkNote: "Bonus Tip Pelanggan +5%" },
  { minLevel: 5, title: "JURAGAN KEDAI", perkNote: "Bonus Tip Pelanggan +10%" },
  { minLevel: 8, title: "MASTER SANGRAI", perkNote: "Bonus Tip Pelanggan +15%" },
  { minLevel: 12, title: "MITRA KOPERASI", perkNote: "Bonus Tip Pelanggan +20%" },
  { minLevel: 16, title: "SAUDAGAR KOPI", perkNote: "Bonus Tip Pelanggan +25%" },
  { minLevel: 20, title: "MAESTRO KARSA", perkNote: "Bonus Tip Pelanggan +30%" },
];

export function getRankForLevel(level: number): PrestigeRank {
  let chosen = PRESTIGE_RANKS[0]!;
  for (const r of PRESTIGE_RANKS) {
    if (level >= r.minLevel) chosen = r;
  }
  return chosen;
}

export function getPrestigeTipMultiplier(level: number): number {
  if (level >= 20) return 1.3;
  if (level >= 16) return 1.25;
  if (level >= 12) return 1.2;
  if (level >= 8) return 1.15;
  if (level >= 5) return 1.1;
  if (level >= 3) return 1.05;
  return 1.0;
}

export interface BusinessCatalogItem {
  bizType: "kedai_kopi" | "brankas_darurat" | "saham_koperasi";
  name: string;
  subtitle: string;
  baseCost: number;
  baseYield: number;
  requiredKedaiLevel: number;
  requiredKarma: number;
  yieldLabel: (level: number, yieldVal: number) => string;
}

function formatYieldRp(y: number): string {
  if (y <= 0) return "TERKUNCI";
  if (y < 1_000_000) return `+${Math.round(y / 1_000)} RB/HR`;
  return `+${(y / 1_000_000).toFixed(1).replace(".", ",")} JT/HR`;
}

export const BUSINESS_CATALOG: Record<string, BusinessCatalogItem> = {
  kedai_kopi: {
    bizType: "kedai_kopi",
    name: "Kedai Kopi Karsa",
    subtitle: "Gerobak",
    baseCost: 1_500_000,
    baseYield: 350_000,
    requiredKedaiLevel: 1,
    requiredKarma: 0,
    yieldLabel: (_lvl, y) => formatYieldRp(y),
  },
  brankas_darurat: {
    bizType: "brankas_darurat",
    name: "Tabungan Emas",
    subtitle: "Kebal sita",
    baseCost: 2_000_000,
    baseYield: 250_000,
    requiredKedaiLevel: 2,
    requiredKarma: 0,
    yieldLabel: (_lvl, y) => formatYieldRp(y),
  },
  saham_koperasi: {
    bizType: "saham_koperasi",
    name: "Koperasi Warga",
    subtitle: "Bagi hasil",
    baseCost: 3_000_000,
    baseYield: 400_000,
    requiredKedaiLevel: 3,
    requiredKarma: 65,
    yieldLabel: (_lvl, y) => formatYieldRp(y),
  },
};

export function formatRpShort(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(1).replace(/\.0$/, "").replace(".", ",")}Jt`;
  if (abs >= 1_000) return `Rp ${Math.round(val / 1_000).toLocaleString("id-ID")}Rb`;
  return `Rp ${val}`;
}

export function formatWalletK(val: number): string {
  return `Rp${Math.round(val / 1_000).toLocaleString("id-ID")}K`;
}
