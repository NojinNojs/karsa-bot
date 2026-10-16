import { type ButtonInteraction, MessageFlags } from "discord.js";
import { claimDailyBonus, DAILY_COOLDOWN_MS, getOrCreateUser, WORK_COOLDOWN_MS, workShift } from "../db/index.ts";
import { formatRpShort } from "../game/mechanics.ts";
import { CUSTOM_IDS } from "./customIds.ts";
import { buildWorkDilemmaPayload, sendPortfolioView } from "./uiBuilders.ts";

export async function handleWorkAndDailyButtons(interaction: ButtonInteraction, id: string, rawId: string): Promise<boolean> {
  const { id: uid, username: uname } = interaction.user;

  if (id === CUSTOM_IDS.BTN_DAILY) {
    const user = getOrCreateUser(uid, uname);
    if (user.last_daily_at > 0 && Date.now() - user.last_daily_at < DAILY_COOLDOWN_MS) {
      await interaction.reply({
        content: `⏳ Uang harian baru siap **<t:${Math.ceil((user.last_daily_at + DAILY_COOLDOWN_MS) / 1000)}:R>**.`,
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    await interaction.deferUpdate();
    await sendPortfolioView(interaction, uid, uname, claimDailyBonus(uid, uname).message);
    return true;
  }
  if (id === CUSTOM_IDS.BTN_WORK) {
    const user = getOrCreateUser(uid, uname);
    if (user.last_work_at > 0 && Date.now() - user.last_work_at < WORK_COOLDOWN_MS) {
      await interaction.reply({
        content: `⏳ Dapur masih ngebul! Siap seduh **<t:${Math.ceil((user.last_work_at + WORK_COOLDOWN_MS) / 1000)}:R>**.`,
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    await interaction.deferUpdate();
    await interaction.editReply(buildWorkDilemmaPayload(user));
    return true;
  }
  if (id === CUSTOM_IDS.BTN_WORK_JUJUR || id === CUSTOM_IDS.BTN_WORK_CULAS) {
    const userBefore = getOrCreateUser(uid, uname);
    if (userBefore.last_work_at > 0 && Date.now() - userBefore.last_work_at < WORK_COOLDOWN_MS) {
      await interaction.reply({
        content: `⏳ Dapur masih ngebul! Siap seduh **<t:${Math.ceil((userBefore.last_work_at + WORK_COOLDOWN_MS) / 1000)}:R>**.`,
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    await interaction.deferUpdate();
    const idxRaw = rawId.split(":")[1];
    const res = workShift(
      uid,
      uname,
      id === CUSTOM_IDS.BTN_WORK_CULAS ? "corrupt" : "ethical",
      idxRaw !== undefined ? Number(idxRaw) : undefined,
      { enforceCooldown: true },
    );
    const headline = `${res.busted ? "🚨 **Kena Sidak!**" : "☕ **Seduh Selesai!**"} **${res.deltaRp >= 0 ? "+" : "-"}${formatRpShort(Math.abs(res.deltaRp))}** • Nama Baik ${res.karmaDelta >= 0 ? "+" : ""}${res.karmaDelta}${res.leveledUp ? ` 🎉 **NAIK KE LV.${res.user.level}!**` : ""}`;
    await sendPortfolioView(interaction, uid, uname, headline);
    return true;
  }
  return false;
}
