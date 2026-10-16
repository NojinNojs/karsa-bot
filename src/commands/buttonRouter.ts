import { type ButtonInteraction, MessageFlags } from "discord.js";
import { hasUserAccount } from "../db/index.ts";
import { handleBizAndDebtButtons } from "./buttonBizAndDebt.ts";
import { handleCoopAndShopButtons } from "./buttonCoopAndShop.ts";
import { handleCoreButtonInteraction } from "./buttonCore.ts";
import { withUserLock } from "./concurrencyGuard.ts";
import { CUSTOM_IDS } from "./customIds.ts";
import { handleDevButtonInteraction } from "./devConsole.ts";
import { buildOnboardingPrompt } from "./uiBuilders.ts";

export async function handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
  await withUserLock(interaction.user.id, async () => {
    const rawId = interaction.customId;
    const id = rawId.split(":")[0]!;
    const uid = interaction.user.id;
    const uname = interaction.user.username;
    const guildId = interaction.guildId || "global_kota_mandiri";

    if (await handleDevButtonInteraction(interaction, id, guildId)) return;

    const isPublicFreeBtn =
      id === CUSTOM_IDS.BTN_START_LAPAK ||
      id === CUSTOM_IDS.BTN_HELP ||
      id === CUSTOM_IDS.BTN_CHECK_UPDATE ||
      id === CUSTOM_IDS.BTN_FEEDBACK_OPEN ||
      id === CUSTOM_IDS.BTN_HELP_DASAR ||
      id === CUSTOM_IDS.BTN_HELP_USAHA ||
      id === CUSTOM_IDS.BTN_HELP_KOPERASI ||
      id === CUSTOM_IDS.BTN_HELP_BAHAYA;

    if (!isPublicFreeBtn && !hasUserAccount(uid)) {
      await interaction.reply(buildOnboardingPrompt());
      return;
    }

    const isSosRescueClick = id === CUSTOM_IDS.BTN_KOPERASI_TALANGI && rawId.includes(":");
    const msgTitle = interaction.message?.embeds?.[0]?.title || "";
    if (
      !isPublicFreeBtn &&
      !isSosRescueClick &&
      !interaction.message.flags.has(MessageFlags.Ephemeral) &&
      msgTitle.startsWith("🏪 ") &&
      !msgTitle.toLowerCase().startsWith(`🏪 ${uname.toLowerCase()} `)
    ) {
      await interaction.reply({
        content: "🔒 Ini kartu usaha milik warga lain! Ketik `/portfolio` untuk membuka kartu usahamu sendiri.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (await handleCoreButtonInteraction(interaction, id, rawId)) return;
    if (await handleBizAndDebtButtons(interaction, id)) return;
    await handleCoopAndShopButtons(interaction, id, rawId);
  });
}
