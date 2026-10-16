import { sqlite, stmt } from "./connection.ts";
import { recordTransaction } from "./migrations.ts";
import { computeProgressionQuest, formatCooldown } from "./quests.ts";
import { DAILY_COOLDOWN_MS, DAILY_STREAK_RESET_MS, type DailyBonusResult } from "./types.ts";
import { getOrCreateUser, getUserBusinesses } from "./users.ts";

export function claimDailyBonus(userId: string, username: string): DailyBonusResult {
  const user = getOrCreateUser(userId, username);
  const now = Date.now();

  const lastLog = stmt(
    "SELECT created_at FROM ledger_logs WHERE user_id = ? AND kind = 'DAILY_MODAL' ORDER BY created_at DESC LIMIT 1",
  ).get(userId) as { created_at: number } | null;
  const countRow = stmt("SELECT COUNT(*) as cnt FROM ledger_logs WHERE user_id = ? AND kind = 'DAILY_MODAL'").get(userId) as {
    cnt: number;
  } | null;
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

  sqlite
    .transaction(() => {
      const newBal = user.balance + rewardRp;
      const newKarma = Math.min(100, user.karma + karmaBonus);
      const nextQuest = computeProgressionQuest({ ...user, balance: newBal, karma: newKarma }, getUserBusinesses(userId));
      stmt(
        "UPDATE users SET balance = ?, karma = ?, gems = gems + ?, daily_streak = ?, last_daily_at = ?, active_quest = ? WHERE id = ?",
      ).run(newBal, newKarma, gemReward, streak, now, nextQuest, userId);
      recordTransaction(userId, "DAILY_MODAL", rewardRp, `Uang Belanja Harian Pasar (Hari ke-${streak})`);
    })
    .immediate();

  return {
    ok: true,
    rewardRp,
    karmaBonus,
    streak,
    remainingMs: 0,
    cooldownText: "0d",
    message: `☀️ **Uang Harian Cair +Rp ${Math.round(rewardRp / 1_000).toLocaleString("id-ID")}Rb & +${gemReward} 💎!** (Streak Hari ke-${streak})`,
    user: getOrCreateUser(userId, username),
  };
}
