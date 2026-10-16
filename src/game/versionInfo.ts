import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";

export const BOT_VERSION = "1.5.0";
export const RELEASE_DATE = "16 Oktober 2026";
export const RELEASE_TITLE = "v1.5.0 — High-Throughput Engine, Lifecycle Notifier & Strict <100 LOC Atomic";

export const PATCH_HIGHLIGHTS: readonly string[] = [
  "⚡ **High-Throughput Engine:** Prepared Statement Cache SQLite + 64MB MMAP + LRU PNG Render Cache (`0.01ms` hit) + Concurrency Guard.",
  "🔔 **Lifecycle Notifier:** Pemberitahuan otomatis saat bot **Online / Restart**, **Cek Update (`v1.5.0`)**, & **Graceful Off / Maintenance (`SIGTERM`)**.",
  "💬 **Sistem Feedback Warga:** Kirim masukan atau lapor bug langsung lewat tombol **💬 Kirim Feedback** (tersimpan ke DB & panel `/dev`).",
  "🧱 **Strict <100 LOC Atomic Architecture:** Seluruh file di `src/` dipecah menjadi modul atomic `< 100 baris` dengan standar `@biomejs/biome`.",
  "🐳 **Micro-Container Cgroup v2:** Kuota kontainer `0,50 vCPU` & `256 MB RAM` terpantau langsung di kartu `/dev`.",
];

export function buildUpdateInfoPayload() {
  const embed = new EmbedBuilder()
    .setColor(0x10b981)
    .setTitle(`🚀 KARSA Update & Patch Notes — ${RELEASE_TITLE}`)
    .setDescription(
      `**Versi Aktif:** \`v${BOT_VERSION}\` (${RELEASE_DATE})
` +
        `**Repositori:** [github.com/NojinNojs/karsa-bot](https://github.com/NojinNojs/karsa-bot/releases)

` +
        `**Pembaruan Terbaru (\`v${BOT_VERSION}\`):**
` +
        PATCH_HIGHLIGHTS.map((x) => `• ${x}`).join("\n"),
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("btn_feedback_open").setLabel("💬 Kirim Feedback").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("btn_help_dasar").setLabel("📖 Buku Pedoman").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("btn_portfolio_refresh").setLabel("🪪 Kartu Usaha").setStyle(ButtonStyle.Success),
  );
  return { content: "", embeds: [embed], components: [row] };
}
