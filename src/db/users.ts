import { recordTransaction, sqlite } from "./connection.ts";
import type { ServerCoopRow, UserBusinessRow, UserRow } from "./types.ts";

export function hasUserAccount(userId: string): boolean {
  const row = sqlite.query("SELECT id FROM users WHERE id = ?").get(userId) as { id: string } | null;
  return row !== null;
}

export function computeProgressionQuest(user: UserRow, businesses: UserBusinessRow[]): string {
  if (user.is_seized === 1 || user.pinjol_debt > 0) {
    return "Seduh kopi lalu klik Bayar Segel di bawah";
  }
  const kedai = businesses.find((b) => b.biz_type === "kedai_kopi");
  const brankas = businesses.find((b) => b.biz_type === "brankas_darurat");
  const saham = businesses.find((b) => b.biz_type === "saham_koperasi");

  if (user.level < 2) {
    return "Klik Seduh Kopi 3x untuk naik ke Lv.2";
  }
  if ((kedai?.level ?? 1) < 2) {
    return "Naikkan Kedai Kopi ke Lv.2 di Kelola Usaha";
  }
  if ((brankas?.level ?? 0) < 1) {
    return "Buka Tabungan Emas Lv.1 di Kelola Usaha";
  }
  if ((kedai?.level ?? 1) < 3) {
    return "Naikkan Kedai Kopi ke Lv.3 di Kelola Usaha";
  }
  if ((saham?.level ?? 0) < 1) {
    return "Buka Koperasi Warga Lv.1 di Kelola Usaha";
  }
  return "Patungan kas atau tebus warga di Koperasi";
}

export function registerNewUser(
  userId: string,
  username: string,
): { created: boolean; user: UserRow; businesses: UserBusinessRow[]; message: string } {
  const existing = sqlite.query("SELECT * FROM users WHERE id = ?").get(userId) as UserRow | null;
  if (existing) {
    if (username && existing.username !== username) {
      sqlite.query("UPDATE users SET username = ? WHERE id = ?").run(username, userId);
      existing.username = username;
    }
    return {
      created: false,
      user: existing,
      businesses: getUserBusinesses(userId),
      message: "ℹ️ **Lapakmu sudah terdaftar di Pasar Malam KARSA!** Berikut buku kas terbarumu:",
    };
  }

  const tx = sqlite.transaction(() => {
    const now = Date.now();
    sqlite
      .query(
        `INSERT INTO users (
          id, username, job_title, badge, level, xp, balance, emergency_fund,
          gems, karma, pinjol_debt, pinjol_strikes, is_seized, coop_shares,
          skin_id, owned_skins, active_quest, daily_streak,
          last_work_at, last_passive_at, last_daily_at, created_at
        ) VALUES (
          ?, ?, 'PERINTIS LAPAK', 'WARGA BARU', 1, 0, 500000, 0,
          0, 60, 0, 0, 0, 0,
          'retro_gold', '["retro_gold"]', 'Seduh 3 kloter di /work untuk naik ke Lv.2', 0,
          0, 0, 0, ?
        )`,
      )
      .run(userId, username || "WARGA", now);

    // True zero-to-hero progression: Kedai Lv.1 open, Brankas & Saham Lv.0 locked!
    const starterBiz: Array<[string, string, number, number, number]> = [
      ["kedai_kopi", "Kedai Kopi Karsa", 1, 1_500_000, 350_000],
      ["brankas_darurat", "Tabungan Emas", 0, 0, 0],
      ["saham_koperasi", "Koperasi Warga", 0, 0, 0],
    ];
    for (const [btype, bname, lvl, val, yld] of starterBiz) {
      sqlite
        .query(
          `INSERT OR IGNORE INTO user_businesses (user_id, biz_type, name, level, value, daily_yield, ethical_mode)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
        )
        .run(userId, btype, bname, lvl, val, yld);
    }

    recordTransaction(userId, "STARTER", 500_000, "Buka lapak pertama Kedai Kopi Karsa (Lv.1)");
  });
  tx.immediate();

  const user = sqlite.query("SELECT * FROM users WHERE id = ?").get(userId) as UserRow;
  const businesses = getUserBusinesses(userId);
  return {
    created: true,
    user,
    businesses,
    message:
      `🎉 **Lapak Kopi Pertamamu Resmi Dibuka, ${user.username}!**\n` +
      `• **Modal Kas Awal:** Rp 500.000 | **Level:** Lv.1 Perintis Lapak\n` +
      `• **Unit Usaha:** ☕ Kedai Kopi Lv.1 *(Aktif)* | 🔒 Tabungan Emas *(Butuh Kedai Lv.2)* | 🔒 Koperasi Warga *(Butuh Kedai Lv.3 & Nama Baik 65)*\n` +
      `• **Langkah Pertama:** Klik **💼 Kerja (/work)** atau **☀️ Modal Harian (/daily)** di bawah untuk mulai mengumpulkan modal!`,
  };
}

export function getOrCreateUser(userId: string, username: string): UserRow {
  return registerNewUser(userId, username).user;
}

export function getUserBusinesses(userId: string): UserBusinessRow[] {
  return sqlite
    .query("SELECT * FROM user_businesses WHERE user_id = ? ORDER BY id ASC")
    .all(userId) as UserBusinessRow[];
}

export function getOrCreateServerCoop(guildId = "global_kota_mandiri"): ServerCoopRow {
  let row = sqlite.query("SELECT * FROM server_coop WHERE guild_id = ?").get(guildId) as ServerCoopRow | null;
  if (!row) {
    sqlite
      .query(
        "INSERT INTO server_coop (guild_id, pool_balance, eco_level, eco_health, rescued_count, contributors_json) VALUES (?, 0, 1, 50, 0, '[]')",
      )
      .run(guildId);
    row = sqlite.query("SELECT * FROM server_coop WHERE guild_id = ?").get(guildId) as ServerCoopRow;
  }
  try {
    row.contributors = JSON.parse(row.contributors_json || "[]");
  } catch {
    row.contributors = [];
  }
  return row;
}

export function formatCooldown(ms: number): string {
  if (ms <= 0) return "0d";
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}j ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}d`;
  }
  return `${seconds}d`;
}
