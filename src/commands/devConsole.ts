import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  type ModalSubmitInteraction,
  StringSelectMenuBuilder,
  type StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import {
  BOT_STARTED_AT,
  devClearAllCooldowns,
  devSpawnDummyVictim,
  getDeveloperTelemetry,
  resetAllUserData,
} from "../db/index.ts";
import { formatRpShort, getMarketEventOverrideId, MARKET_EVENTS } from "../game/mechanics.ts";
import { renderDevMonitorCard } from "../renderer/pixelCard.ts";
import { CUSTOM_IDS } from "./definitions.ts";

export function isDeveloperUser(
  interaction:
    | ChatInputCommandInteraction
    | ButtonInteraction
    | ModalSubmitInteraction
    | StringSelectMenuInteraction,
): boolean {
  const uid = interaction.user.id;
  const uname = interaction.user.username.toLowerCase();
  const envOwner = process.env.DISCORD_OWNER_ID?.trim();
  if (envOwner && uid === envOwner) return true;
  if (uname === "nojs.nojin" || uname.includes("nojin") || uname.includes("aqsan")) return true;
  if (interaction.guild && interaction.guild.ownerId === uid) return true;
  return false;
}

export function buildDevConsolePayload(guildId: string, wsPingMs = 42, notice?: string) {
  const tel = getDeveloperTelemetry(guildId);
  const pngBuffer = renderDevMonitorCard(tel, wsPingMs);
  const attachment = new AttachmentBuilder(pngBuffer, { name: "karsa-dev-monitor.png" });
  const startedUnix = Math.floor(BOT_STARTED_AT / 1000);
  const overrideId = getMarketEventOverrideId();

  const recentAuditLines =
    tel.recentLogs.length > 0
      ? tel.recentLogs
          .map((l) => {
            const sign = l.amount >= 0 ? "+" : "-";
            const amt = l.amount === 0 ? "" : ` (${sign}${formatRpShort(Math.abs(l.amount))})`;
            return `• <t:${Math.floor(l.created_at / 1000)}:R> **${l.username}** — \`${l.kind}\`${amt}`;
          })
          .join("\n")
      : "• *(Belum ada transaksi tercatat di database)*";

  const embed = new EmbedBuilder()
    .setColor(0x38f6ff)
    .setTitle(`🛠️ KARSA Dev Ops & Host Monitor • Ping ${wsPingMs}ms`)
    .setDescription(
      (notice ? `${notice}\n\n` : "") +
        `🖥️ **Spesifikasi Mesin Hosting & Container:**\n` +
        `• **CPU:** \`${tel.cpuModel}\` (**${tel.cpuCores} Core** @ \`${tel.cpuSpeedMhz} MHz\`) • **Beban CPU:** \`${tel.cpuLoadPct}%\` *(Load 1m: ${tel.cpuLoad1m})*\n` +
        `• **RAM Host:** **\`${tel.ramUsedGb} GB\`** terpakai dari **\`${tel.ramTotalGb} GB\`** (**${tel.ramPct}%** • Sisa \`${tel.ramFreeGb} GB\`) | **RAM Proses Bot:** \`${tel.memoryRssMb} MB\` RSS *(Heap ${tel.memoryHeapMb} MB)*\n` +
        `• **Storage Disk:** **\`${tel.diskUsedGb} GB\`** / **\`${tel.diskTotalGb} GB\`** (**${tel.diskPct}%** • Sisa \`${tel.diskFreeGb} GB\`) | **Ukuran DB SQLite:** \`${tel.dbSizeKb}\`\n` +
        `• **OS & Runtime:** \`${tel.osPlatform} (${tel.osArch})\` • Bun \`v${tel.bunVersion}\` • **Uptime Host:** \`${tel.hostUptimeShort}\` • **Bot Nyala:** <t:${startedUnix}:R>\n\n` +
        `📊 **Statistik Ekonomi & Database Server:**\n` +
        `• **Populasi:** \`${tel.totalUsers}\` Warga  •  \`${tel.activeBizCount}\` Unit Usaha  •  \`${tel.seizedCount}\` Disegel  •  \`${tel.totalLogs}\` Log\n` +
        `• **Suplai Uang (M2):** **${formatRpShort(tel.totalNetWorth)}** (Kas **${formatRpShort(tel.totalCash)}** • Emas **${formatRpShort(tel.totalEmergency)}** • Koperasi **${formatRpShort(tel.coopPool)}**)\n` +
        `• **Cuaca Pasar:** ${tel.marketTitle} ${tel.marketOverride ? "*(🛠️ Override Manual)*" : "*(🔄 Rotasi Otomatis)*"}\n\n` +
        `📜 **6 Transaksi Terakhir Server:**\n${recentAuditLines}`,
    )
    .setImage("attachment://karsa-dev-monitor.png");

  const marketSelect = new StringSelectMenuBuilder()
    .setCustomId(CUSTOM_IDS.SELECT_DEV_MARKET)
    .setPlaceholder("🌤️ Override Cuaca Ekonomi Pasar Server...")
    .addOptions([
      {
        label: "🔄 Otomatis Per Jam (Default)",
        description: "Kembalikan siklus cuaca pasar ke rotasi jam otomatis",
        value: "auto",
        default: !overrideId,
      },
      ...MARKET_EVENTS.map((ev) => ({
        label: ev.title,
        description: ev.goldBonusNote,
        value: ev.id,
        default: overrideId === ev.id,
      })),
    ]);

  const rowSelect = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(marketSelect);

  const rowActions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_DEV_REFRESH)
      .setLabel("🔄 Segarkan Monitor")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_DEV_CLEAR_CD)
      .setLabel("⚡ Reset Cooldown")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_DEV_GRANT_MODAL)
      .setLabel("🎁 Suntik / Edit Pemain")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_DEV_SPAWN_DUMMY)
      .setLabel("🛟 Spawn Korban Segel")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.BTN_DEV_WIPE_ASK)
      .setLabel("🧹 Wipe DB")
      .setStyle(ButtonStyle.Danger),
  );

  return {
    content: "",
    embeds: [embed],
    files: [attachment],
    components: [rowSelect, rowActions],
  };
}

export async function handleDevButtonInteraction(
  interaction: ButtonInteraction,
  id: string,
  guildId: string,
): Promise<boolean> {
  if (
    id === CUSTOM_IDS.BTN_DEV_REFRESH ||
    id === CUSTOM_IDS.BTN_DEV_CLEAR_CD ||
    id === CUSTOM_IDS.BTN_DEV_GRANT_MODAL ||
    id === CUSTOM_IDS.BTN_DEV_SPAWN_DUMMY ||
    id === CUSTOM_IDS.BTN_DEV_WIPE_ASK ||
    id === CUSTOM_IDS.BTN_DEV_WIPE_CONFIRM
  ) {
    if (!isDeveloperUser(interaction)) {
      await interaction.reply({ content: "⛔ Khusus Developer KARSA.", flags: MessageFlags.Ephemeral });
      return true;
    }
    const wsPing = Math.max(1, Math.round(interaction.client.ws.ping || 42));

    if (id === CUSTOM_IDS.BTN_DEV_GRANT_MODAL) {
      const modal = new ModalBuilder()
        .setCustomId(CUSTOM_IDS.MODAL_DEV_GRANT)
        .setTitle("🎁 Suntik Kas / Edit Stats Pemain");
      const targetInput = new TextInputBuilder()
        .setCustomId(CUSTOM_IDS.INPUT_DEV_TARGET)
        .setLabel("Username / User ID (Kosong = Akunmu Sendiri)")
        .setPlaceholder("Contoh: nojs.nojin atau kosongkan")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);
      const cashInput = new TextInputBuilder()
        .setCustomId(CUSTOM_IDS.INPUT_DEV_CASH)
        .setLabel("Kas Rp (+Tambah / -Kurang / Angka Pasti)")
        .setPlaceholder("Contoh: +5000000 atau 2500000")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);
      const statsInput = new TextInputBuilder()
        .setCustomId(CUSTOM_IDS.INPUT_DEV_STATS)
        .setLabel("Level, Gems, Karma, atau ketik 'lunas'")
        .setPlaceholder("Contoh: level=3, gems=15, karma=95, lunas")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(targetInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(cashInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(statsInput),
      );
      await interaction.showModal(modal);
      return true;
    }

    await interaction.deferUpdate();
    if (id === CUSTOM_IDS.BTN_DEV_REFRESH) {
      await interaction.editReply(
        buildDevConsolePayload(guildId, wsPing, "✅ **Telemetri berhasil disegarkan!**"),
      );
      return true;
    }
    if (id === CUSTOM_IDS.BTN_DEV_CLEAR_CD) {
      const cleared = devClearAllCooldowns();
      await interaction.editReply(
        buildDevConsolePayload(
          guildId,
          wsPing,
          `⚡ **Seluruh Cooldown (\`/work\`, \`/daily\`, \`/bisnis\`) di-reset untuk ${cleared} pemain!**`,
        ),
      );
      return true;
    }
    if (id === CUSTOM_IDS.BTN_DEV_SPAWN_DUMMY) {
      const dummy = devSpawnDummyVictim(guildId);
      await interaction.editReply(
        buildDevConsolePayload(
          guildId,
          wsPing,
          `🛟 **Pedagang Simulasi \`${dummy.username}\` (Tunggakan Rp 1,5Jt • Disegel) siap!** Kamu bisa ngetes tombol **Tebus Warga** di \`/koperasi\` atau cek \`/leaderboard\`.`,
        ),
      );
      return true;
    }
    if (id === CUSTOM_IDS.BTN_DEV_WIPE_ASK) {
      const payload = buildDevConsolePayload(
        guildId,
        wsPing,
        "⚠️ **KONFIRMASI WIPE DATABASE:** Klik tombol merah **🔥 YA, HAPUS SEMUA DATA** di bawah jika yakin ingin mereset seluruh pemain ke 0.",
      );
      const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(CUSTOM_IDS.BTN_DEV_WIPE_CONFIRM)
          .setLabel("🔥 YA, HAPUS SEMUA DATA KE 0")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(CUSTOM_IDS.BTN_DEV_REFRESH)
          .setLabel("🔙 Batal")
          .setStyle(ButtonStyle.Secondary),
      );
      await interaction.editReply({ ...payload, components: [...payload.components, confirmRow] });
      return true;
    }
    if (id === CUSTOM_IDS.BTN_DEV_WIPE_CONFIRM) {
      resetAllUserData();
      await interaction.editReply(
        buildDevConsolePayload(
          guildId,
          wsPing,
          "🧹 **DATABASE DIRESET BERSIH KE 0!** Seluruh statistik pemain & koperasi telah dikosongkan.",
        ),
      );
      return true;
    }
  }

  return false;
}
