import {
  SlashCommandBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";

/**
 * Custom IDs untuk seluruh Button & StringSelectMenu di pasar malam KARSA.
 */
export const CUSTOM_IDS = {
  // Tombol navigasi utama dari Portfolio Card
  BTN_WORK: "btn_work",
  BTN_BISNIS: "btn_bisnis",
  BTN_KOPERASI: "btn_koperasi",
  BTN_SHOP: "btn_shop",
  BTN_JALAN_PINTAS: "btn_jalan_pintas",
  BTN_PORTFOLIO_REFRESH: "btn_portfolio_refresh",
  BTN_DAILY: "btn_daily",
  BTN_LEADERBOARD: "btn_leaderboard",
  BTN_HELP: "btn_help",
  BTN_HELP_DASAR: "btn_help_dasar",
  BTN_HELP_USAHA: "btn_help_usaha",
  BTN_HELP_KOPERASI: "btn_help_koperasi",
  BTN_HELP_BAHAYA: "btn_help_bahaya",

  // Giliran Seduh & Bahan Baku (/work)
  BTN_WORK_JUJUR: "btn_work_jujur",
  BTN_WORK_CULAS: "btn_work_culas",

  // Aset & Bisnis (/bisnis)
  BTN_BISNIS_KEDAI: "btn_bisnis_kedai",
  BTN_BISNIS_BRANKAS: "btn_bisnis_brankas",
  BTN_BISNIS_SAHAM: "btn_bisnis_saham",
  BTN_BISNIS_CLAIM: "btn_bisnis_claim",
  BTN_BISNIS_DEPOSIT_DARURAT: "btn_bisnis_deposit_darurat",

  // Talangan Kilat & Meja Putar Belakang (/jalan-pintas)
  BTN_PINJOL_AMBIL: "btn_pinjol_ambil",
  BTN_JUDOL_SPIN: "btn_judol_spin",
  BTN_PINJOL_LUNASI: "btn_pinjol_lunasi",
  BTN_TOBAT_FINANSIAL: "btn_tobat_finansial",

  // Koperasi Warga (/koperasi)
  BTN_KOPERASI_PATUNGAN: "btn_koperasi_patungan",
  BTN_KOPERASI_TALANGI: "btn_koperasi_talangi",

  // Katalog Tema Kartu Usaha (/shop)
  SELECT_SKIN_PREVIEW: "select_skin_preview",
  BTN_SKIN_BUY_PREFIX: "btn_skin_buy:",
  BTN_SKIN_EQUIP_PREFIX: "btn_skin_equip:",
} as const;

export const startCommand = new SlashCommandBuilder()
  .setName("start")
  .setDescription(
    "🪪 Buka lapak warung kopi baru + terima modal tunai Rp 10 juta & simpanan darurat."
  );

export const helpCommand = new SlashCommandBuilder()
  .setName("help")
  .setDescription(
    "📖 Buku pedoman pedagang pasar malam: aturan kas, racikan kopi, koperasi & talangan."
  );

export const dailyCommand = new SlashCommandBuilder()
  .setName("daily")
  .setDescription(
    "☀️ Ambil uang belanja pasar tiap 20 jam + tambahan bonus streak kehadiran harian."
  );

export const portfolioCommand = new SlashCommandBuilder()
  .setName("portfolio")
  .setDescription(
    "🪪 Cetak Kartu Usaha & buku kas milikmu atau pedagang lain di pasar."
  )
  .addUserOption((opt) =>
    opt
      .setName("warga")
      .setDescription("Pedagang yang ingin dilihat Kartu Usahanya (opsional)")
      .setRequired(false)
  );

export const cardCommand = new SlashCommandBuilder()
  .setName("card")
  .setDescription(
    "🪪 Pintasan /portfolio — Cetak Kartu Usaha & buku kas pedagang pasar malam."
  )
  .addUserOption((opt) =>
    opt
      .setName("warga")
      .setDescription("Pedagang yang ingin dilihat Kartu Usahanya (opsional)")
      .setRequired(false)
  );

export const workCommand = new SlashCommandBuilder()
  .setName("work")
  .setDescription(
    "☕ Giliran seduh kopi & belanja bahan baku: takaran murni Gayo atau racikan campuran."
  );

export const bisnisCommand = new SlashCommandBuilder()
  .setName("bisnis")
  .setDescription(
    "🏪 Ekspansi Gerobak/Kedai Kopi, Simpanan Emas, Unit Koperasi & klaim omzet harian."
  );

export const jalanPintasCommand = new SlashCommandBuilder()
  .setName("jalan-pintas")
  .setDescription(
    "⚡ Fasilitas talangan kilat (bunga 8%/hari) & meja putar belakang pasar malam."
  );

export const koperasiCommand = new SlashCommandBuilder()
  .setName("koperasi")
  .setDescription(
    "🤝 Kas koperasi bersama satu server: patungan modal & talangi tunggakan lapak rekan."
  );

export const leaderboardCommand = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription(
    "🏆 Papan peringkat 5 pedagang dengan kekayaan bersih tertinggi di pasar malam."
  );

export const shopCommand = new SlashCommandBuilder()
  .setName("shop")
  .setDescription(
    "🎨 Katalog tema Kartu Usaha dengan pratinjau langsung atas nama lapakmu."
  );

export const COMMAND_BUILDERS = [
  startCommand,
  helpCommand,
  dailyCommand,
  portfolioCommand,
  cardCommand,
  workCommand,
  bisnisCommand,
  koperasiCommand,
  leaderboardCommand,
  shopCommand,
  jalanPintasCommand,
] as const;

export const COMMAND_DEFINITIONS: RESTPostAPIChatInputApplicationCommandsJSONBody[] =
  COMMAND_BUILDERS.map((builder) => builder.toJSON());

export const COMMANDS = COMMAND_DEFINITIONS;

export function getSlashCommandsJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
  return COMMAND_DEFINITIONS;
}
