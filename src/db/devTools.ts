import { getRankForLevel } from "../game/mechanics.ts";
import { stmt } from "./connection.ts";
import { recordTransaction } from "./migrations.ts";
import { computeProgressionQuest } from "./quests.ts";
import type { UserRow } from "./types.ts";
import { getOrCreateServerCoop, getOrCreateUser, getUserBusinesses, registerNewUser } from "./users.ts";

export function devClearAllCooldowns(userId?: string): number {
  if (userId) {
    stmt("UPDATE users SET last_work_at = 0, last_passive_at = 0, last_daily_at = 0 WHERE id = ?").run(userId);
    stmt("DELETE FROM ledger_logs WHERE user_id = ? AND kind = 'DAILY_MODAL'").run(userId);
    return 1;
  }
  const res = stmt("UPDATE users SET last_work_at = 0, last_passive_at = 0, last_daily_at = 0").run();
  stmt("DELETE FROM ledger_logs WHERE kind = 'DAILY_MODAL'").run();
  return res.changes;
}

export function devSpawnDummyVictim(guildId = "global_kota_mandiri"): UserRow {
  const dummyId = "dummy_warga_segel";
  const dummyName = "Warung_Mang_Ujang";
  registerNewUser(dummyId, dummyName);
  stmt(
    "UPDATE users SET level = 2, job_title = 'BARISTA PASAR', balance = 0, pinjol_debt = 1500000, is_seized = 1, karma = 45, badge = 'LAPAK DISEGEL', active_quest = 'Seduh kopi lalu klik Bayar Segel di bawah' WHERE id = ?",
  ).run(dummyId);
  getOrCreateServerCoop(guildId);
  return getOrCreateUser(dummyId, dummyName);
}

export function devModifyPlayer(opts: {
  targetQuery: string;
  callerId: string;
  callerName: string;
  cashInput?: string;
  statsInput?: string;
}): { ok: boolean; message: string; user: UserRow } {
  const q = opts.targetQuery.trim();
  let target: UserRow | null =
    !q || q.toLowerCase() === "me" || q.toLowerCase() === "saya"
      ? getOrCreateUser(opts.callerId, opts.callerName)
      : (stmt("SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?) LIMIT 1").get(q, q.replace(/^@/, "")) as UserRow | null);
  if (!target && q.toLowerCase() === opts.callerName.toLowerCase()) target = getOrCreateUser(opts.callerId, opts.callerName);
  if (!target)
    return {
      ok: false,
      message: `⚠️ Pemain \`${q}\` belum ditemukan. Kosongkan target untuk mengedit akunmu sendiri.`,
      user: getOrCreateUser(opts.callerId, opts.callerName),
    };

  let newBalance = target.balance;
  const cashRaw = (opts.cashInput || "").trim();
  if (cashRaw) {
    const isDelta = cashRaw.startsWith("+") || cashRaw.startsWith("-");
    const num = Number(cashRaw.replace(/[^0-9-]/g, ""));
    if (Number.isFinite(num)) newBalance = isDelta ? Math.max(0, target.balance + num) : Math.max(0, num);
  }

  let newLevel = target.level;
  let newXp = target.xp;
  let newGems = target.gems;
  let newKarma = target.karma;
  let newDebt = target.pinjol_debt;
  let newSeized = target.is_seized;
  const statsRaw = (opts.statsInput || "").trim().toLowerCase();
  if (statsRaw) {
    const lvM = statsRaw.match(/(?:lv|level)\s*=?\s*(\d+)/);
    if (lvM) {
      newLevel = Math.max(1, Math.min(50, Number(lvM[1])));
      newXp = (newLevel - 1) * 100;
    }
    const gmM = statsRaw.match(/(?:gem|gems)\s*=?\s*(\d+)/);
    if (gmM) newGems = Math.max(0, Number(gmM[1]));
    const kmM = statsRaw.match(/(?:karma|baik)\s*=?\s*(\d+)/);
    if (kmM) newKarma = Math.max(0, Math.min(100, Number(kmM[1])));
    if (statsRaw.includes("lunas") || statsRaw.includes("clear") || statsRaw.includes("bebas")) {
      newDebt = 0;
      newSeized = 0;
    }
  }

  const newJobTitle = getRankForLevel(newLevel).title;
  const newBadge = newSeized === 1 ? "LAPAK DISEGEL" : newKarma >= 80 ? "WARUNG JUJUR" : newKarma <= 35 ? "CATATAN MERAH" : "WARGA PASAR";
  const nextQuest = computeProgressionQuest(
    { ...target, balance: newBalance, level: newLevel, karma: newKarma, pinjol_debt: newDebt, is_seized: newSeized },
    getUserBusinesses(target.id),
  );

  stmt(
    "UPDATE users SET balance = ?, level = ?, xp = ?, gems = ?, karma = ?, pinjol_debt = ?, is_seized = ?, job_title = ?, badge = ?, active_quest = ? WHERE id = ?",
  ).run(newBalance, newLevel, newXp, newGems, newKarma, newDebt, newSeized, newJobTitle, newBadge, nextQuest, target.id);
  recordTransaction(target.id, "DEV_INJECT", newBalance - target.balance, `Dev Console override oleh ${opts.callerName}`);

  const updated = getOrCreateUser(target.id, target.username);
  return {
    ok: true,
    message: `🛠️ **Dev Inject Berhasil untuk \`${updated.username}\`!** Kas: **Rp ${updated.balance.toLocaleString("id-ID")}** | Lv.${updated.level} | **${updated.gems} 💎** | Nama Baik **${updated.karma}/100**`,
    user: updated,
  };
}
