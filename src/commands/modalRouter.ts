import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import { devModifyPlayer, hasUserAccount, repayPinjolDebt, submitUserFeedback } from "../db/index.ts";
import { CUSTOM_IDS } from "./customIds.ts";
import { buildDevConsolePayload, isDeveloperUser } from "./devConsole.ts";
import { buildOnboardingPrompt, sendPortfolioView } from "./uiBuilders.ts";

export async function handleModalSubmitInteraction(interaction: ModalSubmitInteraction): Promise<void> {
  const { id: uid, username: uname } = interaction.user;
  const guildId = interaction.guildId || "global_kota_mandiri";

  if (interaction.customId === CUSTOM_IDS.MODAL_DEV_GRANT) {
    if (!isDeveloperUser(interaction)) {
      await interaction.reply({ content: "⛔ Khusus Developer KARSA.", flags: MessageFlags.Ephemeral });
      return;
    }
    const res = devModifyPlayer({
      targetQuery: interaction.fields.getTextInputValue(CUSTOM_IDS.INPUT_DEV_TARGET) || "",
      callerId: uid,
      callerName: uname,
      cashInput: interaction.fields.getTextInputValue(CUSTOM_IDS.INPUT_DEV_CASH) || "",
      statsInput: interaction.fields.getTextInputValue(CUSTOM_IDS.INPUT_DEV_STATS) || "",
    });
    const wsPing = Math.max(1, Math.round(interaction.client.ws.ping || 42));
    await interaction.reply({
      ...buildDevConsolePayload(guildId, wsPing, res.message),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (interaction.customId === CUSTOM_IDS.MODAL_FEEDBACK) {
    const cat = interaction.fields.getTextInputValue(CUSTOM_IDS.INPUT_FB_CATEGORY) || "Saran Umum";
    const msg = interaction.fields.getTextInputValue(CUSTOM_IDS.INPUT_FB_MESSAGE) || "";
    const fb = submitUserFeedback(uid, uname, cat, msg);
    await interaction.reply({
      content: `✅ **Terima kasih atas masukanmu, ${uname}!**\n• **Kategori:** \`${fb.category}\`\n• **Pesan:** "${fb.message}"\n*(Masukan telah tercatat di kotak masuk Developer KARSA)*`,
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
    const numeric = rawVal === "semua" || rawVal === "all" ? undefined : Number(rawVal.replace(/[^0-9]/g, ""));
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
