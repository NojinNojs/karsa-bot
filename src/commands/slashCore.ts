import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { claimDailyBonus, DAILY_COOLDOWN_MS, getOrCreateUser, hasUserAccount, WORK_COOLDOWN_MS } from "../db/index.ts";
import { handlePublicSlashCommands } from "./slashPublic.ts";
import { buildOnboardingPrompt, buildWorkDilemmaPayload, sendPortfolioView } from "./uiBuilders.ts";

export async function handleCoreSlashCommands(interaction: ChatInputCommandInteraction): Promise<boolean> {
  if (await handlePublicSlashCommands(interaction)) return true;
  const { commandName } = interaction;
  const uid = interaction.user.id;
  const uname = interaction.user.username;

  if (!hasUserAccount(uid)) {
    const targetOpt = interaction.options.getUser("warga");
    if ((commandName === "portfolio" || commandName === "card") && targetOpt && hasUserAccount(targetOpt.id)) {
      await interaction.deferReply();
      await sendPortfolioView(interaction, targetOpt.id, targetOpt.username);
      return true;
    }
    await interaction.reply(buildOnboardingPrompt());
    return true;
  }
  if (commandName === "portfolio" || commandName === "card") {
    const target = interaction.options.getUser("warga") || interaction.user;
    if (!hasUserAccount(target.id)) {
      await interaction.reply({ content: `ℹ️ **${target.username}** belum membuka lapak (\`/start\`).`, flags: MessageFlags.Ephemeral });
      return true;
    }
    await interaction.deferReply();
    await sendPortfolioView(interaction, target.id, target.username);
    return true;
  }
  if (commandName === "daily") {
    const user = getOrCreateUser(uid, uname);
    if (user.last_daily_at > 0 && Date.now() - user.last_daily_at < DAILY_COOLDOWN_MS) {
      await interaction.reply({
        content: `⏳ Uang harian siap **<t:${Math.ceil((user.last_daily_at + DAILY_COOLDOWN_MS) / 1000)}:R>**.`,
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    await interaction.deferReply();
    await sendPortfolioView(interaction, uid, uname, claimDailyBonus(uid, uname).message);
    return true;
  }
  if (commandName === "work") {
    const user = getOrCreateUser(uid, uname);
    if (user.last_work_at > 0 && Date.now() - user.last_work_at < WORK_COOLDOWN_MS) {
      await interaction.reply({
        content: `⏳ Dapur masih ngebul! Siap seduh **<t:${Math.ceil((user.last_work_at + WORK_COOLDOWN_MS) / 1000)}:R>**.`,
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    await interaction.reply(buildWorkDilemmaPayload(user));
    return true;
  }
  return false;
}
