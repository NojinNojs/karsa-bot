import { sqlite, stmt } from "./connection.ts";
import { recordTransaction } from "./migrations.ts";
import type { ServerCoopRow, UserBusinessRow, UserRow } from "./types.ts";

export function getUserBusinesses(userId: string): UserBusinessRow[] {
  return stmt("SELECT * FROM user_businesses WHERE user_id = ? ORDER BY id ASC").all(userId) as UserBusinessRow[];
}

export function registerNewUser(
  userId: string,
  username: string,
): { created: boolean; user: UserRow; businesses: UserBusinessRow[]; message: string } {
  const existing = stmt("SELECT * FROM users WHERE id = ?").get(userId) as UserRow | null;
  if (existing) {
    if (username && existing.username !== username) {
      stmt("UPDATE users SET username = ? WHERE id = ?").run(username, userId);
      existing.username = username;
    }
    return {
      created: false,
      user: existing,
      businesses: getUserBusinesses(userId),
      message: "ℹ️ **Lapakmu sudah terdaftar di Pasar Malam KARSA!** Berikut buku kas terbarumu:",
    };
  }

  sqlite
    .transaction(() => {
      const now = Date.now();
      stmt(
        `INSERT INTO users (
        id, username, job_title, badge, level, xp, balance, emergency_fund,
        gems, karma, pinjol_debt, pinjol_strikes, is_seized, coop_shares,
        skin_id, owned_skins, active_quest, daily_streak,
        last_work_at, last_passive_at, last_daily_at, created_at
      ) VALUES (?, ?, 'PERINTIS LAPAK', 'WARGA BARU', 1, 0, 500000, 0, 0, 60, 0, 0, 0, 0, 'retro_gold', '["retro_gold"]', 'Seduh 3 kloter di /work untuk naik ke Lv.2', 0, 0, 0, 0, ?)`,
      ).run(userId, username || "WARGA", now);

      const starterBiz: Array<[string, string, number, number, number]> = [
        ["kedai_kopi", "Kedai Kopi Karsa", 1, 1_500_000, 350_000],
        ["brankas_darurat", "Tabungan Emas", 0, 0, 0],
        ["saham_koperasi", "Koperasi Warga", 0, 0, 0],
      ];
      for (const [btype, bname, lvl, val, yld] of starterBiz) {
        stmt(
          "INSERT OR IGNORE INTO user_businesses (user_id, biz_type, name, level, value, daily_yield, ethical_mode) VALUES (?, ?, ?, ?, ?, ?, 1)",
        ).run(userId, btype, bname, lvl, val, yld);
      }
      recordTransaction(userId, "STARTER", 500_000, "Buka lapak pertama Kedai Kopi Karsa (Lv.1)");
    })
    .immediate();

  const user = stmt("SELECT * FROM users WHERE id = ?").get(userId) as UserRow;
  return {
    created: true,
    user,
    businesses: getUserBusinesses(userId),
    message: `🎉 **Lapak Kopi Pertamamu Resmi Dibuka, ${user.username}!** Modal Rp 500Rb & Kedai Kopi Lv.1 siap.`,
  };
}

export function getOrCreateUser(userId: string, username: string): UserRow {
  return registerNewUser(userId, username).user;
}

export function getOrCreateServerCoop(guildId = "global_kota_mandiri"): ServerCoopRow {
  let row = stmt("SELECT * FROM server_coop WHERE guild_id = ?").get(guildId) as ServerCoopRow | null;
  if (!row) {
    stmt(
      "INSERT INTO server_coop (guild_id, pool_balance, eco_level, eco_health, rescued_count, contributors_json) VALUES (?, 0, 1, 50, 0, '[]')",
    ).run(guildId);
    row = stmt("SELECT * FROM server_coop WHERE guild_id = ?").get(guildId) as ServerCoopRow;
  }
  try {
    row.contributors = JSON.parse(row.contributors_json || "[]");
  } catch {
    row.contributors = [];
  }
  return row;
}
