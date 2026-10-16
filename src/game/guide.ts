import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { getCurrentMarketEvent, PRESTIGE_RANKS } from "./mechanics.ts";

export type GuideCategoryId = "dasar" | "usaha" | "koperasi" | "bahaya";

export interface GuideSection {
  id: GuideCategoryId;
  buttonId: string;
  buttonLabel: string;
  title: string;
  color: number;
  content: string;
  description: string;
  fields: Array<{ name: string; value: string; inline?: boolean }>;
  footer: string;
}

export const GUIDE_SECTIONS: Record<GuideCategoryId, GuideSection> = {
  dasar: {
    id: "dasar",
    buttonId: "btn_help_dasar",
    buttonLabel: "📖 Buka Lapak",
    title: "📖 Buku Pedoman Pasar KARSA — Buka Lapak & Pohon Progresi",
    color: 0xf59e0b,
    content:
      "📚 **Buku Pedoman Pedagang Pasar Malam KARSA** — Pilih tab di bawah untuk meninjau aturan modal awal, ekspansi bertahap, koperasi, dan penyegelan lapak:",
    description:
      "Panduan resmi merintis usaha dari nol di Pasar Malam **KARSA**. Setiap pedagang wajib terdaftar dan membuka fasilitas secara bertahap lewat kerja keras & reputasi.",
    fields: [
      {
        name: "🪪 1. Syarat Wajib Daftar & Modal Awal (`/start`)",
        value:
          "• **Gerbang Pendaftaran:** Warga yang belum terdaftar wajib menjalankan `/start` atau menekan tombol **`[🪪 Buka Lapak Pertama (/start)]`** sebelum memakai fitur pasar lainnya.\n" +
          "• **Paket Rintisan dari Nol:** Memulai di **Level 1**, **Modal Kas Rp 500.000**, **Brankas Darurat Rp 0 (Terkunci)**, **Kedai Kopi Lv.1 (Nilai Rp 1.500.000, Omzet Rp 150.000)**, **Saham Koperasi Lv.0 (Terkunci)**, dan **Nama Baik 60/100**.\n" +
          "• **Anti-Reset:** Menjalankan `/start` kembali saat sudah punya lapak **tidak pernah mereset progres** (hanya menampilkan Kartu Usaha terbaru).",
      },
      {
        name: "🌳 2. Pohon Progresi 1-2-3 (Urutan Buka Fitur)",
        value:
          "• **Tahap 1 — Rintis Kas & Level:** Kerja seduh kopi (`/work`), klaim omzet Kedai Kopi Lv.1 (`/bisnis`), dan ambil modal harian (`/daily`) untuk mengumpulkan kas & XP.\n" +
          "• **Tahap 2 — Buka Brankas & Koperasi:** Upgrade **Kedai Kopi ke Lv.2** untuk membuka **Brankas Emas**; capai **Level 2 (≥ 100 XP)** tanpa utang pinjol untuk ikut **Patungan & Talangi Warga** di `/koperasi`.\n" +
          "• **Tahap 3 — Saham Koperasi & Kemapanan:** Upgrade **Kedai Kopi ke Lv.3+** dan miliki kontribusi **Patungan Koperasi** (atau **Nama Baik ≥ 65**) untuk membuka **Saham Koperasi**.",
      },
      {
        name: "⭐ 3. Nama Baik / Reputasi Pasar (Skor 0–100)",
        value:
          "• **Nama Baik ≥ 80:** Pengurus pasar memberikan **diskon biaya ekspansi 15%** untuk seluruh peningkatan aset usaha di `/bisnis`.\n" +
          "• **Nama Baik < 35:** Lapak masuk daftar **pengawasan ketat petugas pasar** dan lebih sering terkena sidak takaran.",
      },
    ],
    footer: "KARSA • Buku Pedoman Pedagang Pasar Malam • Tab 1/4: Buka Lapak",
  },
  usaha: {
    id: "usaha",
    buttonId: "btn_help_usaha",
    buttonLabel: "☕ Seduh & Bisnis",
    title: "☕ Buku Pedoman Pasar KARSA — Cooldown Kerja, Klaim & Syarat Ekspansi",
    color: 0x10b981,
    content:
      "📚 **Buku Pedoman Pedagang Pasar Malam KARSA** — Aturan jeda waktu (cooldown) kerja seduh, klaim omzet, modal harian, dan syarat buka unit usaha:",
    description:
      "Setiap aktivitas operasional memiliki jeda waktu (cooldown) dan prasyarat level kedai agar ekonomi pasar tumbuh secara sehat dan bertahap.",
    fields: [
      {
        name: "☕ 1. Giliran Seduh (`/work`) — Cooldown 30 Detik & Auto Level-Up",
        value:
          "• **Cooldown Shift:** Jeda antar giliran seduh adalah **30 detik**. Pilih racikan **Jujur/Etis** (+Kas stabil, +Nama Baik, +35 XP) atau **Oplosan** (margin instan tinggi namun berisiko sidak & denda).\n" +
          "• **Rumus Level Otomatis:** Setiap kelipatan 100 XP langsung menaikkan level pedagang secara otomatis (`level = 1 + Math.floor(xp / 100)`).",
      },
      {
        name: "🏪 2. Klaim Omzet (`/bisnis`) — Cooldown 5 Menit & Uang Harian (`/daily`)",
        value:
          "• **Klaim Omzet Pasif (`/bisnis`):** Cooldown **5 menit** per pencairan. Wajib memiliki minimal **1 unit usaha aktif (Lv.1+)** dan **lapak tidak sedang disegel** (`is_seized === 0`).\n" +
          "• **Modal Harian (`/daily`):** Cooldown **20 jam** dengan batas jendela streak **48 jam** (bonus bertahap hingga Rp 2.750.000/hari + Nama Baik).",
      },
      {
        name: "🔒 3. Syarat Buka Unit Usaha (Gate B & Gate C)",
        value:
          "• **Gate B — Brankas Emas (`brankas_darurat`):** Terkunci di awal (`Lv.0`). Wajib menaikkan **Kedai Kopi ke Lv.2+** terlebih dahulu sebelum bisa membuka/menabung di Brankas Emas.\n" +
          "• **Gate C — Saham Koperasi (`saham_koperasi`):** Terkunci di awal (`Lv.0`). Wajib memiliki **Kedai Kopi Lv.3+** DAN sudah pernah **Patungan Koperasi** (atau **Nama Baik ≥ 65**).",
      },
    ],
    footer: "KARSA • Buku Pedoman Pedagang Pasar Malam • Tab 2/4: Seduh & Bisnis",
  },
  koperasi: {
    id: "koperasi",
    buttonId: "btn_help_koperasi",
    buttonLabel: "🤝 Koperasi & Toko",
    title: "🤝 Buku Pedoman Pasar KARSA — Koperasi Bersama, Peringkat & Toko Skin",
    color: 0x3b82f6,
    content:
      "📚 **Buku Pedoman Pedagang Pasar Malam KARSA** — Mekanika Kas Koperasi Bersama mulai dari Rp 0, syarat patungan/talangan, dan toko skin:",
    description:
      "Seluruh pedagang dalam satu server membangun **Kas Koperasi Bersama** dari nol dan wajib bebas tunggakan pinjol untuk mengakses fasilitas komunitas maupun gaya hidup.",
    fields: [
      {
        name: "🏛️ 1. Kas Koperasi Bersama Mulai dari Nol (`/koperasi`)",
        value:
          "• **Mulai Murni dari Nol:** Kas Koperasi server baru dimulai dari **Rp 0 (0% / Lv.1 Pasar Rintisan)** dan hanya bertambah dari setoran nyata para pedagang.\n" +
          "• Setiap patungan memperkuat persentase kesehatan ekosistem pasar dan membuka bonus dividen koperasi bersama.",
      },
      {
        name: "🤝 2. Gate D — Syarat Patungan & Talangi Warga (`/koperasi`)",
        value:
          "• **Syarat Akses (Gate D):** Tombol **Patungan Rp 1.000.000** (+5 Nama Baik) dan **Talangi Warga Rp 1.500.000** (+15–20 Nama Baik & +1 💎 Gem) mewajibkan **Player Level 2+** dan **0 utang pinjol aktif (`pinjol_debt === 0`)** serta lapak tidak disegel.\n" +
          "• **Efek Talangi Warga:** Menebus rekan pedagang di `/koperasi` langsung **melunasi tagihan pinjol & membuka segel lapak** warga yang ditolong!",
      },
      {
        name: "🎨 3. Gate E — Toko Skin (`/shop`) & Peringkat Asli (`/leaderboard`)",
        value:
          "• **Syarat Toko Skin (Gate E):** Pembelian atau penggantian tema Kartu Usaha di `/shop` mewajibkan **0 utang pinjol aktif (`pinjol_debt === 0`)** dan **lapak tidak disegel (`is_seized === 0`)**.\n" +
          "• **Papan Peringkat Murni (`/leaderboard`):** Hanya menampilkan pedagang asli yang terdaftar lewat `/start` (tanpa NPC buatan).",
      },
    ],
    footer: "KARSA • Buku Pedoman Pedagang Pasar Malam • Tab 3/4: Koperasi & Toko",
  },
  bahaya: {
    id: "bahaya",
    buttonId: "btn_help_bahaya",
    buttonLabel: "⚡ Pinjol & Segel",
    title: "⚡ Buku Pedoman Pasar KARSA — Risiko Pinjol, Segel Lapak & Cara Tebus",
    color: 0xef4444,
    content:
      "📚 **Buku Pedoman Pedagang Pasar Malam KARSA** — Konsekuensi jalan pintas (Pinjol/Judol), pembekuan saat Surat Segel Lapak turun, dan prosedur pelunasan:",
    description:
      "Mengambil jalan pintas di `/jalan-pintas` (Pinjol Kilat / Meja Putar) memicu utang berbunga mencekik dan penyegelan lapak oleh Debt Collector.",
    fields: [
      {
        name: "🚨 1. Dampak Surat Segel Lapak (`is_seized === 1`)",
        value:
          "• Saat mengambil Pinjol Ilegal atau terjerat tunggakan, status lapak berubah menjadi **WARUNG DISEGEL (`is_seized === 1`)**.\n" +
          "• **Rekening & Ekspansi Dibekukan:** Selama disegel atau masih memiliki utang pinjol, kamu **TIDAK BISA upgrade bisnis**, **TIDAK BISA klaim omzet pasif**, **TIDAK BISA ikut koperasi**, dan **TIDAK BISA belanja skin di `/shop`**.",
      },
      {
        name: "🛡️ 2. Perlindungan 100% Brankas Darurat",
        value:
          "• **Kebal Sita:** Saldo yang sudah diamankan di **Brankas Darurat (Simpanan Emas)** tetap **100% aman dan tidak dapat disentuh Debt Collector** meskipun lapak disegel.",
      },
      {
        name: "💸 3. Cara Bangkit & Membuka Segel Lapak",
        value:
          "• **Giliran Kerja Tetap Buka:** Meskipun lapak disegel, kamu **tetap bisa menjalankan `/work`** (seduh kopi tiap 30 detik) untuk mengumpulkan uang tunai.\n" +
          "• **Cicil / Lunasi Tagihan:** Gunakan kas hasil `/work` dan tekan tombol **`[💸 Cicil / Lunasi Tagihan]`** di `/jalan-pintas`, `/bisnis`, atau `/portfolio` (atau minta rekan menebus lewat **Talangi Warga** di `/koperasi`) hingga sisa utang **Rp 0** untuk mencabut segel lapak!",
      },
    ],
    footer: "KARSA • Buku Pedoman Pedagang Pasar Malam • Tab 4/4: Pinjol & Segel",
  },
};

export function buildHelpEmbedsAndComponents(
  category: GuideCategoryId | string = "dasar"
): {
  content: string;
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
} {
  const normalized = category.replace(/^btn_help_/, "").toLowerCase();
  const activeId: GuideCategoryId =
    normalized === "dasar" ||
    normalized === "usaha" ||
    normalized === "koperasi" ||
    normalized === "bahaya"
      ? normalized
      : "dasar";
  const section = GUIDE_SECTIONS[activeId];
  const { event, nextChangeUnixSec } = getCurrentMarketEvent();

  const embed = new EmbedBuilder()
    .setColor(section.color)
    .setTitle(section.title)
    .setDescription(section.description)
    .addFields(section.fields)
    .addFields({
      name: "🌤️ Cuaca Pasar Sekarang (Live)",
      value: `${event.title} — ${event.goldBonusNote}\n**Berganti otomatis <t:${nextChangeUnixSec}:R>** (tepat pada <t:${nextChangeUnixSec}:t>)`,
      inline: false,
    })
    .addFields({
      name: "🎖️ Tangga Jabatan Pedagang (Prestige)",
      value: PRESTIGE_RANKS.map((r) => `**Lv.${r.minLevel}+** ${r.title}`).join(" • "),
      inline: false,
    })
    .setFooter({ text: section.footer })
    .setTimestamp();

  const categoryOrder: GuideCategoryId[] = [
    "dasar",
    "usaha",
    "koperasi",
    "bahaya",
  ];

  const row = new ActionRowBuilder<ButtonBuilder>();

  for (const catId of categoryOrder) {
    const item = GUIDE_SECTIONS[catId];
    const isActive = catId === activeId;
    const style = isActive
      ? catId === "bahaya"
        ? ButtonStyle.Danger
        : ButtonStyle.Primary
      : ButtonStyle.Secondary;

    row.addComponents(
      new ButtonBuilder()
        .setCustomId(item.buttonId)
        .setLabel(item.buttonLabel)
        .setStyle(style)
    );
  }

  row.addComponents(
    new ButtonBuilder()
      .setCustomId("btn_portfolio_refresh")
      .setLabel("🪪 Buka Kartu Usaha")
      .setStyle(ButtonStyle.Success)
  );

  return {
    content: section.content,
    embeds: [embed],
    components: [row],
  };
}
