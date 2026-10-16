import { type ButtonInteraction, MessageFlags } from "discord.js";
import { equipOrBuySkin } from "../db/index.ts";
import type { SkinId } from "../renderer/sprites.ts";
import { handleCoopButtons } from "./buttonCoop.ts";
import { CUSTOM_IDS } from "./customIds.ts";
import { sendPortfolioView } from "./uiBuilders.ts";

export async function handleCoopAndShopButtons(interaction: ButtonInteraction, id: string, rawId: string): Promise<boolean> {
  if (await handleCoopButtons(interaction, id, rawId)) return true;
  const { id: uid, username: uname } = interaction.user;

  if (rawId.startsWith(CUSTOM_IDS.BTN_SKIN_BUY_PREFIX)) {
    const [skinPart, modePart] = rawId.replace(CUSTOM_IDS.BTN_SKIN_BUY_PREFIX, "").split(":");
    const res = equipOrBuySkin(uid, uname, (skinPart || "retro_gold") as SkinId, modePart === "gems" ? "gems" : "rp");
    if (!res.ok) {
      await interaction.reply({ content: `🎨 ${res.message}`, flags: MessageFlags.Ephemeral });
      return true;
    }
    await interaction.deferUpdate();
    if (interaction.message.flags.has(MessageFlags.Ephemeral))
      await interaction.editReply({ content: `🎨 ${res.message}`, components: [] });
    else await sendPortfolioView(interaction, uid, uname, `🎨 ${res.message}`);
    return true;
  }

  if (id === CUSTOM_IDS.BTN_PORTFOLIO_REFRESH) {
    await interaction.deferUpdate();
    await sendPortfolioView(interaction, uid, uname);
    return true;
  }
  return false;
}
