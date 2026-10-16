import {
  getCurrentMarketEvent,
  getPrestigeTipMultiplier,
  getRankForLevel,
  WORK_DILEMMAS,
} from "../game/mechanics.ts";
import { recordTransaction, sqlite } from "./connection.ts";
import {
  DAILY_COOLDOWN_MS,
  DAILY_STREAK_RESET_MS,
  type DailyBonusResult,
  WORK_COOLDOWN_MS,
} from "./types.ts";
import { computeProgressionQuest, formatCooldown, getOrCreateUser, getUserBusinesses } from "./users.ts";

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
    const cd = formatCooldown(remainingMs);
    const dilemma = WORK_DILEMMAS[0]!;
    return {
      ok: false,
      cooldownRemainingMs: remainingMs,
      user,
      dilemma,
      deltaRp: 0,
      karmaDelta: 0,
      busted: false,
      leveledUp: false,
      message: `⏳ **Dapur Masih Ngebul!** Tunggu **${cd}** lagi sebelum menyeduh kloter berikutnya.`,
    };
  }

  const dilemma =
    WORK_DILEMMAS[(dilemmaIdx ?? Math.floor(Math.random() * WORK_DILEMMAS.length)) % WORK_DILEMMAS.length]!;

  const { event: marketEvent } = getCurrentMarketEvent();

  let deltaRp = 0;
  let karmaDelta = 0;
  let xpDelta = 0;
  let busted = false;
  let message = "";
  let leveledUp = false;

  const tx = sqlite.transaction(() => {
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
      const effectiveAuditChance = Math.max(
        0.05,
        Math.min(0.95, c.auditChance + marketEvent.auditBonusChance),
      );
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
      user.is_seized === 1
        ? "LAPAK DISEGEL"
        : newKarma >= 80
          ? "WARUNG JUJUR"
          : newKarma <= 35
            ? "CATATAN MERAH"
            : "WARGA PASAR";

    const bizzes = getUserBusinesses(userId);
    const nextQuest = computeProgressionQuest({ ...user, level: newLevel, karma: newKarma }, bizzes);

    sqlite
      .query(
        "UPDATE users SET balance = ?, karma = ?, xp = ?, level = ?, gems = gems + ?, job_title = ?, badge = ?, active_quest = ?, last_work_at = ? WHERE id = ?",
      )
      .run(newBalance, newKarma, newXp, newLevel, gemBonus, newJobTitle, newBadge, nextQuest, now, userId);

    recordTransaction(
      userId,
      choice === "ethical" ? "WORK_ETHICAL" : "WORK_CORRUPT",
      deltaRp,
      `${dilemma.title}: ${message}`,
    );
  });
  tx.immediate();

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

export function claimDailyBonus(userId: string, username: string): DailyBonusResult {
  const user = getOrCreateUser(userId, username);
  const now = Date.now();

  const lastLog = sqlite
    .query(
      "SELECT created_at FROM ledger_logs WHERE user_id = ? AND kind = 'DAILY_MODAL' ORDER BY created_at DESC LIMIT 1",
    )
    .get(userId) as { created_at: number } | null;

  const countRow = sqlite
    .query("SELECT COUNT(*) as cnt FROM ledger_logs WHERE user_id = ? AND kind = 'DAILY_MODAL'")
    .get(userId) as { cnt: number } | null;
  const prevClaims = countRow?.cnt ?? 0;

  if (lastLog && now - lastLog.created_at < DAILY_COOLDOWN_MS) {
    const remainingMs = DAILY_COOLDOWN_MS - (now - lastLog.created_at);
    const cooldownText = formatCooldown(remainingMs);
    const currentStreak = Math.max(1, prevClaims);
    return {
      ok: false,
      rewardRp: 0,
      karmaBonus: 0,
      streak: currentStreak,
      remainingMs,
      cooldownText,
      message: `⏳ **Sabar dulu, Juragan!** Uang belanja pasar harian baru bisa diambil lagi dalam **${cooldownText}** (Streak Hari ke-${currentStreak}).`,
      user,
    };
  }

  const isExpired = lastLog ? now - lastLog.created_at > DAILY_STREAK_RESET_MS : false;
  const streak = isExpired ? 1 : prevClaims + 1;
  const streakBonus = Math.min(streak, 7) * 150_000;
  const karmaBonusRp = user.karma >= 80 ? 250_000 : 0;
  const rewardRp = 500_000 + streakBonus + karmaBonusRp;
  const karmaBonus = 2;
  const gemReward = streak >= 3 ? 2 : 1;

  const tx = sqlite.transaction(() => {
    const newBal = user.balance + rewardRp;
    const newKarma = Math.min(100, user.karma + karmaBonus);
    const bizzes = getUserBusinesses(userId);
    const nextQuest = computeProgressionQuest({ ...user, balance: newBal, karma: newKarma }, bizzes);
    sqlite
      .query(
        "UPDATE users SET balance = ?, karma = ?, gems = gems + ?, daily_streak = ?, last_daily_at = ?, active_quest = ? WHERE id = ?",
      )
      .run(newBal, newKarma, gemReward, streak, now, nextQuest, userId);
    recordTransaction(
      userId,
      "DAILY_MODAL",
      rewardRp,
      `Uang Belanja Harian Pasar (Hari ke-${streak}${karmaBonusRp > 0 ? " + Bonus Reputasi" : ""})`,
    );
  });
  tx.immediate();

  const updatedUser = getOrCreateUser(userId, username);
  return {
    ok: true,
    rewardRp,
    karmaBonus,
    streak,
    remainingMs: 0,
    cooldownText: "0d",
    message: `☀️ **Uang Harian Cair +Rp ${Math.round(rewardRp / 1_000).toLocaleString("id-ID")}Rb & +${gemReward} 💎!** (Streak Hari ke-${streak})`,
    user: updatedUser,
  };
}
