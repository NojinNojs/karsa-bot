import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { devClearAllCooldowns, devSpawnDummyVictim, getRecentFeedback, resetAllUserData } from "../db/index.ts";
import { notifyBotOffline, notifyBotOnline } from "../lifecycle/notifier.ts";
import { CUSTOM_IDS } from "./customIds.ts";
import { buildDevConsolePayload, isDeveloperUser } from "./devPayload.ts";

const DEV_BTN_SET = new Set<string>([
  CUSTOM_IDS.BTN_DEV_REFRESH,
  CUSTOM_IDS.BTN_DEV_CLEAR_CD,
  CUSTOM_IDS.BTN_DEV_GRANT_MODAL,
  CUSTOM_IDS.BTN_DEV_SPAWN_DUMMY,
  CUSTOM_IDS.BTN_DEV_FEEDBACK,
  CUSTOM_IDS.BTN_DEV_ANNOUNCE_UPDATE,
  CUSTOM_IDS.BTN_DEV_ANNOUNCE_OFF,
  CUSTOM_IDS.BTN_DEV_WIPE_ASK,
  CUSTOM_IDS.BTN_DEV_WIPE_CONFIRM,
]);

function rowInput(id: string, label: string): ActionRowBuilder<TextInputBuilder> {
  return new ActionRowBuilder<TextInputBuilder>().addComponents(
    new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(TextInputStyle.Short).setRequired(false),
  );
}

export async function handleDevButtonInteraction(interaction: ButtonInteraction, id: string, guildId: string): Promise<boolean> {
  if (!DEV_BTN_SET.has(id)) return false;
  if (!isDeveloperUser(interaction)) {
    await interaction.reply({ content: "⛔ Khusus Developer KARSA.", flags: MessageFlags.Ephemeral });
    return true;
  }
  const wsPing = Math.max(1, Math.round(interaction.client.ws.ping || 42));

  if (id === CUSTOM_IDS.BTN_DEV_GRANT_MODAL) {
    const modal = new ModalBuilder().setCustomId(CUSTOM_IDS.MODAL_DEV_GRANT).setTitle("🎁 Suntik Kas / Edit Stats Pemain");
    modal.addComponents(
      rowInput(CUSTOM_IDS.INPUT_DEV_TARGET, "Username / ID (Kosong = Akunmu)"),
      rowInput(CUSTOM_IDS.INPUT_DEV_CASH, "Kas Rp (+Tambah / Angka Pasti)"),
      rowInput(CUSTOM_IDS.INPUT_DEV_STATS, "level=3, gems=15, karma=95, lunas"),
    );
    await interaction.showModal(modal);
    return true;
  }

  await interaction.deferUpdate();
  if (id === CUSTOM_IDS.BTN_DEV_REFRESH) {
    await interaction.editReply(buildDevConsolePayload(guildId, wsPing, "✅ **Telemetri disegarkan!**"));
  } else if (id === CUSTOM_IDS.BTN_DEV_CLEAR_CD) {
    await interaction.editReply(
      buildDevConsolePayload(guildId, wsPing, `⚡ **Cooldown di-reset untuk ${devClearAllCooldowns()} pemain!**`),
    );
  } else if (id === CUSTOM_IDS.BTN_DEV_SPAWN_DUMMY) {
    const dummy = devSpawnDummyVictim(guildId);
    await interaction.editReply(
      buildDevConsolePayload(guildId, wsPing, `🛟 **Korban Segel \`${dummy.username}\` (Rp 1,5Jt) siap ditebus!**`),
    );
  } else if (id === CUSTOM_IDS.BTN_DEV_FEEDBACK) {
    const list = getRecentFeedback(6);
    const txt = list.length
      ? list.map((f) => `• <t:${Math.floor(f.created_at / 1000)}:R> **${f.username}** [\`${f.category}\`]: ${f.message}`).join("\n")
      : "• *(Belum ada feedback masuk dari pemain)*";
    await interaction.editReply(buildDevConsolePayload(guildId, wsPing, `📬 **Kotak Feedback Warga Terbaru:**\n${txt}`));
  } else if (id === CUSTOM_IDS.BTN_DEV_ANNOUNCE_UPDATE) {
    await notifyBotOnline(interaction.client, true);
    await interaction.editReply(
      buildDevConsolePayload(guildId, wsPing, "🚀 **Pengumuman Update & Patch Notes berhasil dikirim ke channel server!**"),
    );
  } else if (id === CUSTOM_IDS.BTN_DEV_ANNOUNCE_OFF) {
    await notifyBotOffline(interaction.client, "Maintenance / Pemeliharaan Terjadwal oleh Developer");
    await interaction.editReply(
      buildDevConsolePayload(guildId, wsPing, "🔴 **Pemberitahuan Off/Maintenance berhasil dikirim & WAL SQLite disimpan!**"),
    );
  } else if (id === CUSTOM_IDS.BTN_DEV_WIPE_ASK) {
    const payload = buildDevConsolePayload(
      guildId,
      wsPing,
      "⚠️ **KONFIRMASI WIPE:** Klik tombol merah di bawah untuk hapus semua data ke 0.",
    );
    const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BTN_DEV_WIPE_CONFIRM)
        .setLabel("🔥 YA, HAPUS SEMUA DATA KE 0")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_DEV_REFRESH).setLabel("🔙 Batal").setStyle(ButtonStyle.Secondary),
    );
    await interaction.editReply({ ...payload, components: [...payload.components, confirmRow] });
  } else if (id === CUSTOM_IDS.BTN_DEV_WIPE_CONFIRM) {
    resetAllUserData();
    await interaction.editReply(buildDevConsolePayload(guildId, wsPing, "🧹 **DATABASE DIRESET BERSIH KE 0!**"));
  }
  return true;
}
