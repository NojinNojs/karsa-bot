export interface WorkDilemma {
  id: string;
  title: string;
  context: string;
  ethicalChoice: {
    label: string;
    rewardRp: number;
    karmaDelta: number;
    xpDelta: number;
    outcomeText: string;
  };
  corruptChoice: {
    label: string;
    rewardRp: number;
    fineRp: number;
    auditChance: number;
    karmaDelta: number;
    xpDelta: number;
    successText: string;
    bustedText: string;
  };
}

export const WORK_DILEMMAS: WorkDilemma[] = [
  {
    id: "kopi_beans",
    title: "Karung Biji Kopi Pagi Ini",
    context: "Karung Gayo dari pengepul langganan naik harga. Sales keliling nawarin biji campuran jagung sangrai — separuh harga, warna mirip.",
    ethicalChoice: {
      label: "Tetap tebus Gayo asli",
      rewardRp: 1_450_000,
      karmaDelta: 5,
      xpDelta: 25,
      outcomeText: "Ojol & anak kantor antre kayak biasa. Gelas habis sebelum jam 9 malam.",
    },
    corruptChoice: {
      label: "Campur separuh jagung sangrai",
      rewardRp: 2_800_000,
      fineRp: 4_200_000,
      auditChance: 0.55,
      karmaDelta: -15,
      xpDelta: 10,
      successText: "Modal irit separuh, malam ini laci kasir tebal.",
      bustedText: "Pelanggan tetap nyium bau gosong jagung, foto gelasnya rame di grup warga. Omzet besoknya anjlok!",
    },
  },
  {
    id: "sponsor_struk",
    title: "Stiker di Meja Kasir",
    context: "Orang tak dikenal mampir bawa amplop coklat: titip stiker QR 'Spin Malam Ini' di kaca etalase selama seminggu.",
    ethicalChoice: {
      label: "Usir halus, tempel stiker kupon kopi",
      rewardRp: 1_600_000,
      karmaDelta: 8,
      xpDelta: 35,
      outcomeText: "Stempel 'beli 9 gratis 1' bikin pelanggan balik terus tiap sore.",
    },
    corruptChoice: {
      label: "Terima amplopnya, tempel di pojok",
      rewardRp: 4_500_000,
      fineRp: 8_500_000,
      auditChance: 0.7,
      karmaDelta: -25,
      xpDelta: 5,
      successText: "Amplop masuk laci, belum ada yang ngeh.",
      bustedText: "QRIS warung ikut diblokir bank gara-gara satu jaringan sama stiker itu. Seharian gak bisa terima bayaran!",
    },
  },
  {
    id: "pajak_umkm",
    title: "Catat Buku Kas Akhir Bulan",
    context: "Teman sesama pedagang bisikin cara bikin dua buku kas biar iuran lingkungan & retribusi pasar kelihatan kecil.",
    ethicalChoice: {
      label: "Satu buku apa adanya",
      rewardRp: 1_500_000,
      karmaDelta: 6,
      xpDelta: 30,
      outcomeText: "Pengurus pasar percaya penuh. Sewa lapak dapat potongan 15%.",
    },
    corruptChoice: {
      label: "Bikin buku kedua yang dikecilin",
      rewardRp: 2_600_000,
      fineRp: 5_000_000,
      auditChance: 0.6,
      karmaDelta: -18,
      xpDelta: 8,
      successText: "Iuran bulan ini lolos murah.",
      bustedText: "Petugas pasar cocokin nota supplier sama buku kas — ketahuan selisih jauh, kena denda dua kali lipat!",
    },
  },
];

export interface BusinessCatalogItem {
  bizType: "kedai_kopi" | "brankas_darurat" | "saham_koperasi";
  name: string;
  subtitle: string;
  baseCost: number;
  baseYield: number;
  yieldLabel: (level: number, yieldVal: number) => string;
}

export const BUSINESS_CATALOG: Record<string, BusinessCatalogItem> = {
  kedai_kopi: {
    bizType: "kedai_kopi",
    name: "Kedai Kopi Karsa",
    subtitle: "3 barista • ramai",
    baseCost: 15_000_000,
    baseYield: 1_800_000,
    yieldLabel: (_lvl, y) => `+${(y / 1_000_000).toFixed(1).replace(".", ",")}jt/hr`,
  },
  brankas_darurat: {
    bizType: "brankas_darurat",
    name: "Tabungan Emas",
    subtitle: "28g Antam • aman",
    baseCost: 12_000_000,
    baseYield: 950_000,
    yieldLabel: (lvl) => `+${(4.5 + lvl * 0.25).toFixed(1).replace(".", ",")}%/bln`,
  },
  saham_koperasi: {
    bizType: "saham_koperasi",
    name: "Koperasi Warga",
    subtitle: "iuran 14 pedagang",
    baseCost: 10_000_000,
    baseYield: 1_200_000,
    yieldLabel: (lvl) => `+${9 + lvl}% bagi`,
  },
};

export function formatRpShort(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1_000_000) {
    const jt = val / 1_000_000;
    return `Rp${jt.toFixed(1).replace(".", ",")}jt`;
  }
  if (abs >= 1_000) {
    const rb = Math.round(val / 1_000);
    return `Rp${rb.toLocaleString("id-ID")}K`;
  }
  return `Rp${val}`;
}

export function formatWalletK(val: number): string {
  const k = Math.round(val / 1_000);
  return `Rp${k.toLocaleString("id-ID")}K`;
}
