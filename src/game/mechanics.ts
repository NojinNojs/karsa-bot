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

export interface MarketEvent {
  id: string;
  title: string;
  description: string;
  workMultiplier: number;
  passiveMultiplier: number;
  auditBonusChance: number;
  goldBonusNote: string;
}

export const MARKET_EVENTS: MarketEvent[] = [
  {
    id: "ihsg_goyang",
    title: "📉 IHSG & Rupiah Goyang",
    description:
      "Kebijakan fiskal ngawur bikin pasar modal panik, harga bahan baku impor naik tipis, tapi nilai **Tabungan Emas** warga ikut terkerek naik!",
    workMultiplier: 1.05,
    passiveMultiplier: 1.2,
    auditBonusChance: 0,
    goldBonusNote: "Setoran Usaha & Emas +20%",
  },
  {
    id: "hujan_malam_minggu",
    title: "🌧️ Hujan Deras Malam Minggu",
    description:
      "Warga berteduh di sekitar tenda pasar malam. Pesanan kopi panas dan roti bakar melonjak drastis sepanjang malam!",
    workMultiplier: 1.25,
    passiveMultiplier: 1.1,
    auditBonusChance: -0.05,
    goldBonusNote: "Omzet Seduh +25%",
  },
  {
    id: "tanggal_gajian",
    title: "☀️ Malam Gajian Kantoran",
    description:
      "Anak kos, ojol, dan pekerja kantoran lagi pegang uang tunai. Antrean es kopi susu gula aren mengular sampai ke jalan!",
    workMultiplier: 1.2,
    passiveMultiplier: 1.15,
    auditBonusChance: 0,
    goldBonusNote: "Omzet Seduh +20% • Setoran +15%",
  },
  {
    id: "aturan_ngawur",
    title: "🏛️ Pejabat Bikin Aturan Dadakan",
    description:
      "Pejabat daerah bikin aturan retribusi mendadak tanpa sosialisasi. Petugas pasar keliling lebih sering melakukan sidak takaran!",
    workMultiplier: 1.0,
    passiveMultiplier: 0.95,
    auditBonusChance: 0.12,
    goldBonusNote: "Risiko Sidak +12% • Jaga Takaran Jujur",
  },
  {
    id: "panen_raya_gayo",
    title: "🌾 Panen Raya Kopi Gayo",
    description:
      "Kiriman karung biji Arabika Gayo dari pengepul datang melimpah dengan harga miring dan kualitas super wangi.",
    workMultiplier: 1.18,
    passiveMultiplier: 1.12,
    auditBonusChance: 0,
    goldBonusNote: "Margin Seduh +18%",
  },
  {
    id: "festival_koperasi",
    title: "🔥 Bazar & Malam Koperasi Warga",
    description:
      "Paguyuban pedagang pasar menggelar bazar malam. Seluruh lapak dan koperasi warga kebanjiran pembeli dari luar komplek!",
    workMultiplier: 1.15,
    passiveMultiplier: 1.25,
    auditBonusChance: -0.05,
    goldBonusNote: "Omzet Usaha +25%",
  },
];

export function getCurrentMarketEvent(nowMs = Date.now()): {
  event: MarketEvent;
  nextChangeUnixSec: number;
} {
  const hourBucket = Math.floor(nowMs / (3600 * 1000));
  const event = MARKET_EVENTS[hourBucket % MARKET_EVENTS.length]!;
  const nextChangeUnixSec = (hourBucket + 1) * 3600;
  return { event, nextChangeUnixSec };
}

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

export const WORK_DILEMMAS: WorkDilemma[] = [
  {
    id: "kopi_beans",
    title: "Karung Biji Kopi Pagi Ini",
    context:
      "Karung Gayo dari pengepul langganan naik harga. Sales keliling nawarin biji campuran jagung sangrai — separuh harga, warna mirip.",
    ethicalChoice: {
      label: "Tetap tebus Gayo asli",
      rewardRp: 450_000,
      karmaDelta: 5,
      xpDelta: 40,
      outcomeText: "Ojol & anak kantor antre kayak biasa. Gelas habis sebelum jam 9 malam.",
    },
    corruptChoice: {
      label: "Campur separuh jagung sangrai",
      rewardRp: 950_000,
      fineRp: 1_200_000,
      auditChance: 0.55,
      karmaDelta: -15,
      xpDelta: 15,
      successText: "Modal irit separuh, malam ini laci kasir tebal.",
      bustedText:
        "Pelanggan tetap nyium bau gosong jagung, foto gelasnya rame di grup warga. Omzet besoknya anjlok!",
    },
  },
  {
    id: "sponsor_struk",
    title: "Stiker di Meja Kasir",
    context:
      "Orang tak dikenal mampir bawa amplop coklat: titip stiker QR 'Spin Malam Ini' di kaca etalase selama seminggu.",
    ethicalChoice: {
      label: "Usir halus, tempel stiker kupon kopi",
      rewardRp: 550_000,
      karmaDelta: 8,
      xpDelta: 40,
      outcomeText: "Stempel 'beli 9 gratis 1' bikin pelanggan balik terus tiap sore.",
    },
    corruptChoice: {
      label: "Terima amplopnya, tempel di pojok",
      rewardRp: 1_400_000,
      fineRp: 2_500_000,
      auditChance: 0.7,
      karmaDelta: -25,
      xpDelta: 15,
      successText: "Amplop masuk laci, belum ada yang ngeh.",
      bustedText:
        "QRIS warung ikut diblokir bank gara-gara satu jaringan sama stiker itu. Seharian gak bisa terima bayaran!",
    },
  },
  {
    id: "pajak_umkm",
    title: "Catat Buku Kas Akhir Bulan",
    context:
      "Teman sesama pedagang bisikin cara bikin dua buku kas biar iuran lingkungan & retribusi pasar kelihatan kecil.",
    ethicalChoice: {
      label: "Satu buku apa adanya",
      rewardRp: 500_000,
      karmaDelta: 6,
      xpDelta: 40,
      outcomeText: "Pengurus pasar percaya penuh. Sewa lapak dapat potongan 15%.",
    },
    corruptChoice: {
      label: "Bikin buku kedua yang dikecilin",
      rewardRp: 1_100_000,
      fineRp: 1_800_000,
      auditChance: 0.6,
      karmaDelta: -18,
      xpDelta: 15,
      successText: "Iuran bulan ini lolos murah.",
      bustedText:
        "Petugas pasar cocokin nota supplier sama buku kas — ketahuan selisih jauh, kena denda dua kali lipat!",
    },
  },
  {
    id: "gula_aren_asli",
    title: "Jerigen Gula Aren Cair",
    context:
      "Stok gula aren asli Lebak menipis. Pedagang grosir nawarin sirup pemanis buatan rasa karamel yang harganya cuma sepertiga.",
    ethicalChoice: {
      label: "Pakai gula aren Lebak murni",
      rewardRp: 480_000,
      karmaDelta: 5,
      xpDelta: 40,
      outcomeText: "Wangi aren aslinya kecium sampai parkiran motor, pelanggan nambah pesanan bungkus.",
    },
    corruptChoice: {
      label: "Oplos sirup pemanis buatan",
      rewardRp: 1_000_000,
      fineRp: 1_500_000,
      auditChance: 0.58,
      karmaDelta: -16,
      xpDelta: 15,
      successText: "Biaya bahan manis hemat banyak malam ini.",
      bustedText: "Banyak pembeli komplain batuk & rasa pahit kimia di tenggorokan, rating warung jatuh!",
    },
  },
  {
    id: "susu_evaporasi",
    title: "Kaleng Susu di Gudang Belakang",
    context:
      "Ada 1 dus susu segar yang masa kedaluwarsanya tinggal malam ini, sementara agen nawarin krimer kental murah buat besok.",
    ethicalChoice: {
      label: "Beli stok susu segar baru",
      rewardRp: 520_000,
      karmaDelta: 6,
      xpDelta: 40,
      outcomeText: "Foam cappuccino-nya tebal dan lembut, rombongan anak kuliahan betah nongkrong.",
    },
    corruptChoice: {
      label: "Pakai sisa kaleng & encerkan air",
      rewardRp: 980_000,
      fineRp: 1_600_000,
      auditChance: 0.62,
      karmaDelta: -18,
      xpDelta: 15,
      successText: "Stok lama habis terpakai tanpa keluar modal baru.",
      bustedText: "Susu pecah pas diseduh air panas di depan pembeli, harus ganti rugi dan buang satu termos!",
    },
  },
  {
    id: "hujan_es_batu",
    title: "Kiriman Es Batu Kristal",
    context:
      "Truk es batu kristal terlambat karena macet. Tukang es balok pinggir jalan nawarin es balok mentah harga miring.",
    ethicalChoice: {
      label: "Tunggu es kristal matang RO",
      rewardRp: 460_000,
      karmaDelta: 5,
      xpDelta: 40,
      outcomeText: "Pembeli tenang karena es-nya bening dan higienis.",
    },
    corruptChoice: {
      label: "Pecahin es balok mentah",
      rewardRp: 920_000,
      fineRp: 1_450_000,
      auditChance: 0.6,
      karmaDelta: -17,
      xpDelta: 15,
      successText: "Pesanan es kopi tetap jalan cepat meski truk telat.",
      bustedText: "Warga nemu serpihan karung di dasar gelas es kopi, paguyuban pasar langsung tegur keras!",
    },
  },
  {
    id: "timbangan_roastery",
    title: "Titipan Biji Sangrai Tetangga",
    context:
      "Pedagang lapak sebelah nitip giling 5 kg biji kopi mereka di mesin grinder kamu dengan ongkos jasa giling.",
    ethicalChoice: {
      label: "Timbang pas 5 kg tanpa kurang",
      rewardRp: 510_000,
      karmaDelta: 7,
      xpDelta: 40,
      outcomeText: "Tetangga lapak puas banget, besoknya mereka ikut rekomendasiin warungmu.",
    },
    corruptChoice: {
      label: "Serok 500 gram masuk toples sendiri",
      rewardRp: 1_050_000,
      fineRp: 1_750_000,
      auditChance: 0.65,
      karmaDelta: -20,
      xpDelta: 15,
      successText: "Dapat tambahan stok bubuk kopi gratis.",
      bustedText: "Tetangga lapak nimbang ulang di timbangan digital mereka — selisih setengah kilo bikin geger satu blok!",
    },
  },
  {
    id: "kembalian_parkir",
    title: "Uang Kembalian Rombongan Malam",
    context:
      "Rombongan pembeli buru-buru bayar tunai Rp 200.000 saat hujan turun dan lupa menghitung uang kembalian Rp 50.000.",
    ethicalChoice: {
      label: "Kejar ke parkiran, balikin Rp 50rb",
      rewardRp: 490_000,
      karmaDelta: 9,
      xpDelta: 45,
      outcomeText: "Rombongan itu terharu, besoknya mereka borong 30 cup buat rapat kantor!",
    },
    corruptChoice: {
      label: "Diam-diam kantongi selisihnya",
      rewardRp: 900_000,
      fineRp: 1_400_000,
      auditChance: 0.55,
      karmaDelta: -16,
      xpDelta: 10,
      successText: "Uang lebih masuk kantong malam ini.",
      bustedText: "Mereka balik 10 menit kemudian cek struk, malu berat di depan antrean pelanggan lain!",
    },
  },
];

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
  if (abs >= 1_000_000) {
    const jt = val / 1_000_000;
    return `Rp ${jt.toFixed(1).replace(/\.0$/, "").replace(".", ",")}Jt`;
  }
  if (abs >= 1_000) {
    const rb = Math.round(val / 1_000);
    return `Rp ${rb.toLocaleString("id-ID")}Rb`;
  }
  return `Rp ${val}`;
}

export function formatWalletK(val: number): string {
  const k = Math.round(val / 1_000);
  return `Rp${k.toLocaleString("id-ID")}K`;
}
