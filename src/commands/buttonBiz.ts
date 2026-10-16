import { type ButtonInteraction, MessageFlags } from "discord.js";
import { buyOrUpgradeBusiness, claimPassiveIncome, getOrCreateUser, getUserBusinesses } from "../db/index.ts";
import { formatRpShort } from "../game/mechanics.ts";
import { CUSTOM_IDS } from "./customIds.ts";
import { type BizType, buildBusinessPanelPayload, sendPortfolioView } from "./uiBuilders.ts";

export async function handleBizButtons(interaction: ButtonInteraction, id: string): Promise<boolean> {
  const { id: uid, username: uname } = interaction.user;
  const guildId = interaction.guildId || "global_kota_mandiri";

  if (id === CUSTOM_IDS.BTN_BISNIS) {
    const user = getOrCreateUser(uid, uname);
    await interaction.deferUpdate();
    await interaction.editReply({ content: "", files: [], ...buildBusinessPanelPayload(user, getUserBusinesses(uid), undefined, guildId) });
    return true;
  }
  if (id === CUSTOM_IDS.BTN_BISNIS_CLAIM) {
    const res = claimPassiveIncome(uid, uname, { enforceCooldown: true, guildId });
    if (!res.ok) {
      await interaction.reply({ content: res.reason!, flags: MessageFlags.Ephemeral });
      return true;
    }
    const headline = `💰 **Omzet Cair +${formatRpShort(res.net)}!** ${res.taxSaved ? "*(Sewa 5%)*" : "*(Sewa 20%)*"}`;
    await interaction.deferUpdate();
    if (interaction.message.flags.has(MessageFlags.Ephemeral))
      await interaction.editReply(buildBusinessPanelPayload(res.user, getUserBusinesses(uid), headline, guildId));
    else await sendPortfolioView(interaction, uid, uname, headline);
    return true;
  }
  if (id === CUSTOM_IDS.BTN_BISNIS_KEDAI || id === CUSTOM_IDS.BTN_BISNIS_BRANKAS || id === CUSTOM_IDS.BTN_BISNIS_SAHAM) {
    const btype: BizType =
      id === CUSTOM_IDS.BTN_BISNIS_KEDAI ? "kedai_kopi" : id === CUSTOM_IDS.BTN_BISNIS_BRANKAS ? "brankas_darurat" : "saham_koperasi";
    const res = buyOrUpgradeBusiness(uid, uname, btype);
    if (!res.ok) {
      await interaction.reply({ content: `${res.reason}`, flags: MessageFlags.Ephemeral });
      return true;
    }
    const headline = `🏪 **Naik ke Lv.${res.nextLevel}!** (+${formatRpShort(res.yieldBoost || 0)}/hr)`;
    await interaction.deferUpdate();
    if (interaction.message.flags.has(MessageFlags.Ephemeral))
      await interaction.editReply(buildBusinessPanelPayload(res.user, getUserBusinesses(uid), headline, guildId));
    else await sendPortfolioView(interaction, uid, uname, headline);
    return true;
  }
  return false;
}
