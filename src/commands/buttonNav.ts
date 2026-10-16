import {
  ActionRowBuilder,
  AttachmentBuilder,
  type ButtonInteraction,
  EmbedBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
} from "discord.js";
import { getOrCreateServerCoop, getOrCreateUser, getTopLeaderboard, registerNewUser } from "../db/index.ts";
import { buildHelpEmbedsAndComponents, type GuideCategoryId } from "../game/guide.ts";
import { buildUpdateInfoPayload, formatRpShort } from "../game/mechanics.ts";
import { renderLeaderboardCard } from "../renderer/pixelCard.ts";
import { SKIN_PALETTES } from "../renderer/sprites.ts";
import { CUSTOM_IDS } from "./customIds.ts";
import { buildFeedbackModal, buildStateAwarePortfolioRows, sendPortfolioView } from "./uiBuilders.ts";

const HELP_CAT_MAP: Record<string, GuideCategoryId> = {
  [CUSTOM_IDS.BTN_HELP_DASAR]: "dasar",
  [CUSTOM_IDS.BTN_HELP_USAHA]: "usaha",
  [CUSTOM_IDS.BTN_HELP_KOPERASI]: "koperasi",
  [CUSTOM_IDS.BTN_HELP_BAHAYA]: "bahaya",
};

export async function handleNavButtonInteraction(interaction: ButtonInteraction, id: string): Promise<boolean> {
  const { id: uid, username: uname } = interaction.user;
  const guildId = interaction.guildId || "global_kota_mandiri";

  if (id === CUSTOM_IDS.BTN_START_LAPAK) {
    await interaction.deferReply();
    const reg = registerNewUser(uid, uname);
    await sendPortfolioView(
      interaction,
      uid,
      uname,
      reg.created ? "🎉 **Lapak Dibuka!** Modal **Rp 500Rb** & **Kedai Kopi Lv.1** siap!" : "ℹ️ **Lapakmu sudah aktif!**",
    );
    return true;
  }
  if (id === CUSTOM_IDS.BTN_HELP) {
    await interaction.reply({ ...buildHelpEmbedsAndComponents("dasar"), flags: MessageFlags.Ephemeral });
    return true;
  }
  if (id === CUSTOM_IDS.BTN_CHECK_UPDATE) {
    if (interaction.message.flags.has(MessageFlags.Ephemeral)) {
      await interaction.deferUpdate();
      await interaction.editReply(buildUpdateInfoPayload());
    } else await interaction.reply({ ...buildUpdateInfoPayload(), flags: MessageFlags.Ephemeral });
    return true;
  }
  if (id === CUSTOM_IDS.BTN_FEEDBACK_OPEN) {
    await interaction.showModal(buildFeedbackModal());
    return true;
  }
  const helpCat = HELP_CAT_MAP[id];
  if (helpCat) {
    if (interaction.message.flags.has(MessageFlags.Ephemeral)) {
      await interaction.deferUpdate();
      await interaction.editReply(buildHelpEmbedsAndComponents(helpCat));
    } else await interaction.reply({ ...buildHelpEmbedsAndComponents(helpCat), flags: MessageFlags.Ephemeral });
    return true;
  }
  if (id === CUSTOM_IDS.BTN_SHOP) {
    const user = getOrCreateUser(uid, uname);
    if (user.is_seized === 1 || user.pinjol_debt > 0) {
      await interaction.reply({ content: "🔒 **Toko tema terkunci** selama lapak masih disegel.", flags: MessageFlags.Ephemeral });
      return true;
    }
    const opts = Object.values(SKIN_PALETTES).map((s) => ({
      label: `${s.name} (${s.priceRp === 0 ? "GRATIS" : `${formatRpShort(s.priceRp)} / ${s.priceGems}💎`})`,
      description: s.desc,
      value: s.id,
    }));
    const select = new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_IDS.SELECT_SKIN_PREVIEW)
      .setPlaceholder("👀 Pilih Tema Kartu Usaha...")
      .addOptions(opts);
    await interaction.reply({
      content: `🎨 **Pilih tema untuk pratinjau** (Kasmu: **${formatRpShort(user.balance)}** • Permata: **${user.gems} 💎**):`,
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }
  if (id === CUSTOM_IDS.BTN_LEADERBOARD) {
    await interaction.deferUpdate();
    const user = getOrCreateUser(uid, uname);
    const coop = getOrCreateServerCoop(guildId);
    const attachment = new AttachmentBuilder(renderLeaderboardCard(getTopLeaderboard(5), coop), { name: "karsa-leaderboard.png" });
    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle(`🏆 Peringkat Pasar • Kas Koperasi ${formatRpShort(coop.pool_balance)}`)
      .setImage("attachment://karsa-leaderboard.png");
    await interaction.editReply({ content: "", embeds: [embed], files: [attachment], components: buildStateAwarePortfolioRows(user) });
    return true;
  }
  return false;
}
