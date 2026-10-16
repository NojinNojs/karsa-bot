import { sqlite, stmt } from "./connection.ts";
import { executeCoopRescue } from "./coopRescue.ts";
import { recordTransaction } from "./migrations.ts";
import { computeProgressionQuest } from "./quests.ts";
import { COOP_PATUNGAN_COST_RP, COOP_RESCUE_COST_RP, type LeaderboardEntry, type ServerCoopContributor } from "./types.ts";
import { getOrCreateServerCoop, getOrCreateUser, getUserBusinesses } from "./users.ts";

export function investOrRescueCoop(
  userId: string,
  username: string,
  action: "patungan" | "rescue",
  guildId = "global_kota_mandiri",
  targetUserId?: string,
) {
  const user = getOrCreateUser(userId, username);
  const coop = getOrCreateServerCoop(guildId);
  const amount = action === "patungan" ? COOP_PATUNGAN_COST_RP : COOP_RESCUE_COST_RP;
  const fail = (message: string) => ({ ok: false, amount: 0, rescuedUsername: null as string | null, message, user, coop });

  if (action === "patungan") {
    if (user.level < 2 && user.balance < amount)
      return fail("🔒 **Syarat Belum Terpenuhi!** Capai **Level 2** terlebih dahulu di `/work`.");
    if (user.pinjol_debt > 0 || user.is_seized === 1) return fail("🔒 **Tunggakan Aktif!** Lunasi tagihan talanganmu terlebih dahulu.");
  }
  if (user.balance < amount)
    return fail(`Kas belum cukup untuk aksi koperasi ini (Butuh **Rp ${(amount / 1_000_000).toFixed(1).replace(".", ",")}Jt**).`);
  if (action === "rescue") return executeCoopRescue(user, coop, amount, guildId, targetUserId);

  sqlite
    .transaction(() => {
      const contributors: ServerCoopContributor[] = [...(coop.contributors || [])];
      const existing = contributors.find((c) => c.userId === userId || c.name.toUpperCase() === username.toUpperCase());
      if (existing) {
        existing.totalRp += amount;
        existing.role = existing.totalRp >= 4_500_000 ? "PENDIRI KOPERASI" : "MITRA AKTIF";
      } else {
        contributors.push({ userId, name: username, role: "MITRA AKTIF", totalRp: amount, warungSaved: 0 });
      }
      const newBal = user.balance - amount;
      const newKarma = Math.min(100, user.karma + 8);
      const nextQuest = computeProgressionQuest({ ...user, balance: newBal, karma: newKarma }, getUserBusinesses(userId));
      stmt("UPDATE users SET balance = ?, coop_shares = coop_shares + ?, karma = ?, active_quest = ? WHERE id = ?").run(
        newBal,
        amount,
        newKarma,
        nextQuest,
        userId,
      );
      stmt(
        "UPDATE server_coop SET pool_balance = pool_balance + ?, eco_level = MIN(5, 1 + CAST((pool_balance + ?) / 3000000 AS INTEGER)), eco_health = MIN(100, eco_health + 6), contributors_json = ? WHERE guild_id = ?",
      ).run(amount, amount, JSON.stringify(contributors), guildId);
      stmt(
        "UPDATE user_businesses SET value = value + ?, daily_yield = daily_yield + 250000 WHERE user_id = ? AND biz_type = 'saham_koperasi' AND level >= 1",
      ).run(amount, userId);
      recordTransaction(userId, "COOP_INVEST", -amount, "Iuran Koperasi Warga");
    })
    .immediate();

  return {
    ok: true,
    amount,
    rescuedUsername: null as string | null,
    message: "Berhasil!",
    user: getOrCreateUser(userId, username),
    coop: getOrCreateServerCoop(guildId),
  };
}

export function getTopLeaderboard(limit = 5): LeaderboardEntry[] {
  const rows = stmt(
    `SELECT u.id AS userId, u.username AS username, u.badge AS badge, u.level AS level, u.karma AS karma, u.balance AS balance,
     COALESCE(SUM(b.value), 0) AS businessValue, MAX(0, u.balance + COALESCE(SUM(b.value), 0) - u.pinjol_debt) AS netWorth
     FROM users u LEFT JOIN user_businesses b ON u.id = b.user_id GROUP BY u.id
     ORDER BY MAX(0, u.balance + COALESCE(SUM(b.value), 0) - u.pinjol_debt) DESC, u.karma DESC LIMIT ?`,
  ).all(Math.max(1, limit)) as Array<Omit<LeaderboardEntry, "rank">>;
  return rows.map((entry, idx) => ({ rank: idx + 1, ...entry }));
}
