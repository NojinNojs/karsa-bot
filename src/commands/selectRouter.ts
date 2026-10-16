import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  type StringSelectMenuInteraction,
} from "discord.js";
import { getOrCreateServerCoop, getOrCreateUser, getUserBusinesses, hasUserAccount } from "../db/index.ts";
import { formatRpShort, setMarketEventOverride } from "../game/mechanics.ts";
import { renderPortfolioCard } from "../renderer/pixelCard.ts";
import { SKIN_PALETTES, type SkinId } from "../renderer/sprites.ts";
import { CUSTOM_IDS } from "./customIds.ts";
import { buildDevConsolePayload, isDeveloperUser } from "./devConsole.ts";
import { buildOnboardingPrompt } from "./uiBuilders.ts";

export async function handleStringSelectMenuInteraction(interaction: StringSelectMenuInteraction): Promise<void> {
  if (interaction.customId === CUSTOM_IDS.SELECT_DEV_MARKET) {
    if (!isDeveloperUser(interaction)) {
      await interaction.reply({ content: "⛔ Khusus Developer KARSA.", flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferUpdate();
    const forced = setMarketEventOverride(interaction.values[0] || "auto");
    const guildId = interaction.guildId || "global_kota_mandiri";
    const wsPing = Math.max(1, Math.round(interaction.client.ws.ping || 42));
    const notice = forced ? `🌤️ **Cuaca Pasar Di-override ke:** ${forced.title}` : "🔄 **Cuaca Pasar Dikembalikan ke Rotasi Otomatis!**";
    await interaction.editReply(buildDevConsolePayload(guildId, wsPing, notice));
    return;
  }
  if (interaction.customId !== CUSTOM_IDS.SELECT_SKIN_PREVIEW) return;
  if (!hasUserAccount(interaction.user.id)) {
    await interaction.reply(buildOnboardingPrompt());
    return;
  }
  await interaction.deferUpdate();
  const skinId = (interaction.values[0] || "retro_gold") as SkinId;
  const skin = SKIN_PALETTES[skinId] || SKIN_PALETTES.retro_gold;
  const user = getOrCreateUser(interaction.user.id, interaction.user.username);
  const previewBuffer = renderPortfolioCard({
    user,
    businesses: getUserBusinesses(interaction.user.id),
    coop: getOrCreateServerCoop(interaction.guildId || "global_kota_mandiri"),
    overrideSkin: skinId,
  });
  const isOwned = (JSON.parse(user.owned_skins || '["retro_gold"]') as string[]).includes(skinId);
  const canBuyRp = isOwned || (user.balance >= skin.priceRp && user.pinjol_debt === 0 && user.is_seized === 0);
  const canBuyGems = !isOwned && user.gems >= skin.priceGems && user.pinjol_debt === 0 && user.is_seized === 0;

  const buyRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${CUSTOM_IDS.BTN_SKIN_BUY_PREFIX}${skinId}:rp`)
      .setLabel(isOwned ? `✅ Pasang ${skin.name}` : `💰 Beli dgn Kas (${formatRpShort(skin.priceRp)})`)
      .setStyle(canBuyRp ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!canBuyRp),
  );
  if (!isOwned && skin.priceGems > 0)
    buyRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`${CUSTOM_IDS.BTN_SKIN_BUY_PREFIX}${skinId}:gems`)
        .setLabel(`💎 Beli dgn Permata (${skin.priceGems} 💎)`)
        .setStyle(canBuyGems ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(!canBuyGems),
    );
  await interaction.editReply({
    content: `👀 **Pratinjau: ${skin.name}** • Kasmu **${formatRpShort(user.balance)}** • Permata **${user.gems} 💎**`,
    files: [new AttachmentBuilder(previewBuffer, { name: `preview-${skinId}.png` })],
    components: [buyRow],
  });
}
