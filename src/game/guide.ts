import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

export type GuideCategoryId = "dasar" | "usaha" | "koperasi" | "bahaya";

interface GuideSection {
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

const GUIDE_SECTIONS: Record<GuideCategoryId, GuideSection> = {
  dasar: {
    id: "dasar",
    buttonId: "btn_help_dasar",
    buttonLabel: "📖 Buka Lapak",
    title: "📖 Buku Pedoman Pasar KARSA — Buka Lapak & Kas Harian",
    color: 0xf59e0b,
    content:
      "📚 **Buku Pedoman Pedagang Pasar Malam KARSA** — Pilih tab di bawah untuk meninjau aturan kas, racikan kopi, koperasi, dan talangan:",
    description:
      "Panduan operasional lapak kopi dan pembukuan pasar malam **KARSA**. Kelola arus kas tunai, jadwal belanja bahan baku, dan reputasi dagang di lingkungan pasar.",
    fields: [
      {
        name: "🪪 1. Pendaftaran Lapak & Buku Kas (`/start`, `/portfolio`, `/card`)",
        value:
          "• Gunakan `/start` untuk membuka lapak pertama dengan **Modal Tunai Rp 10.000.000** dan **Simpanan Darurat Rp 2.000.000**.\n" +
          "• Gunakan `/portfolio` atau `/card` kapan saja untuk mencetak **Kartu Usaha & Buku Kas** milikmu maupun pedagang lain di pasar.",
      },
      {
        name: "☀️ 2. Uang Belanja Pasar & Streak (`/daily`)",
        value:
          "• Ambil uang belanja pasar setiap **20 jam** melalui `/daily` atau tombol **☀️ Modal Harian**.\n" +
          "• Pertahankan **Streak Harian** (jeda maks. **48 jam**) agar pencairan uang belanja naik bertahap hingga **Rp 2.750.000/hari** beserta tambahan Reputasi Pasar.",
      },
      {
        name: "⭐ 3. Reputasi Pasar (Skor 0–100)",
        value:
          "• **Reputasi ≥ 80:** Pengurus pasar memberikan **potongan biaya ekspansi 15%** untuk seluruh peningkatan aset usaha.\n" +
          "• **Reputasi < 35:** Lapak masuk daftar **pengawasan ketat petugas pasar** dan lebih sering terkena pemeriksaan takaran.",
      },
    ],
    footer: "KARSA • Buku Pedoman Pedagang Pasar Malam • Tab 1/4: Buka Lapak",
  },
  usaha: {
    id: "usaha",
    buttonId: "btn_help_usaha",
    buttonLabel: "☕ Seduh & Bahan",
    title: "☕ Buku Pedoman Pasar KARSA — Seduh Kopi & Aset Usaha",
    color: 0x10b981,
    content:
      "📚 **Buku Pedoman Pedagang Pasar Malam KARSA** — Aturan giliran seduh, belanja bahan baku, ekspansi kedai, dan brankas darurat:",
    description:
      "Pendapatan lapak ditentukan oleh pilihan bahan baku saat giliran seduh, tingkat ekspansi unit usaha, dan pemisahan kas operasional dari brankas darurat.",
    fields: [
      {
        name: "☕ 1. Giliran Seduh & Belanja Bahan Baku (`/work`)",
        value:
          "• Setiap giliran seduh menyajikan dua opsi racikan: **takaran murni Gayo** dengan setoran kas stabil (+Reputasi, +XP), atau **campuran oplosan** dengan margin kas instan lebih tinggi.\n" +
          "• Opsi campuran oplosan memiliki **risiko sidak paguyuban pasar 55%–70%** yang memotong langsung kas lapak untuk membayar **denda kas**.",
      },
      {
        name: "🏪 2. Ekspansi Kedai & Klaim Omzet Harian (`/bisnis`)",
        value:
          "• Tingkatkan level **Gerobak/Kedai Kopi**, **Simpanan Emas**, dan **Unit Koperasi** untuk memperbesar omzet pasif per jam.\n" +
          "• Tekan tombol **Klaim Hasil Usaha** di menu `/bisnis` untuk memindahkan akumulasi omzet harian ke kas tunai lapak.",
      },
      {
        name: "🛡️ 3. Simpanan Emas & Brankas Darurat",
        value:
          "• Pindahkan cadangan kas ke **Simpanan Emas / Brankas Darurat** melalui menu `/bisnis`.\n" +
          "• Saldo di dalam Brankas Darurat **100% terpisah dari kas lapak dan kebal penyegelan** saat terjadi eksekusi tunggakan.",
      },
    ],
    footer: "KARSA • Buku Pedoman Pedagang Pasar Malam • Tab 2/4: Seduh & Bahan",
  },
  koperasi: {
    id: "koperasi",
    buttonId: "btn_help_koperasi",
    buttonLabel: "🤝 Koperasi Pasar",
    title: "🤝 Buku Pedoman Pasar KARSA — Koperasi Pasar & Peringkat",
    color: 0x3b82f6,
    content:
      "📚 **Buku Pedoman Pedagang Pasar Malam KARSA** — Mekanika kas bersama koperasi pasar, papan peringkat kekayaan, dan katalog tema:",
    description:
      "Seluruh pedagang dalam satu server terhubung ke **Kas Koperasi Bersama** yang menentukan status subsidi pasar dan fasilitas talangan antarpelapak.",
    fields: [
      {
        name: "🏛️ 1. Kas Koperasi Bersama & Patungan (`/koperasi`)",
        value:
          "• Seluruh pedagang berbagi satu **Kas Koperasi Bersama satu server**.\n" +
          "• Tombol **Patungan Rp 1.000.000** memindahkan kas tunai ke kas bersama koperasi dan menambah **+5 Reputasi Pasar**.",
      },
      {
        name: "🤝 2. Talangi Lapak Warga (+20 Reputasi & +1 Gem)",
        value:
          "• Tombol **Talangi Lapak Warga** di `/koperasi` digunakan untuk **melunasi tunggakan rekan satu pasar** yang lapaknya tersegel.\n" +
          "• Setiap pelunasan tunggakan rekan memberikan **+20 Reputasi** dan **+1 💎 Gem** kepada penebus.",
      },
      {
        name: "🏆 3. Peringkat Pasar & Katalog Tema (`/leaderboard` & `/shop`)",
        value:
          "• Gunakan `/leaderboard` untuk melihat daftar **5 pedagang dengan kekayaan bersih tertinggi** beserta total kas koperasi server.\n" +
          "• Gunakan `/shop` untuk membuka **katalog tema Kartu Usaha** lengkap dengan **pratinjau langsung atas nama pedagang** sebelum membeli.",
      },
    ],
    footer: "KARSA • Buku Pedoman Pedagang Pasar Malam • Tab 3/4: Koperasi Pasar",
  },
  bahaya: {
    id: "bahaya",
    buttonId: "btn_help_bahaya",
    buttonLabel: "⚡ Talangan & Segel",
    title: "⚡ Buku Pedoman Pasar KARSA — Aturan Talangan Kilat & Surat Segel",
    color: 0xef4444,
    content:
      "📚 **Buku Pedoman Pedagang Pasar Malam KARSA** — Perhitungan bunga talangan kilat, meja putar belakang pasar, dan batas penyegelan:",
    description:
      "Menu `/jalan-pintas` memuat fasilitas **Talangan Kilat** dan **Meja Putar Belakang** dengan aturan perhitungan bunga harian serta batas eksekusi penyitaan aset.",
    fields: [
      {
        name: "💸 1. Talangan Kilat & Bunga Majemuk 8%/Hari",
        value:
          "• Pencairan **Talangan Kilat** memberikan **Rp 10.000.000 instan** ke kas tunai dengan beban **bunga majemuk 8%/hari**.\n" +
          "• Rumus tagihan berjalan: `A = P × (1 + 0,08)^hari` — nilai pokok dan akumulasi bunga bertambah setiap pergantian hari sampai dilunasi penuh.",
      },
      {
        name: "🎡 2. Meja Putar Belakang Pasar",
        value:
          "• Taruhan di **Meja Putar Belakang** menggunakan **peluang bandar tetap yang menggerus kas tunai** pada jangka panjang.\n" +
          "• Setiap putaran memotong langsung saldo kas operasional lapak sesuai nominal taruhan.",
      },
      {
        name: "🚨 3. Batas Tunggakan & Surat Segel Lapak",
        value:
          "• Akumulasi **tunggakan > Rp 20.000.000** otomatis memicu penerbitan **Surat Segel Lapak**.\n" +
          "• Eksekusi segel melakukan **penyitaan 1 level Kedai Kopi** dan membekukan status kartu hingga tunggakan lunas, **kecuali dana di Brankas Darurat** yang tetap utuh.",
      },
    ],
    footer: "KARSA • Buku Pedoman Pedagang Pasar Malam • Tab 4/4: Talangan & Segel",
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

  const embed = new EmbedBuilder()
    .setColor(section.color)
    .setTitle(section.title)
    .setDescription(section.description)
    .addFields(section.fields)
    .setFooter({ text: section.footer });

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
