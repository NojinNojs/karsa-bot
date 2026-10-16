import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const isTestEnv =
  process.env.NODE_ENV === "test" ||
  process.env.KARSA_TEST_DB === "1" ||
  process.argv.some((a) => a.includes(".test.ts") || a === "test");

export const DB_PATH = isTestEnv ? ":memory:" : resolve(process.cwd(), "data/kota_mandiri.sqlite");
if (!isTestEnv) {
  mkdirSync(dirname(DB_PATH), { recursive: true });
}

export const sqlite = new Database(DB_PATH, { create: true });
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA synchronous = NORMAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

export function initDatabase(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      job_title TEXT NOT NULL DEFAULT 'PERACIK KOPI',
      badge TEXT NOT NULL DEFAULT 'WARGA BARU',
      level INTEGER NOT NULL DEFAULT 1,
      xp INTEGER NOT NULL DEFAULT 0,
      balance INTEGER NOT NULL DEFAULT 500000,
      emergency_fund INTEGER NOT NULL DEFAULT 0,
      gems INTEGER NOT NULL DEFAULT 0,
      karma INTEGER NOT NULL DEFAULT 60,
      pinjol_debt INTEGER NOT NULL DEFAULT 0,
      pinjol_strikes INTEGER NOT NULL DEFAULT 0,
      is_seized INTEGER NOT NULL DEFAULT 0,
      coop_shares INTEGER NOT NULL DEFAULT 0,
      skin_id TEXT NOT NULL DEFAULT 'retro_gold',
      owned_skins TEXT NOT NULL DEFAULT '["retro_gold"]',
      active_quest TEXT NOT NULL DEFAULT 'Seduh 3 kloter di /work untuk naik ke Lv.2',
      daily_streak INTEGER NOT NULL DEFAULT 0,
      last_work_at INTEGER NOT NULL DEFAULT 0,
      last_passive_at INTEGER NOT NULL DEFAULT 0,
      last_daily_at INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      biz_type TEXT NOT NULL,
      name TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      value INTEGER NOT NULL,
      daily_yield INTEGER NOT NULL,
      ethical_mode INTEGER NOT NULL DEFAULT 1,
      UNIQUE(user_id, biz_type)
    );

    CREATE TABLE IF NOT EXISTS server_coop (
      guild_id TEXT PRIMARY KEY,
      pool_balance INTEGER NOT NULL DEFAULT 0,
      eco_level INTEGER NOT NULL DEFAULT 1,
      eco_health INTEGER NOT NULL DEFAULT 50,
      rescued_count INTEGER NOT NULL DEFAULT 0,
      contributors_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS ledger_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      amount INTEGER NOT NULL,
      note TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // Safe migrations for existing databases
  const alterCols = [
    "ALTER TABLE users ADD COLUMN is_seized INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE users ADD COLUMN daily_streak INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE users ADD COLUMN last_passive_at INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE server_coop ADD COLUMN contributors_json TEXT NOT NULL DEFAULT '[]'",
  ];
  for (const sql of alterCols) {
    try {
      sqlite.exec(sql);
    } catch {
      // Column already exists
    }
  }
}

initDatabase();

export function resetAllUserData(): void {
  const tx = sqlite.transaction(() => {
    sqlite.exec("DELETE FROM ledger_logs;");
    sqlite.exec("DELETE FROM user_businesses;");
    sqlite.exec("DELETE FROM users;");
    sqlite.exec("DELETE FROM server_coop;");
  });
  tx.immediate();
}

export function recordTransaction(userId: string, kind: string, amount: number, note: string): void {
  sqlite
    .query("INSERT INTO ledger_logs (user_id, kind, amount, note, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(userId, kind, amount, note, Date.now());
}
