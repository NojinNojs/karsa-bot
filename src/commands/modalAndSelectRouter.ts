import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import {
  devModifyPlayer,
  getOrCreateServerCoop,
  getOrCreateUser,
  getUserBusinesses,
  hasUserAccount,
  repayPinjolDebt,
} from "../db/index.ts";
import { formatRpShort, setMarketEventOverride } from "../game/mechanics.ts";
import { renderPortfolioCard } from "../renderer/pixelCard.ts";
import { SKIN_PALETTES, type SkinId } from "../renderer/sprites.ts";
import { CUSTOM_IDS } from "./definitions.ts";
import { buildDevConsolePayload, isDeveloperUser } from "./devConsole.ts";
import { buildOnboardingPrompt, sendPortfolioView } from "./uiBuilders.ts";

export async function handleModalSubmitInteraction(interaction: ModalSubmitInteraction): Promise<void> {
  const uid = interaction.user.id;
  const uname = interaction.user.username;
  const guildId = interaction.guildId || "global_kota_mandiri";

  if (interaction.customId === CUSTOM_IDS.MODAL_DEV_GRANT) {
    if (!isDeveloperUser(interaction)) {
      await interaction.reply({ content: "⛔ Khusus Developer KARSA.", flags: MessageFlags.Ephemeral });
      return;
    }
    const targetQuery = interaction.fields.getTextInputValue(CUSTOM_IDS.INPUT_DEV_TARGET) || "";
    const cashInput = interaction.fields.getTextInputValue(CUSTOM_IDS.INPUT_DEV_CASH) || "";
    const statsInput = interaction.fields.getTextInputValue(CUSTOM_IDS.INPUT_DEV_STATS) || "";
    const res = devModifyPlayer({
      targetQuery,
      callerId: uid,
      callerName: uname,
      cashInput,
      statsInput,
    });
    const wsPing = Math.max(1, Math.round(interaction.client.ws.ping || 42));
    await interaction.reply({
      ...buildDevConsolePayload(guildId, wsPing, res.message),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!hasUserAccount(uid)) {
    await interaction.reply(buildOnboardingPrompt());
    return;
  }

  if (interaction.customId === CUSTOM_IDS.MODAL_REPAY_DEBT) {
    const rawVal = interaction.fields.getTextInputValue(CUSTOM_IDS.INPUT_REPAY_AMOUNT).trim().toLowerCase();
    const numeric =
      rawVal === "semua" || rawVal === "all" ? undefined : Number(rawVal.replace(/[^0-9]/g, ""));
    if (numeric !== undefined && (!Number.isFinite(numeric) || numeric <= 0)) {
      await interaction.reply({
        content: "⚠️ Masukkan angka rupiah (contoh: `500000`) atau ketik `semua`.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const res = repayPinjolDebt(uid, uname, numeric);
    if (!res.ok) {
      await interaction.reply({ content: res.message, flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferReply();
    await sendPortfolioView(interaction, uid, uname, res.message);
  }
}

export async function handleStringSelectMenuInteraction(
  interaction: StringSelectMenuInteraction,
): Promise<void> {
  if (interaction.customId === CUSTOM_IDS.SELECT_DEV_MARKET) {
    if (!isDeveloperUser(interaction)) {
      await interaction.reply({ content: "⛔ Khusus Developer KARSA.", flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferUpdate();
    const chosen = interaction.values[0] || "auto";
    const forced = setMarketEventOverride(chosen);
    const guildId = interaction.guildId || "global_kota_mandiri";
    const wsPing = Math.max(1, Math.round(interaction.client.ws.ping || 42));
    const notice = forced
      ? `🌤️ **Cuaca Pasar Di-override ke:** ${forced.title} (${forced.goldBonusNote})`
      : `🔄 **Cuaca Pasar Dikembalikan ke Rotasi Otomatis Per Jam!**`;
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
  const businesses = getUserBusinesses(interaction.user.id);
  const coop = getOrCreateServerCoop(interaction.guildId || "global_kota_mandiri");

  const previewBuffer = renderPortfolioCard({ user, businesses, coop, overrideSkin: skinId });
  const attachment = new AttachmentBuilder(previewBuffer, { name: `preview-${skinId}.png` });

  const owned: string[] = JSON.parse(user.owned_skins || '["retro_gold"]');
  const isOwned = owned.includes(skinId);
  const canBuyRp =
    isOwned || (user.balance >= skin.priceRp && user.pinjol_debt === 0 && user.is_seized === 0);
  const canBuyGems =
    !isOwned && user.gems >= skin.priceGems && user.pinjol_debt === 0 && user.is_seized === 0;

  const buyRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${CUSTOM_IDS.BTN_SKIN_BUY_PREFIX}${skinId}:rp`)
      .setLabel(isOwned ? `✅ Pasang ${skin.name}` : `💰 Beli dgn Kas (${formatRpShort(skin.priceRp)})`)
      .setStyle(canBuyRp ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!canBuyRp),
  );
  if (!isOwned && skin.priceGems > 0) {
    buyRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`${CUSTOM_IDS.BTN_SKIN_BUY_PREFIX}${skinId}:gems`)
        .setLabel(`💎 Beli dgn Permata (${skin.priceGems} 💎)`)
        .setStyle(canBuyGems ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(!canBuyGems),
    );
  }

  await interaction.editReply({
    content: `👀 **Pratinjau: ${skin.name}** • Kasmu **${formatRpShort(user.balance)}** • Permata **${user.gems} 💎**`,
    files: [attachment],
    components: [buyRow],
  });
}
