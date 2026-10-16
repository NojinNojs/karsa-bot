import { type RESTPostAPIChatInputApplicationCommandsJSONBody, SlashCommandBuilder } from "discord.js";

/**
 * Custom IDs untuk seluruh Button & StringSelectMenu di pasar malam KARSA.
 */
export const CUSTOM_IDS = {
  // Onboarding & Registrasi Lapak
  BTN_START_LAPAK: "btn_start_lapak",

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
  BTN_REPAY_DEBT: "btn_repay_debt",
  BTN_REPAY_MODAL_OPEN: "btn_repay_modal_open",
  MODAL_REPAY_DEBT: "modal_repay_debt",
  INPUT_REPAY_AMOUNT: "input_repay_amount",
  BTN_PINJOL_LUNASI: "btn_pinjol_lunasi",
  BTN_TOBAT_FINANSIAL: "btn_tobat_finansial",

  // Koperasi Warga (/koperasi)
  BTN_KOPERASI_PATUNGAN: "btn_koperasi_patungan",
  BTN_KOPERASI_PATUNGAN_MODAL: "btn_koperasi_patungan_modal",
  MODAL_COOP_PATUNGAN: "modal_coop_patungan",
  INPUT_PATUNGAN_AMOUNT: "input_patungan_amount",
  BTN_KOPERASI_TALANGI: "btn_koperasi_talangi",

  // Katalog Tema Kartu Usaha (/shop)
  SELECT_SKIN_PREVIEW: "select_skin_preview",
  BTN_SKIN_BUY_PREFIX: "btn_skin_buy:",
  BTN_SKIN_EQUIP_PREFIX: "btn_skin_equip:",

  // Developer Ops & Telemetry Console (/dev)
  BTN_DEV_REFRESH: "btn_dev_refresh",
  BTN_DEV_CLEAR_CD: "btn_dev_clear_cd",
  BTN_DEV_GRANT_MODAL: "btn_dev_grant_modal",
  MODAL_DEV_GRANT: "modal_dev_grant",
  INPUT_DEV_TARGET: "input_dev_target",
  INPUT_DEV_CASH: "input_dev_cash",
  INPUT_DEV_STATS: "input_dev_stats",
  BTN_DEV_SPAWN_DUMMY: "btn_dev_spawn_dummy",
  BTN_DEV_WIPE_ASK: "btn_dev_wipe_ask",
  BTN_DEV_WIPE_CONFIRM: "btn_dev_wipe_confirm",
  SELECT_DEV_MARKET: "select_dev_market",
} as const;

export const startCommand = new SlashCommandBuilder()
  .setName("start")
  .setDescription("🪪 Daftar lapak pertama dari nol: Lv.1 Perintis, Modal Kas Rp 500.000 & Kedai Kopi Lv.1.");

export const helpCommand = new SlashCommandBuilder()
  .setName("help")
  .setDescription("📖 Buku pedoman pedagang pasar malam: aturan kas, racikan kopi, koperasi & talangan.");

export const dailyCommand = new SlashCommandBuilder()
  .setName("daily")
  .setDescription("☀️ Ambil uang belanja pasar tiap 20 jam + tambahan bonus streak kehadiran harian.");

export const portfolioCommand = new SlashCommandBuilder()
  .setName("portfolio")
  .setDescription("🪪 Cetak Kartu Usaha & buku kas milikmu atau pedagang lain di pasar.")
  .addUserOption((opt) =>
    opt
      .setName("warga")
      .setDescription("Pedagang yang ingin dilihat Kartu Usahanya (opsional)")
      .setRequired(false),
  );

export const cardCommand = new SlashCommandBuilder()
  .setName("card")
  .setDescription("🪪 Pintasan /portfolio — Cetak Kartu Usaha & buku kas pedagang pasar malam.")
  .addUserOption((opt) =>
    opt
      .setName("warga")
      .setDescription("Pedagang yang ingin dilihat Kartu Usahanya (opsional)")
      .setRequired(false),
  );

export const workCommand = new SlashCommandBuilder()
  .setName("work")
  .setDescription("☕ Giliran seduh kopi & belanja bahan baku: takaran murni Gayo atau racikan campuran.");

export const bisnisCommand = new SlashCommandBuilder()
  .setName("bisnis")
  .setDescription("🏪 Ekspansi Gerobak/Kedai Kopi, Simpanan Emas, Unit Koperasi & klaim omzet harian.");

export const jalanPintasCommand = new SlashCommandBuilder()
  .setName("jalan-pintas")
  .setDescription("⚡ Fasilitas talangan kilat (bunga 8%/hari) & meja putar belakang pasar malam.");

export const koperasiCommand = new SlashCommandBuilder()
  .setName("koperasi")
  .setDescription("🤝 Kas koperasi bersama satu server: patungan modal & talangi tunggakan lapak rekan.");

export const leaderboardCommand = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("🏆 Papan peringkat 5 pedagang dengan kekayaan bersih tertinggi di pasar malam.");

export const shopCommand = new SlashCommandBuilder()
  .setName("shop")
  .setDescription("🎨 Katalog tema Kartu Usaha dengan pratinjau langsung atas nama lapakmu.");

export const devCommand = new SlashCommandBuilder()
  .setName("dev")
  .setDescription("🛠️ Panel kontrol, monitor telemetri real-time, simulasi pasar & alat uji Developer KARSA.");

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
  devCommand,
] as const;

export const COMMAND_DEFINITIONS: RESTPostAPIChatInputApplicationCommandsJSONBody[] = COMMAND_BUILDERS.map(
  (builder) => builder.toJSON(),
);

export const COMMANDS = COMMAND_DEFINITIONS;

export function getSlashCommandsJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
  return COMMAND_DEFINITIONS;
}
