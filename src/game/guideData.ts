export type GuideCategoryId = "dasar" | "usaha" | "koperasi" | "bahaya";

export interface GuideSection {
  id: GuideCategoryId;
  buttonId: string;
  buttonLabel: string;
  title: string;
  color: number;
  lines: string[];
}

export const GUIDE_SECTIONS: Record<GuideCategoryId, GuideSection> = {
  dasar: {
    id: "dasar",
    buttonId: "btn_help_dasar",
    buttonLabel: "📖 Cara Mulai",
    title: "📖 Panduan Singkat — Cara Mulai",
    color: 0xf59e0b,
    lines: [
      "1️⃣ **Buka Lapak (`/start`)** — Dapat modal awal **Rp 500Rb** & **Kedai Kopi Lv.1**.",
      "2️⃣ **Seduh Kopi (`☕ Seduh`)** — Kerja tiap **30 detik** buat kumpulin Kas, XP, & Nama Baik.",
      "3️⃣ **Uang Harian (`☀️ Uang Harian`)** — Klaim modal tambahan & Permata (`💎`) tiap **20 jam**.",
      "4️⃣ **Naik Level** — Tiap **100 XP** otomatis naik level, dapat **+1 💎**, & membuka fitur baru.",
    ],
  },
  usaha: {
    id: "usaha",
    buttonId: "btn_help_usaha",
    buttonLabel: "🏪 Buka Usaha",
    title: "🏪 Panduan Singkat — Urutan Buka Usaha",
    color: 0x10b981,
    lines: [
      "☕ **Kedai Kopi (Terbuka dari Lv.1)** — Menghasilkan omzet pasif yang bisa dicairkan tiap **5 menit**.",
      "🛡️ **Tabungan Emas (Syarat: Kedai Lv.2)** — Uang di sini **100% aman & kebal sita** kalau lapak kena masalah.",
      "🤝 **Koperasi Warga (Syarat: Kedai Lv.3 & Nama Baik 65)** — Bagi hasil dividen rutin dari pasar.",
      "⭐ **Bonus Nama Baik ≥ 80** — Biaya *upgrade* usaha & potongan sewa pasar diskon **15%**!",
    ],
  },
  koperasi: {
    id: "koperasi",
    buttonId: "btn_help_koperasi",
    buttonLabel: "🤝 Koperasi & Tema",
    title: "🤝 Panduan Singkat — Koperasi & Tema Kartu",
    color: 0x3b82f6,
    lines: [
      "🔓 **Syarat Koperasi** — Terbuka setelah kamu mencapai **Level 2** dan bebas tunggakan.",
      "🤝 **Patungan Kas (Rp 1,5Jt)** — Nambah kas koperasi server, naikin Level Pasar (**+5% Omzet/Lv**), & **+8 Nama Baik**.",
      "🛟 **Tebus Warga (Rp 1,5Jt)** — Bebasin segel lapak rekan satu server, dapat **+25 Nama Baik** & **+2 💎 Permata**.",
      "🎨 **Tema Kartu (`/shop`)** — Coba *live preview* dan beli tema kartu pakai **Kas (Rp)** atau **Permata (💎)**.",
    ],
  },
  bahaya: {
    id: "bahaya",
    buttonId: "btn_help_bahaya",
    buttonLabel: "⚡ Talangan & Segel",
    title: "⚡ Panduan Singkat — Risiko Talangan & Segel",
    color: 0xef4444,
    lines: [
      "💸 **Talangan Kilat (`/jalan-pintas`)** — Cair instan tapi berbunga tinggi & rawan sita alat usaha.",
      "🚨 **Surat Segel Lapak** — Kalau tunggakan mencapai **Rp 2Jt**, lapak disegel (tidak bisa *upgrade* & klaim omzet).",
      "🛡️ **Tabungan Emas Tetap Aman** — Penagih hanya menyita kas laci, saldo Tabungan Emas 100% kebal sita.",
      "🔓 **Cara Buka Segel** — Kerja di **☕ Seduh Cari Uang** lalu klik **💸 Bayar Segel**, atau klik **🛟 Minta Tebus Warga**!",
    ],
  },
};
