import { type RESTPostAPIChatInputApplicationCommandsJSONBody, SlashCommandBuilder } from "discord.js";
import { CUSTOM_IDS } from "./customIds.ts";

export { CUSTOM_IDS };

export const startCommand = new SlashCommandBuilder()
  .setName("start")
  .setDescription("🪪 Daftar lapak pertama dari nol: Lv.1 Perintis, Modal Kas Rp 500.000 & Kedai Kopi Lv.1.");

export const helpCommand = new SlashCommandBuilder()
  .setName("help")
  .setDescription("📖 Buku pedoman pedagang pasar malam, info update terbaru, & kirim feedback.");

export const dailyCommand = new SlashCommandBuilder()
  .setName("daily")
  .setDescription("☀️ Ambil uang belanja pasar tiap 20 jam + tambahan bonus streak & Permata (💎).");

export const portfolioCommand = new SlashCommandBuilder()
  .setName("portfolio")
  .setDescription("🪪 Cetak Kartu Usaha & buku kas milikmu atau pedagang lain di pasar.")
  .addUserOption((o) => o.setName("warga").setDescription("Pedagang yang ingin dilihat (opsional)").setRequired(false));

export const cardCommand = new SlashCommandBuilder()
  .setName("card")
  .setDescription("🪪 Pintasan /portfolio — Cetak Kartu Usaha & buku kas pedagang pasar malam.")
  .addUserOption((o) => o.setName("warga").setDescription("Pedagang yang ingin dilihat (opsional)").setRequired(false));

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

export const updateCommand = new SlashCommandBuilder()
  .setName("update")
  .setDescription("🚀 Cek versi bot aktif, catatan rilis (Patch Notes) terbaru, & kirim feedback.");

export const feedbackCommand = new SlashCommandBuilder()
  .setName("feedback")
  .setDescription("💬 Kirim saran fitur, masukan keseimbangan ekonomi, atau lapor bug ke Developer.");

export const devCommand = new SlashCommandBuilder()
  .setName("dev")
  .setDescription("🛠️ Panel kontrol, monitor telemetri Docker cgroup, broadcast update/off & alat Developer.");

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
  updateCommand,
  feedbackCommand,
  devCommand,
] as const;

export const COMMAND_DEFINITIONS: RESTPostAPIChatInputApplicationCommandsJSONBody[] = COMMAND_BUILDERS.map((b) => b.toJSON());

export const COMMANDS = COMMAND_DEFINITIONS;

export function getSlashCommandsJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
  return COMMAND_DEFINITIONS;
}
