import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, type Client, EmbedBuilder, type TextChannel } from "discord.js";
import { checkpointWal, getSystemMeta, setSystemMeta } from "../db/index.ts";
import { BOT_VERSION, PATCH_HIGHLIGHTS, RELEASE_TITLE } from "../game/versionInfo.ts";

async function findAnnouncementChannel(client: Client): Promise<TextChannel | null> {
  const explicitId = process.env.DISCORD_STATUS_CHANNEL_ID?.trim();
  if (explicitId) {
    const ch = await client.channels.fetch(explicitId).catch(() => null);
    if (ch && ch.type === ChannelType.GuildText) return ch as TextChannel;
  }
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  const guild = guildId ? client.guilds.cache.get(guildId) : client.guilds.cache.first();
  if (!guild) return null;

  const channels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText);
  const preferred = channels.find((c) => /general|umum|karsa|pasar|info|utama/i.test(c.name));
  return ((preferred || channels.first()) as TextChannel | undefined) ?? null;
}

export async function notifyBotOnline(client: Client, forceUpdateBanner = false): Promise<boolean> {
  try {
    const channel = await findAnnouncementChannel(client);
    if (!channel) return false;

    const prevVersion = getSystemMeta("last_version");
    const isNewUpdate = forceUpdateBanner || (prevVersion !== null && prevVersion !== BOT_VERSION);
    setSystemMeta("last_version", BOT_VERSION);
    setSystemMeta("last_boot_at", String(Date.now()));

    const pingMs = Math.max(1, Math.round(client.ws.ping || 38));
    const embed = new EmbedBuilder()
      .setColor(isNewUpdate ? 0xf59e0b : 0x10b981)
      .setTitle(
        isNewUpdate ? `🚀 UPDATE TERBARU AKTIF: KARSA ${RELEASE_TITLE}` : `🟢 KARSA KEMBALI ONLINE • v${BOT_VERSION} (Ping ${pingMs}ms)`,
      )
      .setDescription(
        isNewUpdate
          ? `Pembaruan sistem **\`v${BOT_VERSION}\`** telah terpasang di server!\n\n` + PATCH_HIGHLIGHTS.map((x) => `• ${x}`).join("\n")
          : "☕ **Gerobak & Pasar Malam Kembali Buka!** Seluruh buku kas SQLite WAL, tabungan emas, dan koperasi warga siap digunakan kembali.",
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("btn_check_update").setLabel(`📋 Patch Notes v${BOT_VERSION}`).setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("btn_feedback_open").setLabel("💬 Kirim Feedback").setStyle(ButtonStyle.Secondary),
    );

    await channel.send({ embeds: [embed], components: [row] });
    return true;
  } catch {
    return false;
  }
}

export async function notifyBotOffline(client: Client, reason = "Restart / Pembaruan Sistem"): Promise<boolean> {
  try {
    checkpointWal();
    setSystemMeta("last_shutdown_at", String(Date.now()));
    const channel = await findAnnouncementChannel(client);
    if (!channel) return false;

    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle("🔴 PEMBERITAHUAN: KARSA Sedang Off / Restart Sebentar")
      .setDescription(
        `🛠️ **Status:** \`${reason}\` (Versi \`v${BOT_VERSION}\`)\n` +
          "💾 **Database Aman:** Seluruh transaksi SQLite WAL, Laci Kas, dan Tabungan Emas warga telah disimpan ke disk.\n" +
          "⏳ Bot akan otomatis kembali **Online** sesaat lagi!",
      );

    await channel.send({ embeds: [embed] });
    return true;
  } catch {
    return false;
  }
}
