import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { getOrCreateServerCoop, getTopLeaderboard, registerNewUser } from "../db/index.ts";
import { buildHelpEmbedsAndComponents } from "../game/guide.ts";
import { buildUpdateInfoPayload, formatRpShort } from "../game/mechanics.ts";
import { renderLeaderboardCard } from "../renderer/pixelCard.ts";
import { CUSTOM_IDS } from "./customIds.ts";
import { buildFeedbackModal, sendPortfolioView } from "./uiBuilders.ts";

export async function handlePublicSlashCommands(interaction: ChatInputCommandInteraction): Promise<boolean> {
  const { commandName } = interaction;
  const uid = interaction.user.id;
  const uname = interaction.user.username;

  if (commandName === "help") {
    await interaction.reply({ ...buildHelpEmbedsAndComponents("dasar"), flags: MessageFlags.Ephemeral });
    return true;
  }
  if (commandName === "update") {
    await interaction.reply({ ...buildUpdateInfoPayload(), flags: MessageFlags.Ephemeral });
    return true;
  }
  if (commandName === "feedback") {
    await interaction.showModal(buildFeedbackModal());
    return true;
  }
  if (commandName === "start") {
    await interaction.deferReply();
    const reg = registerNewUser(uid, uname);
    const shortMsg = reg.created
      ? "🎉 **Lapak Dibuka!** Modal **Rp 500Rb** & **Kedai Kopi Lv.1** siap. Klik **☕ Seduh Kopi** di bawah!"
      : "ℹ️ **Lapakmu sudah aktif!** Ini buku kas terbarumu:";
    await sendPortfolioView(interaction, uid, uname, shortMsg);
    return true;
  }
  if (commandName === "leaderboard") {
    await interaction.deferReply();
    const guildId = interaction.guildId || "global_kota_mandiri";
    const coop = getOrCreateServerCoop(guildId);
    const attachment = new AttachmentBuilder(renderLeaderboardCard(getTopLeaderboard(5), coop), { name: "karsa-leaderboard.png" });
    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle(`🏆 Peringkat Pasar • Kas Koperasi ${formatRpShort(coop.pool_balance)}`)
      .setImage("attachment://karsa-leaderboard.png");
    const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(CUSTOM_IDS.BTN_PORTFOLIO_REFRESH).setLabel("🪪 Buka Kartu Usahaku").setStyle(ButtonStyle.Primary),
    );
    await interaction.editReply({ content: "", embeds: [embed], files: [attachment], components: [backRow] });
    return true;
  }
  return false;
}
