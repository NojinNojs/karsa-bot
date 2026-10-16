import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  type ModalSubmitInteraction,
} from "discord.js";
import {
  DAILY_COOLDOWN_MS,
  getOrCreateServerCoop,
  getOrCreateUser,
  getUserBusinesses,
  PASSIVE_COOLDOWN_MS,
  type ServerCoopRow,
  type UserBusinessRow,
  type UserRow,
  WORK_COOLDOWN_MS,
} from "../db/index.ts";
import { formatRpShort, getCurrentMarketEvent, getRankForLevel, WORK_DILEMMAS } from "../game/mechanics.ts";
import { renderPortfolioCard } from "../renderer/pixelCard.ts";
import { CUSTOM_IDS } from "./customIds.ts";
import { buildCooldownTag, buildStateAwarePortfolioRows } from "./dashboardRows.ts";

export function buildPortfolioEmbed(user: UserRow, _businesses: UserBusinessRow[], _coop: ServerCoopRow, headline?: string) {
  const { event, nextChangeUnixSec } = getCurrentMarketEvent();
  const rankInfo = getRankForLevel(user.level);
  const isSeized = user.is_seized === 1 || user.pinjol_debt > 0;
  const workTimer = buildCooldownTag(user.last_work_at, WORK_COOLDOWN_MS, "✅ Siap");
  const omzetTimer = isSeized ? "🔒 Disegel" : buildCooldownTag(user.last_passive_at, PASSIVE_COOLDOWN_MS, "✅ Siap");
  const dailyTimer = buildCooldownTag(user.last_daily_at, DAILY_COOLDOWN_MS, "✅ Siap");
  const embedColor = isSeized ? 0xef4444 : user.karma >= 80 ? 0xf59e0b : 0x10b981;

  return new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(`🏪 ${user.username} • Lv.${user.level} ${rankInfo.title}`)
    .setDescription(
      (headline ? `${headline}\n` : "") +
        `**Seduh:** ${workTimer}  •  **Omzet:** ${omzetTimer}  •  **Harian:** ${dailyTimer}\n` +
        `${event.title} *(${event.goldBonusNote} • ganti <t:${nextChangeUnixSec}:R>)*`,
    )
    .setImage("attachment://karsa-portfolio.png");
}

export function buildWorkDilemmaPayload(user: UserRow) {
  const idx = Math.floor(Math.random() * WORK_DILEMMAS.length);
  const d = WORK_DILEMMAS[idx]!;
  const { event } = getCurrentMarketEvent();
  const karmaBonus = user.karma >= 80 ? Math.round(d.ethicalChoice.rewardRp * 0.15) : 0;
  const ethicalEst = Math.round((d.ethicalChoice.rewardRp + karmaBonus) * event.workMultiplier);
  const corruptEst = Math.round(d.corruptChoice.rewardRp * event.workMultiplier);

  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle(`☕ ${d.title}`)
    .setDescription(
      `${d.context}\n\n` +
        `✅ **${d.ethicalChoice.label}** → **+${formatRpShort(ethicalEst)}** (+${d.ethicalChoice.karmaDelta} Nama Baik)\n` +
        `⚠️ **${d.corruptChoice.label}** → **+${formatRpShort(corruptEst)}** (risiko denda **${formatRpShort(d.corruptChoice.fineRp)}**)`,
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`${CUSTOM_IDS.BTN_WORK_JUJUR}:${idx}`).setLabel("✅ Seduh Murni").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`${CUSTOM_IDS.BTN_WORK_CULAS}:${idx}`).setLabel("⚠️ Pangkas Bahan").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH).setLabel("🔙 Batal").setStyle(ButtonStyle.Secondary),
  );
  return { content: "", embeds: [embed], components: [row] };
}

export async function sendPortfolioView(
  interaction: ChatInputCommandInteraction | ButtonInteraction | ModalSubmitInteraction,
  targetId = interaction.user.id,
  targetName = interaction.user.username,
  headline?: string,
) {
  const guildId = interaction.guildId || "global_kota_mandiri";
  const user = getOrCreateUser(targetId, targetName);
  const businesses = getUserBusinesses(targetId);
  const coop = getOrCreateServerCoop(guildId);
  const pngBuffer = renderPortfolioCard({ user, businesses, coop });
  const attachment = new AttachmentBuilder(pngBuffer, { name: "karsa-portfolio.png" });
  const payload = {
    content: "",
    embeds: [buildPortfolioEmbed(user, businesses, coop, headline)],
    files: [attachment],
    components: buildStateAwarePortfolioRows(user),
  };
  if (interaction.deferred || interaction.replied) await interaction.editReply(payload);
  else await interaction.reply(payload);
}
