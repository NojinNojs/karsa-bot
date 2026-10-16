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

let manualMarketEventId: string | null = null;

export function setMarketEventOverride(eventId: string | null): MarketEvent | null {
  if (!eventId || eventId === "auto") {
    manualMarketEventId = null;
    return null;
  }
  const found = MARKET_EVENTS.find((e) => e.id === eventId) || null;
  manualMarketEventId = found ? found.id : null;
  return found;
}

export function getMarketEventOverrideId(): string | null {
  return manualMarketEventId;
}

export function getCurrentMarketEvent(nowMs = Date.now()): {
  event: MarketEvent;
  nextChangeUnixSec: number;
  isOverride?: boolean;
} {
  const hourBucket = Math.floor(nowMs / (3600 * 1000));
  const nextChangeUnixSec = (hourBucket + 1) * 3600;
  if (manualMarketEventId) {
    const forced = MARKET_EVENTS.find((e) => e.id === manualMarketEventId);
    if (forced) {
      return { event: forced, nextChangeUnixSec, isOverride: true };
    }
  }
  const event = MARKET_EVENTS[hourBucket % MARKET_EVENTS.length]!;
  return { event, nextChangeUnixSec, isOverride: false };
}
