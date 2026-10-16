import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  type ModalSubmitInteraction,
  StringSelectMenuBuilder,
  type StringSelectMenuInteraction,
} from "discord.js";
import { BOT_STARTED_AT, getDeveloperTelemetry, getRecentFeedback } from "../db/index.ts";
import { formatRpShort, getMarketEventOverrideId, MARKET_EVENTS } from "../game/mechanics.ts";
import { renderDevMonitorCard } from "../renderer/pixelCard.ts";
import { getPerfStats } from "./concurrencyGuard.ts";
import { CUSTOM_IDS } from "./customIds.ts";

export function isDeveloperUser(
  interaction: ChatInputCommandInteraction | ButtonInteraction | ModalSubmitInteraction | StringSelectMenuInteraction,
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
  const perf = getPerfStats();
  const pngBuffer = renderDevMonitorCard(tel, wsPingMs);
  const attachment = new AttachmentBuilder(pngBuffer, { name: "karsa-dev-monitor.png" });
  const startedUnix = Math.floor(BOT_STARTED_AT / 1000);
  const overrideId = getMarketEventOverrideId();
  const fbCount = getRecentFeedback(50).length;

  const recentAuditLines =
    tel.recentLogs.length > 0
      ? tel.recentLogs
          .map(
            (l) =>
              `• <t:${Math.floor(l.created_at / 1000)}:R> **${l.username}** — \`${l.kind}\`${l.amount === 0 ? "" : ` (${l.amount >= 0 ? "+" : "-"}${formatRpShort(Math.abs(l.amount))})`}`,
          )
          .join("\n")
      : "• *(Belum ada transaksi tercatat di database)*";

  const embed = new EmbedBuilder()
    .setColor(0x38f6ff)
    .setTitle(`🛠️ KARSA Dev Ops & Container Monitor • Ping ${wsPingMs}ms • Avg ${perf.avgLatencyMs}ms`)
    .setDescription(
      (notice ? `${notice}\n\n` : "") +
        `🐳 **Kontainer Docker (\`karsa-bot\`):** Kuota **\`${tel.containerVcpu} vCPU\`** & **\`${tel.containerRamLimitMb} MB RAM\`** • Terpakai **\`${tel.containerRamUsedMb}/${tel.containerRamLimitMb} MB (${tel.containerRamPct}%)\`** (RSS \`${tel.memoryRssMb} MB\` / Heap \`${tel.memoryHeapMb} MB\`)\n` +
        `⚡ **Throughput & DB:** \`${perf.totalRequestsHandled}\` Req (\`${perf.avgLatencyMs}ms\` avg) • SQLite WAL \`${tel.dbSizeKb}\` (\`${tel.totalLogs}\` Log • \`${fbCount}\` Feedback) • **Nyala:** <t:${startedUnix}:R>\n` +
        `🖥️ **Node Induk:** \`${tel.cpuModel}\` (**${tel.cpuCores}C**, Load \`${tel.cpuLoadPct}%\`) • RAM Host \`${tel.ramUsedGb}/${tel.ramTotalGb} GB (${tel.ramPct}%)\` • Disk \`${tel.diskUsedGb}/${tel.diskTotalGb} GB\`\n` +
        `📊 **Makro M2:** **${formatRpShort(tel.totalNetWorth)}** (Kas **${formatRpShort(tel.totalCash)}** • Emas **${formatRpShort(tel.totalEmergency)}** • Koperasi **${formatRpShort(tel.coopPool)}** • Warga **${tel.totalUsers}**)\n\n` +
        `📜 **6 Transaksi Terakhir Server:**\n${recentAuditLines}`,
    )
    .setImage("attachment://karsa-dev-monitor.png");

  const marketSelect = new StringSelectMenuBuilder()
    .setCustomId(CUSTOM_IDS.SELECT_DEV_MARKET)
    .setPlaceholder("🌤️ Override Cuaca Ekonomi Pasar Server...")
    .addOptions([
      {
        label: "🔄 Otomatis Per Jam (Default)",
        description: "Rotasi jam otomatis",
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

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_DEV_REFRESH).setLabel("🔄 Segarkan").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_DEV_CLEAR_CD).setLabel("⚡ Reset Cooldown").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_DEV_GRANT_MODAL).setLabel("🎁 Suntik Pemain").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_DEV_SPAWN_DUMMY).setLabel("🛟 Spawn Korban").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_DEV_WIPE_ASK).setLabel("🧹 Wipe DB").setStyle(ButtonStyle.Danger),
  );
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_DEV_FEEDBACK).setLabel(`📬 Feedback (${fbCount})`).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_DEV_ANNOUNCE_UPDATE).setLabel("🚀 Broadcast Update").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_DEV_ANNOUNCE_OFF).setLabel("🔴 Umumkan Off/Restart").setStyle(ButtonStyle.Danger),
  );

  return {
    content: "",
    embeds: [embed],
    files: [attachment],
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(marketSelect), row1, row2],
  };
}
