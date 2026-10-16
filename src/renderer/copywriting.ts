export interface AssetRowCopy {
  id: "kedai_kopi" | "brankas_darurat" | "saham_koperasi";
  icon: "shop" | "safe" | "chest";
  title: string;
  subtitle: string;
  valueText: string;
  yieldText: string;
}

export interface SeizureRowCopy {
  title: string;
  subtitle: string;
  statusText: string;
}

export interface BrandCopy {
  name: string;
  stallSign: string;
  tagline: string;
  taglineLines: readonly [string, string];
  subline: string;
  commandsLine: string;
  discordBio: string;
}

export interface PortfolioCardCopy {
  headerLeft: string;
  headerRightBadge: string;
  profile: {
    defaultName: string;
    role: string;
    badge: string;
  };
  cashBox: {
    label: string;
    defaultValue: string;
    defaultToken: string;
  };
  reputationBox: {
    label: string;
    defaultScore: string;
    statusClean: string;
    statusArrears: string;
    statusRentDiscount: string;
    statusRentNormal: string;
  };
  rightPanel: {
    headerLeft: string;
    defaultTotalRight: string;
    assets: readonly [AssetRowCopy, AssetRowCopy, AssetRowCopy];
  };
  footer: {
    label: string;
    defaultNote: string;
  };
}

export interface SeizureCardCopy {
  headerLeft: string;
  headerRightBadge: string;
  leftPanel: {
    statusRole: string;
    arrearsLabel: string;
    defaultArrearsValue: string;
    reputationLabel: string;
    defaultReputationScore: string;
  };
  rightPanel: {
    headerLeft: string;
    rows: readonly [SeizureRowCopy, SeizureRowCopy, SeizureRowCopy];
  };
  footer: {
    label: string;
    actionText: string;
  };
}

export const BRAND_COPY: BrandCopy = {
  name: "KARSA",
  stallSign: "KOPI KARSA",
  tagline: "Dari satu gerobak kopi, hidupin satu jalan.",
  taglineLines: [
    "Dari satu gerobak kopi,",
    "hidupin satu jalan.",
  ],
  subline: "Seduh pagi • Putar modal • Jaga nama baik",
  commandsLine: "/start  •  /portfolio  •  /work",
  discordBio:
    "Mulai dari satu gerobak kopi di pojok jalan. Atur belanja bahan, sisihkan emas buat hari sepi, dan patungan bareng pedagang satu server.",
} as const;

export const PORTFOLIO_CARD_COPY: PortfolioCardCopy = {
  headerLeft: "KARSA",
  headerRightBadge: "PASAR MALAM • RAMAI",
  profile: {
    defaultName: "AQSAN",
    role: "PERACIK UTAMA",
    badge: "LANGGANAN PENUH",
  },
  cashBox: {
    label: "LACI KAS",
    defaultValue: "Rp 48,2 Jt",
    defaultToken: "3 KUPON",
  },
  reputationBox: {
    label: "NAMA BAIK",
    defaultScore: "90 / 100",
    statusClean: "BEBAS TUNGGAKAN",
    statusArrears: "ADA TUNGGAKAN",
    statusRentDiscount: "SEWA -15%",
    statusRentNormal: "SEWA NORMAL",
  },
  rightPanel: {
    headerLeft: "LAPAK & SIMPANAN",
    defaultTotalRight: "TOTAL Rp 194,8 Jt",
    assets: [
      {
        id: "kedai_kopi",
        icon: "shop",
        title: "Kedai Kopi Karsa",
        subtitle: "Ramai • 3 peracik",
        valueText: "Rp 64,5 Jt",
        yieldText: "+1,8 Jt/hr",
      },
      {
        id: "brankas_darurat",
        icon: "safe",
        title: "Simpanan Emas",
        subtitle: "28 gr • Dana darurat",
        valueText: "Rp 55,0 Jt",
        yieldText: "+5,5% /bln",
      },
      {
        id: "saham_koperasi",
        icon: "chest",
        title: "Koperasi Pedagang",
        subtitle: "Iuran 14 lapak",
        valueText: "Rp 27,0 Jt",
        yieldText: "+12% bagi",
      },
    ],
  },
  footer: {
    label: "CATATAN:",
    defaultNote: "Patungan gerobak ke-2 bareng warga di /koperasi",
  },
} as const;

export const SEIZURE_CARD_COPY: SeizureCardCopy = {
  headerLeft: "SURAT SEGEL LAPAK",
  headerRightBadge: "TUTUP PAKSA",
  leftPanel: {
    statusRole: "LAPAK DISITA",
    arrearsLabel: "TUNGGAKAN BUNGA",
    defaultArrearsValue: "Rp 18,0 Jt",
    reputationLabel: "NAMA BAIK PASAR",
    defaultReputationScore: "15 / 100",
  },
  rightPanel: {
    headerLeft: "RINCIAN SEGEL",
    rows: [
      {
        title: "Potongan Bunga Harian",
        subtitle: "Laci kas terkuras otomatis",
        statusText: "-Rp 18,0 Jt",
      },
      {
        title: "Peralatan Disita",
        subtitle: "Mesin kopi & gerobak",
        statusText: "DISEGEL",
      },
      {
        title: "Nasib Pelanggan",
        subtitle: "Pindah ke warung sebelah",
        statusText: "SEPI",
      },
    ],
  },
  footer: {
    label: "TEBUS LAPAK:",
    actionText: "Minta bantuan teman satu server lewat /koperasi",
  },
} as const;

export const KARSA_COPY = {
  brand: BRAND_COPY,
  portfolio: PORTFOLIO_CARD_COPY,
  seizure: SEIZURE_CARD_COPY,
} as const;

export const COPYWRITING = KARSA_COPY;

export function formatRpJuta(amountRp: number, withPlus = false): string {
  const sign = amountRp < 0 ? "-" : withPlus && amountRp > 0 ? "+" : "";
  const abs = Math.abs(amountRp);
  if (abs >= 1_000_000) {
    const jt = (abs / 1_000_000).toFixed(1).replace(".", ",");
    return `${sign}Rp ${jt} Jt`;
  }
  if (abs >= 1_000) {
    const rb = Math.round(abs / 1_000).toLocaleString("id-ID");
    return `${sign}Rp ${rb} Rb`;
  }
  return `${sign}Rp ${abs}`;
}

export function formatKuponCount(count: number): string {
  return `${Math.max(0, count | 0)} KUPON`;
}

export function formatNamaBaik(score: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return `${clamped} / 100`;
}

export default KARSA_COPY;
