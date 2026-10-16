import { Database, type Statement } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const isTestEnv =
  process.env.NODE_ENV === "test" || process.env.KARSA_TEST_DB === "1" || process.argv.some((a) => a.includes(".test.ts") || a === "test");

export const DB_PATH = isTestEnv ? ":memory:" : resolve(process.cwd(), "data/kota_mandiri.sqlite");
if (!isTestEnv) {
  mkdirSync(dirname(DB_PATH), { recursive: true });
}

export const sqlite = new Database(DB_PATH, { create: true });
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA synchronous = NORMAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");
sqlite.exec("PRAGMA temp_store = MEMORY;");
sqlite.exec("PRAGMA cache_size = -16000;");
sqlite.exec("PRAGMA mmap_size = 67108864;");

const stmtCache = new Map<string, Statement>();

export function stmt(sql: string): Statement {
  let cached = stmtCache.get(sql);
  if (!cached) {
    cached = sqlite.query(sql);
    stmtCache.set(sql, cached);
  }
  return cached;
}

export function checkpointWal(): void {
  try {
    if (!isTestEnv) sqlite.exec("PRAGMA wal_checkpoint(TRUNCATE);");
  } catch {
    // Ignore on read-only or in-memory DB
  }
}
