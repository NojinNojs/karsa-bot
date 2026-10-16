import { getCurrentMarketEvent, getPrestigeTipMultiplier, getRankForLevel, WORK_DILEMMAS } from "../game/mechanics.ts";
import { sqlite, stmt } from "./connection.ts";
import { recordTransaction } from "./migrations.ts";
import { computeProgressionQuest, formatCooldown } from "./quests.ts";
import { WORK_COOLDOWN_MS } from "./types.ts";
import { getOrCreateUser, getUserBusinesses } from "./users.ts";

export function workShift(
  userId: string,
  username: string,
  choice: "ethical" | "corrupt",
  dilemmaIdx?: number,
  opts?: { enforceCooldown?: boolean },
) {
  const user = getOrCreateUser(userId, username);
  const now = Date.now();

  if (opts?.enforceCooldown && user.last_work_at > 0 && now - user.last_work_at < WORK_COOLDOWN_MS) {
    const remainingMs = WORK_COOLDOWN_MS - (now - user.last_work_at);
    return {
      ok: false,
      cooldownRemainingMs: remainingMs,
      user,
      dilemma: WORK_DILEMMAS[0]!,
      deltaRp: 0,
      karmaDelta: 0,
      busted: false,
      leveledUp: false,
      message: `⏳ **Dapur Masih Ngebul!** Tunggu **${formatCooldown(remainingMs)}** lagi sebelum menyeduh kloter berikutnya.`,
    };
  }

  const dilemma = WORK_DILEMMAS[(dilemmaIdx ?? Math.floor(Math.random() * WORK_DILEMMAS.length)) % WORK_DILEMMAS.length]!;
  const { event: marketEvent } = getCurrentMarketEvent();

  let deltaRp = 0;
  let karmaDelta = 0;
  let xpDelta = 0;
  let busted = false;
  let message = "";
  let leveledUp = false;

  sqlite
    .transaction(() => {
      if (choice === "ethical") {
        const c = dilemma.ethicalChoice;
        const karmaBonus = user.karma >= 80 ? Math.round(c.rewardRp * 0.15) : 0;
        const prestigeMult = getPrestigeTipMultiplier(user.level);
        deltaRp = Math.round((c.rewardRp + karmaBonus) * marketEvent.workMultiplier * prestigeMult);
        karmaDelta = c.karmaDelta;
        xpDelta = c.xpDelta;
        message = `${c.outcomeText}${karmaBonus > 0 ? ` (+Bonus Pelanggan Setia Rp${(karmaBonus / 1000).toLocaleString("id-ID")}Rb)` : ""} ${marketEvent.title}`;
      } else {
        const c = dilemma.corruptChoice;
        karmaDelta = c.karmaDelta;
        xpDelta = c.xpDelta;
        const effectiveAuditChance = Math.max(0.05, Math.min(0.95, c.auditChance + marketEvent.auditBonusChance));
        if (Math.random() < effectiveAuditChance) {
          busted = true;
          deltaRp = -c.fineRp;
          message = c.bustedText;
        } else {
          deltaRp = Math.round(c.rewardRp * marketEvent.workMultiplier);
          message = c.successText;
        }
      }

      const newBalance = Math.max(0, user.balance + deltaRp);
      const newKarma = Math.max(0, Math.min(100, user.karma + karmaDelta));
      const newXp = user.xp + xpDelta;
      const newLevel = Math.max(user.level, Math.floor(newXp / 100) + 1);
      leveledUp = newLevel > user.level;
      const gemBonus = leveledUp ? newLevel - user.level : 0;
      const newJobTitle = getRankForLevel(newLevel).title;
      const newBadge =
        user.is_seized === 1 ? "LAPAK DISEGEL" : newKarma >= 80 ? "WARUNG JUJUR" : newKarma <= 35 ? "CATATAN MERAH" : "WARGA PASAR";
      const nextQuest = computeProgressionQuest({ ...user, level: newLevel, karma: newKarma }, getUserBusinesses(userId));

      stmt(
        "UPDATE users SET balance = ?, karma = ?, xp = ?, level = ?, gems = gems + ?, job_title = ?, badge = ?, active_quest = ?, last_work_at = ? WHERE id = ?",
      ).run(newBalance, newKarma, newXp, newLevel, gemBonus, newJobTitle, newBadge, nextQuest, now, userId);
      recordTransaction(userId, choice === "ethical" ? "WORK_ETHICAL" : "WORK_CORRUPT", deltaRp, `${dilemma.title}: ${message}`);
    })
    .immediate();

  return {
    ok: true,
    cooldownRemainingMs: 0,
    user: getOrCreateUser(userId, username),
    dilemma,
    deltaRp,
    karmaDelta,
    busted,
    leveledUp,
    message,
  };
}
