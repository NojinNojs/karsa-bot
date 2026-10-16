import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { BUSINESS_CATALOG, WORK_DILEMMAS, getCurrentMarketEvent, getRankForLevel } from "../game/mechanics.ts";
import { SKIN_PALETTES, type SkinId } from "../renderer/sprites.ts";

const isTestEnv =
  process.env.NODE_ENV === "test" ||
  process.env.KARSA_TEST_DB === "1" ||
  process.argv.some((a) => a.includes(".test.ts") || a === "test");

const DB_PATH = isTestEnv ? ":memory:" : resolve(process.cwd(), "data/kota_mandiri.sqlite");
if (!isTestEnv) {
  mkdirSync(dirname(DB_PATH), { recursive: true });
}

export const sqlite = new Database(DB_PATH, { create: true });
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA synchronous = NORMAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

export const WORK_COOLDOWN_MS = 30 * 1000; // 30 detik antar-giliran seduh
export const PASSIVE_COOLDOWN_MS = 5 * 60 * 1000; // 5 menit antar-klaim omzet
export const DAILY_COOLDOWN_MS = 20 * 60 * 60 * 1000; // 20 jam
export const DAILY_STREAK_RESET_MS = 48 * 60 * 60 * 1000; // 48 jam
export const COOP_PATUNGAN_COST_RP = 1_500_000;
export const COOP_RESCUE_COST_RP = 1_500_000;

export interface ServerCoopContributor {
  userId?: string;
  name: string;
  role: string;
  totalRp: number;
  warungSaved: number;
}

export interface UserRow {
  id: string;
  username: string;
  job_title: string;
  badge: string;
  level: number;
  xp: number;
  balance: number;
  emergency_fund: number;
  gems: number;
  karma: number;
  pinjol_debt: number;
  pinjol_strikes: number;
  is_seized: number;
  coop_shares: number;
  skin_id: SkinId;
  owned_skins: string;
  active_quest: string;
  daily_streak: number;
  last_work_at: number;
  last_passive_at: number;
  last_daily_at: number;
  created_at: number;
}

export interface UserBusinessRow {
  id: number;
  user_id: string;
  biz_type: "kedai_kopi" | "brankas_darurat" | "saham_koperasi";
  name: string;
  level: number;
  value: number;
  daily_yield: number;
  ethical_mode: number;
}

export interface ServerCoopRow {
  guild_id: string;
  pool_balance: number;
  eco_level: number;
  eco_health: number;
  rescued_count: number;
  contributors_json?: string;
  contributors?: ServerCoopContributor[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  badge: string;
  level: number;
  karma: number;
  balance: number;
  businessValue: number;
  netWorth: number;
}

export interface DailyBonusResult {
  ok: boolean;
  rewardRp: number;
  karmaBonus: number;
  streak: number;
  remainingMs: number;
  cooldownText: string;
  message: string;
  user: UserRow;
}

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
  username: string
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
        )`
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
           VALUES (?, ?, ?, ?, ?, ?, 1)`
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
        "INSERT INTO server_coop (guild_id, pool_balance, eco_level, eco_health, rescued_count, contributors_json) VALUES (?, 0, 1, 50, 0, '[]')"
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

export function workShift(
  userId: string,
  username: string,
  choice: "ethical" | "corrupt",
  dilemmaIdx?: number,
  opts?: { enforceCooldown?: boolean }
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
      deltaRp = Math.round((c.rewardRp + karmaBonus) * marketEvent.workMultiplier);
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
      user.is_seized === 1
        ? "LAPAK DISEGEL"
        : newKarma >= 80
          ? "WARUNG JUJUR"
          : newKarma <= 35
            ? "CATATAN MERAH"
            : "WARGA PASAR";

    const bizzes = getUserBusinesses(userId);
    const nextQuest = computeProgressionQuest(
      { ...user, level: newLevel, karma: newKarma },
      bizzes
    );

    sqlite
      .query(
        "UPDATE users SET balance = ?, karma = ?, xp = ?, level = ?, gems = gems + ?, job_title = ?, badge = ?, active_quest = ?, last_work_at = ? WHERE id = ?"
      )
      .run(newBalance, newKarma, newXp, newLevel, gemBonus, newJobTitle, newBadge, nextQuest, now, userId);

    recordTransaction(
      userId,
      choice === "ethical" ? "WORK_ETHICAL" : "WORK_CORRUPT",
      deltaRp,
      `${dilemma.title}: ${message}`
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

export function buyOrUpgradeBusiness(
  userId: string,
  username: string,
  bizType: "kedai_kopi" | "brankas_darurat" | "saham_koperasi"
) {
  const user = getOrCreateUser(userId, username);
  const cat = BUSINESS_CATALOG[bizType]!;
  const allBizzes = getUserBusinesses(userId);
  const kedai = allBizzes.find((b) => b.biz_type === "kedai_kopi");
  const existing = allBizzes.find((b) => b.biz_type === bizType) ?? null;

  // Gate 1: Seizure Lock
  if (user.is_seized === 1 || user.pinjol_debt > 0) {
    return {
      ok: false,
      reason:
        "🚨 **Lapak Sedang Disegel / Memiliki Tunggakan!** Lunasi tagihan talangan terlebih dahulu di `/jalan-pintas` sebelum melakukan ekspansi usaha.",
      user,
    };
  }

  // Gate 2: Prerequisite Kedai Kopi Level
  const kedaiLvl = kedai?.level ?? 1;
  if (kedaiLvl < cat.requiredKedaiLevel) {
    return {
      ok: false,
      reason: `🔒 **Syarat Belum Terpenuhi!** Naikin **Kedai Kopi ke Lv.${cat.requiredKedaiLevel}** terlebih dahulu sebelum membuka/menaikkan **${cat.name}** (Saat ini: Kedai Lv.${kedaiLvl}).`,
      user,
    };
  }

  // Gate 3: Prerequisite Karma / Nama Baik
  if (user.karma < cat.requiredKarma) {
    return {
      ok: false,
      reason: `🔒 **Syarat Nama Baik Belum Cukup!** Butuh **Nama Baik minimal ${cat.requiredKarma}/100** untuk membuka **${cat.name}** (Saat ini: ${user.karma}/100).`,
      user,
    };
  }

  const currentLevel = existing?.level ?? 0;
  const nextLevel = currentLevel + 1;
  const rawCost = Math.round(cat.baseCost * Math.pow(1.35, Math.max(0, nextLevel - 1)));
  // Karma >= 80 grants 15% expansion discount
  const upgradeCost = user.karma >= 80 ? Math.round(rawCost * 0.85) : rawCost;
  const yieldBoost = currentLevel === 0 ? cat.baseYield : Math.round(cat.baseYield * 0.45);

  if (user.balance < upgradeCost) {
    const costLabel =
      upgradeCost >= 1_000_000
        ? `Rp${(upgradeCost / 1_000_000).toFixed(2)} Juta`
        : `Rp${Math.round(upgradeCost / 1_000).toLocaleString("id-ID")} Rb`;
    const balLabel =
      user.balance >= 1_000_000
        ? `Rp${(user.balance / 1_000_000).toFixed(2)} Juta`
        : `Rp${Math.round(user.balance / 1_000).toLocaleString("id-ID")} Rb`;
    return {
      ok: false,
      reason: `Kas belum cukup untuk **${cat.name} Lv.${nextLevel}**! Butuh **${costLabel}**, kas kamu saat ini **${balLabel}**.`,
      user,
    };
  }

  const tx = sqlite.transaction(() => {
    const emergencyAdd = bizType === "brankas_darurat" ? upgradeCost : 0;
    sqlite
      .query(
        "UPDATE users SET balance = balance - ?, emergency_fund = emergency_fund + ?, karma = MIN(100, karma + 3) WHERE id = ?"
      )
      .run(upgradeCost, emergencyAdd, userId);

    if (existing) {
      sqlite
        .query(
          "UPDATE user_businesses SET level = ?, name = ?, value = value + ?, daily_yield = daily_yield + ? WHERE id = ?"
        )
        .run(nextLevel, cat.name, upgradeCost, yieldBoost, existing.id);
    } else {
      sqlite
        .query(
          "INSERT INTO user_businesses (user_id, biz_type, name, level, value, daily_yield, ethical_mode) VALUES (?, ?, ?, ?, ?, ?, 1)"
        )
        .run(userId, bizType, cat.name, nextLevel, upgradeCost, yieldBoost);
    }

    const updatedBizzes = getUserBusinesses(userId);
    const updatedUser = sqlite.query("SELECT * FROM users WHERE id = ?").get(userId) as UserRow;
    const nextQuest = computeProgressionQuest(updatedUser, updatedBizzes);
    sqlite.query("UPDATE users SET active_quest = ? WHERE id = ?").run(nextQuest, userId);

    recordTransaction(userId, "BIZ_UPGRADE", -upgradeCost, `Ekspansi ${cat.name} ke Lv.${nextLevel}`);
  });
  tx.immediate();

  return {
    ok: true,
    nextLevel,
    upgradeCost,
    yieldBoost,
    user: getOrCreateUser(userId, username),
  };
}

export function claimPassiveIncome(
  userId: string,
  username: string,
  opts?: { enforceCooldown?: boolean }
) {
  const user = getOrCreateUser(userId, username);
  const now = Date.now();

  if (user.is_seized === 1) {
    return {
      ok: false,
      reason: "🚨 **Lapak Sedang Disegel!** Omzet usaha tertahan sampai tunggakan talangan dilunasi di `/jalan-pintas`.",
      gross: 0,
      net: 0,
      taxSaved: false,
      user,
    };
  }

  if (opts?.enforceCooldown && user.last_passive_at > 0 && now - user.last_passive_at < PASSIVE_COOLDOWN_MS) {
    const remainingMs = PASSIVE_COOLDOWN_MS - (now - user.last_passive_at);
    return {
      ok: false,
      reason: `⏳ **Setoran Omzet Belum Siap!** Tunggu **${formatCooldown(remainingMs)}** lagi sebelum mencairkan hasil usaha berikutnya.`,
      gross: 0,
      net: 0,
      taxSaved: false,
      user,
    };
  }

  const bizzes = getUserBusinesses(userId);
  const { event: marketEvent } = getCurrentMarketEvent();
  const gross = bizzes.reduce((acc, b) => acc + (b.level > 0 ? b.daily_yield : 0), 0);
  if (gross <= 0) {
    return {
      ok: false,
      reason: "⚠️ Belum ada unit usaha aktif yang menghasilkan omzet.",
      gross: 0,
      net: 0,
      taxSaved: false,
      user,
    };
  }

  const taxRate = user.karma >= 80 ? 0.05 : 0.2;
  const coop = getOrCreateServerCoop("global_kota_mandiri");
  const marketLvlBonus = 1 + Math.max(0, coop.eco_level - 1) * 0.05;
  const net = Math.round(gross * marketEvent.passiveMultiplier * marketLvlBonus * (1 - taxRate));

  const tx = sqlite.transaction(() => {
    const newBal = user.balance + net;
    const nextQuest = computeProgressionQuest({ ...user, balance: newBal }, bizzes);
    sqlite
      .query("UPDATE users SET balance = ?, last_passive_at = ?, active_quest = ? WHERE id = ?")
      .run(newBal, now, nextQuest, userId);
    recordTransaction(
      userId,
      "PASSIVE_CLAIM",
      net,
      `Setoran usaha harian (Potongan sewa ${Math.round(taxRate * 100)}%)`
    );
  });
  tx.immediate();

  return {
    ok: true,
    gross,
    net,
    taxSaved: user.karma >= 80,
    user: getOrCreateUser(userId, username),
  };
}

export function takeShortcutGambleOrPinjol(
  userId: string,
  username: string,
  mode: "pinjol" | "slot",
  guildId = "global_kota_mandiri"
) {
  const user = getOrCreateUser(userId, username);

  let cashLost = 0;
  let newDebtAdded = 0;
  let assetSeizedName = "Mesin Kopi Kedai";
  let assetSeizedValue = 1_500_000;
  let narrative = "";

  const tx = sqlite.transaction(() => {
    if (mode === "pinjol") {
      const loanPrincipal = 1_500_000;
      const illegalFeeAndInterest = 1_500_000;
      newDebtAdded = loanPrincipal + illegalFeeAndInterest;
      cashLost = Math.min(user.balance, 1_000_000);
      assetSeizedName = "Mesin Kopi Kedai";
      assetSeizedValue = 1_500_000;
      narrative =
        "Dana talangan kilat jatuh tempo! Bunga berbunga 8%/hari menguras laci kas dan penagih menyegel mesin kopi warungmu.";
    } else {
      cashLost = Math.min(user.balance, Math.max(250_000, Math.round(user.balance * 0.65)));
      newDebtAdded = 2_000_000;
      assetSeizedName = "Gerobak & Stok Biji";
      assetSeizedValue = Math.max(500_000, cashLost);
      narrative =
        "Modal belanja bahan baku habis di meja putaran malam! Warung gagal buka pagi ini dan gerobak disita penagih.";
    }

    const updatedBalance = Math.max(0, user.balance - cashLost);
    const updatedKarma = Math.max(10, user.karma - 25);
    const updatedDebt = user.pinjol_debt + newDebtAdded;
    const isSeized = updatedDebt >= 2_000_000 ? 1 : 0;

    // Degrade Kedai Kopi by 1 level (min 1) on seizure, while emergency_fund remains 100% untouched!
    if (isSeized === 1) {
      sqlite
        .query(
          "UPDATE user_businesses SET level = MAX(1, level - 1), value = MAX(1500000, value - 500000) WHERE user_id = ? AND biz_type = 'kedai_kopi'"
        )
        .run(userId);
    }

    sqlite
      .query(
        "UPDATE users SET balance = ?, karma = ?, pinjol_debt = ?, pinjol_strikes = pinjol_strikes + 1, is_seized = ?, badge = 'LAPAK DISEGEL', active_quest = 'Seduh kopi lalu klik Bayar Segel di bawah' WHERE id = ?"
      )
      .run(updatedBalance, updatedKarma, updatedDebt, isSeized, userId);

    sqlite
      .query("UPDATE server_coop SET eco_health = MAX(20, eco_health - 5) WHERE guild_id = ?")
      .run(guildId);

    recordTransaction(userId, mode === "pinjol" ? "SEGEL_TAGIHAN" : "KAS_LUDES", -cashLost, narrative);
  });
  tx.immediate();

  const updatedUser = getOrCreateUser(userId, username);
  return {
    mode,
    user: updatedUser,
    cashLost,
    newDebtAdded,
    totalDebt: updatedUser.pinjol_debt,
    assetSeizedName,
    assetSeizedValue,
    narrative,
  };
}

export function repayPinjolDebt(userId: string, username: string, customAmount?: number) {
  const user = getOrCreateUser(userId, username);
  if (user.pinjol_debt <= 0) {
    return {
      ok: false,
      paidRp: 0,
      remainingDebt: 0,
      sealLifted: false,
      message: "✅ **Lapakmu Bebas Tunggakan!** Tidak ada tagihan talangan yang perlu dibayar.",
      user,
    };
  }

  const totalLiquid = user.balance;
  if (totalLiquid <= 0) {
    return {
      ok: false,
      paidRp: 0,
      remainingDebt: user.pinjol_debt,
      sealLifted: false,
      message: "⚠️ **Laci Kas Kosong!** Klik **☕ Seduh Cari Uang** atau **☀️ Uang Harian** terlebih dahulu untuk mengumpulkan uang cicilan (Tabungan Emas tetap aman & tidak ikut terpakai).",
      user,
    };
  }

  const targetPay = customAmount ? Math.min(customAmount, user.pinjol_debt) : user.pinjol_debt;
  const actualPay = Math.min(totalLiquid, targetPay);
  const fromCash = actualPay;
  const fromEmergency = 0;
  const newDebt = Math.max(0, user.pinjol_debt - actualPay);
  const sealLifted = newDebt === 0;

  const tx = sqlite.transaction(() => {
    const newBadge = sealLifted ? "BANGKIT LAGI" : "LAPAK DISEGEL";
    const newKarma = sealLifted ? Math.min(100, user.karma + 15) : Math.min(100, user.karma + 5);
    const bizzes = getUserBusinesses(userId);
    const nextQuest = sealLifted
      ? computeProgressionQuest({ ...user, pinjol_debt: 0, is_seized: 0, karma: newKarma }, bizzes)
      : `Sisa tagihan Rp${(newDebt / 1_000_000).toFixed(1)} Jt di /jalan-pintas`;

    sqlite
      .query(
        "UPDATE users SET balance = balance - ?, emergency_fund = emergency_fund - ?, pinjol_debt = ?, is_seized = ?, karma = ?, badge = ?, active_quest = ? WHERE id = ?"
      )
      .run(fromCash, fromEmergency, newDebt, sealLifted ? 0 : 1, newKarma, newBadge, nextQuest, userId);

    recordTransaction(
      userId,
      "REPAY_PINJOL",
      -actualPay,
      sealLifted ? "Pelunasan penuh tagihan & pembukaan segel lapak" : "Cicilan tagihan talangan"
    );
  });
  tx.immediate();

  const updated = getOrCreateUser(userId, username);
  return {
    ok: true,
    paidRp: actualPay,
    remainingDebt: newDebt,
    sealLifted,
    message: sealLifted
      ? `🎉 **SEGEL LAPAK RESMI DIBUKA!** Kamu melunasi **Rp${(actualPay / 1_000_000).toFixed(2)} Juta** hingga tuntas. Gerobak dan Kedai Kopi kembali beroperasi penuh!`
      : `💸 **Cicilan Tagihan Diterima!** Terbayar **Rp${(actualPay / 1_000_000).toFixed(2)} Juta** (Sisa tagihan: **Rp${(newDebt / 1_000_000).toFixed(2)} Juta**). Terus seduh kopi di \`/work\` sampai segel terbuka!`,
    user: updated,
  };
}

export function investOrRescueCoop(
  userId: string,
  username: string,
  action: "patungan" | "rescue",
  guildId = "global_kota_mandiri",
  targetUserId?: string
) {
  const user = getOrCreateUser(userId, username);
  const coop = getOrCreateServerCoop(guildId);
  const amount = action === "patungan" ? COOP_PATUNGAN_COST_RP : COOP_RESCUE_COST_RP;

  if (action === "patungan") {
    if (user.level < 2 && user.balance < amount) {
      return {
        ok: false,
        amount: 0,
        rescuedUsername: null as string | null,
        message:
          "🔒 **Syarat Belum Terpenuhi!** Capai **Level 2** terlebih dahulu dengan menyeduh kopi di `/work` sebelum menyetor patungan Koperasi Pasar.",
        user,
        coop,
      };
    }
    if (user.pinjol_debt > 0 || user.is_seized === 1) {
      return {
        ok: false,
        amount: 0,
        rescuedUsername: null as string | null,
        message:
          "🔒 **Tunggakan Aktif!** Lunasi tagihan talanganmu terlebih dahulu sebelum menyetor modal ke Koperasi Pasar.",
        user,
        coop,
      };
    }
  }

  if (user.balance < amount) {
    return {
      ok: false,
      amount: 0,
      rescuedUsername: null as string | null,
      message: `Kas belum cukup untuk aksi koperasi ini (Butuh **Rp ${(amount / 1_000_000).toFixed(1).replace(".", ",")}Jt**, Kasmu: **Rp ${(user.balance / 1_000_000).toFixed(1).replace(".", ",")}Jt**).`,
      user,
      coop,
    };
  }

  let rescuedUsername: string | null = null;

  const tx = sqlite.transaction(() => {
    const contributors: ServerCoopContributor[] = [...(coop.contributors || [])];
    const existingContrib = contributors.find((c) => c.userId === userId || c.name.toUpperCase() === username.toUpperCase());

    if (action === "patungan") {
      if (existingContrib) {
        existingContrib.totalRp += amount;
        existingContrib.role = existingContrib.totalRp >= 4_500_000 ? "PENDIRI KOPERASI" : "MITRA AKTIF";
      } else {
        contributors.push({
          userId,
          name: username,
          role: "MITRA AKTIF",
          totalRp: amount,
          warungSaved: 0,
        });
      }

      sqlite
        .query(
          "UPDATE users SET balance = balance - ?, coop_shares = coop_shares + ?, karma = MIN(100, karma + 8) WHERE id = ?"
        )
        .run(amount, amount, userId);
      sqlite
        .query(
          "UPDATE server_coop SET pool_balance = pool_balance + ?, eco_level = MIN(5, 1 + CAST((pool_balance + ?) / 3000000 AS INTEGER)), eco_health = MIN(100, eco_health + 6), contributors_json = ? WHERE guild_id = ?"
        )
        .run(amount, amount, JSON.stringify(contributors), guildId);
      sqlite
        .query(
          "UPDATE user_businesses SET level = MAX(1, level), value = value + ?, daily_yield = daily_yield + 250000 WHERE user_id = ? AND biz_type = 'saham_koperasi'"
        )
        .run(amount, userId);
      recordTransaction(userId, "COOP_INVEST", -amount, "Iuran Koperasi Warga");
    } else {
      // Find target indebted player to rescue (either explicit targetUserId, another indebted player in DB, or self if indebted)
      let targetRow: UserRow | null = null;
      if (targetUserId) {
        targetRow = sqlite
          .query("SELECT * FROM users WHERE id = ? AND (is_seized = 1 OR pinjol_debt > 0)")
          .get(targetUserId) as UserRow | null;
      }
      if (!targetRow) {
        targetRow = sqlite
          .query("SELECT * FROM users WHERE (is_seized = 1 OR pinjol_debt > 0) AND id != ? ORDER BY pinjol_debt DESC LIMIT 1")
          .get(userId) as UserRow | null;
      }
      if (!targetRow && (user.is_seized === 1 || user.pinjol_debt > 0)) {
        targetRow = user;
      }

      if (targetRow) {
        rescuedUsername = targetRow.username;
        const targetBizzes = getUserBusinesses(targetRow.id);
        const restoredQuest = computeProgressionQuest(
          { ...targetRow, pinjol_debt: 0, is_seized: 0, karma: Math.min(100, targetRow.karma + 15) },
          targetBizzes
        );
        sqlite
          .query(
            "UPDATE users SET pinjol_debt = 0, is_seized = 0, karma = MIN(100, karma + 15), badge = 'BANGKIT LAGI', active_quest = ? WHERE id = ?"
          )
          .run(restoredQuest, targetRow.id);
      }

      if (existingContrib) {
        existingContrib.totalRp += amount;
        existingContrib.warungSaved += 1;
        existingContrib.role = "PENEBUS WARGA";
      } else {
        contributors.push({
          userId,
          name: username,
          role: "PENEBUS WARGA",
          totalRp: amount,
          warungSaved: 1,
        });
      }

      sqlite
        .query(
          "UPDATE users SET balance = balance - ?, karma = MIN(100, karma + 25), gems = gems + 2, badge = 'WARUNG JUJUR' WHERE id = ?"
        )
        .run(amount, userId);
      sqlite
        .query(
          "UPDATE server_coop SET pool_balance = pool_balance + ?, eco_level = MIN(5, 1 + CAST((pool_balance + ?) / 3000000 AS INTEGER)), rescued_count = rescued_count + 1, eco_health = MIN(100, eco_health + 10), contributors_json = ? WHERE guild_id = ?"
        )
        .run(amount, amount, JSON.stringify(contributors), guildId);
      recordTransaction(
        userId,
        "COOP_RESCUE",
        -amount,
        rescuedUsername ? `Tebus segel lapak @${rescuedUsername}` : "Dana talangan darurat Koperasi Warga"
      );
    }
  });
  tx.immediate();

  return {
    ok: true,
    amount,
    rescuedUsername,
    user: getOrCreateUser(userId, username),
    coop: getOrCreateServerCoop(guildId),
  };
}

export function equipOrBuySkin(
  userId: string,
  username: string,
  skinId: SkinId,
  payWith: "rp" | "gems" = "rp"
) {
  const user = getOrCreateUser(userId, username);
  const skin = SKIN_PALETTES[skinId];
  if (!skin) {
    return { ok: false, bought: false, message: "Tema kartu tidak ditemukan.", user };
  }

  const owned: string[] = JSON.parse(user.owned_skins || '["retro_gold"]');

  if (owned.includes(skinId)) {
    sqlite.query("UPDATE users SET skin_id = ? WHERE id = ?").run(skinId, userId);
    return {
      ok: true,
      bought: false,
      message: `Skin **${skin.name}** berhasil dipasang ke Kartu Catatan Usaha kamu!`,
      user: getOrCreateUser(userId, username),
    };
  }

  if (user.is_seized === 1 || user.pinjol_debt > 0) {
    return {
      ok: false,
      bought: false,
      message: "🚨 **Lapak Sedang Disegel!** Lunasi tunggakan terlebih dahulu sebelum membeli tema kartu baru.",
      user,
    };
  }

  if (payWith === "gems") {
    if (user.gems < skin.priceGems) {
      return {
        ok: false,
        bought: false,
        message: `Permata 💎 belum cukup untuk membeli **${skin.name}** (Harga: **${skin.priceGems} 💎**, Permatamu: **${user.gems} 💎**).`,
        user,
      };
    }
    const tx = sqlite.transaction(() => {
      owned.push(skinId);
      sqlite
        .query("UPDATE users SET gems = gems - ?, skin_id = ?, owned_skins = ? WHERE id = ?")
        .run(skin.priceGems, skinId, JSON.stringify(owned), userId);
      recordTransaction(userId, "BUY_SKIN_GEMS", 0, `Beli & pasang skin ${skin.name} (${skin.priceGems} Gems)`);
    });
    tx.immediate();
    return {
      ok: true,
      bought: true,
      message: `Selamat! Kamu membeli & memasang skin **${skin.name}** dengan **${skin.priceGems} 💎**!`,
      user: getOrCreateUser(userId, username),
    };
  }

  if (user.balance < skin.priceRp) {
    return {
      ok: false,
      bought: false,
      message: `Kas belum cukup untuk membeli **${skin.name}** (Harga: **Rp ${(skin.priceRp / 1_000_000).toFixed(1).replace(".", ",")}Jt**, Kasmu: **Rp ${(user.balance / 1_000_000).toFixed(1).replace(".", ",")}Jt**).`,
      user,
    };
  }

  const tx = sqlite.transaction(() => {
    owned.push(skinId);
    sqlite
      .query("UPDATE users SET balance = balance - ?, skin_id = ?, owned_skins = ? WHERE id = ?")
      .run(skin.priceRp, skinId, JSON.stringify(owned), userId);
    recordTransaction(userId, "BUY_SKIN", -skin.priceRp, `Beli & pasang skin ${skin.name}`);
  });
  tx.immediate();

  return {
    ok: true,
    bought: true,
    message: `Selamat! Kamu berhasil membeli & memasang skin **${skin.name}**!`,
    user: getOrCreateUser(userId, username),
  };
}

export function claimDailyBonus(userId: string, username: string): DailyBonusResult {
  const user = getOrCreateUser(userId, username);
  const now = Date.now();

  const lastLog = sqlite
    .query("SELECT created_at FROM ledger_logs WHERE user_id = ? AND kind = 'DAILY_MODAL' ORDER BY created_at DESC LIMIT 1")
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
      .query("UPDATE users SET balance = ?, karma = ?, gems = gems + ?, daily_streak = ?, last_daily_at = ?, active_quest = ? WHERE id = ?")
      .run(newBal, newKarma, gemReward, streak, now, nextQuest, userId);
    recordTransaction(
      userId,
      "DAILY_MODAL",
      rewardRp,
      `Uang Belanja Harian Pasar (Hari ke-${streak}${karmaBonusRp > 0 ? " + Bonus Reputasi" : ""})`
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

export function getTopLeaderboard(limit = 5): LeaderboardEntry[] {
  const safeLimit = Math.max(1, limit);
  const rows = sqlite
    .query(
      `SELECT
         u.id AS userId,
         u.username AS username,
         u.badge AS badge,
         u.level AS level,
         u.karma AS karma,
         u.balance AS balance,
         COALESCE(SUM(b.value), 0) AS businessValue,
         MAX(0, u.balance + COALESCE(SUM(b.value), 0) - u.pinjol_debt) AS netWorth
       FROM users u
       LEFT JOIN user_businesses b ON u.id = b.user_id
       GROUP BY u.id
       ORDER BY MAX(0, u.balance + COALESCE(SUM(b.value), 0) - u.pinjol_debt) DESC, u.karma DESC
       LIMIT ?`
    )
    .all(safeLimit) as Array<Omit<LeaderboardEntry, "rank">>;

  return rows.map((entry, idx) => ({
    rank: idx + 1,
    ...entry,
  }));
}

export const BOT_STARTED_AT = Date.now();

export interface DeveloperTelemetry {
  uptimeSec: number;
  uptimeShort: string;
  memoryRssMb: number;
  memoryHeapMb: number;
  bunVersion: string;
  totalUsers: number;
  activeBizCount: number;
  totalLogs: number;
  seizedCount: number;
  avgKarma: number;
  totalCash: number;
  totalEmergency: number;
  totalBizValue: number;
  totalDebt: number;
  totalNetWorth: number;
  coopPool: number;
  coopLevel: number;
  coopHealth: number;
  coopRescued: number;
  marketTitle: string;
  marketTitleClean: string;
  marketOverride: boolean;
  recentLogs: Array<{ user_id: string; username: string; kind: string; amount: number; note: string; created_at: number }>;
}

export function getDeveloperTelemetry(guildId = "global_kota_mandiri"): DeveloperTelemetry {
  const uptimeSec = Math.max(1, Math.floor((Date.now() - BOT_STARTED_AT) / 1000));
  const hours = Math.floor(uptimeSec / 3600);
  const mins = Math.floor((uptimeSec % 3600) / 60);
  const secs = uptimeSec % 60;
  const uptimeShort = hours > 0 ? `${hours}J ${mins}M` : mins > 0 ? `${mins}M ${secs}D` : `${secs}D`;

  const mem = process.memoryUsage();
  const memoryRssMb = Math.round(mem.rss / (1024 * 1024));
  const memoryHeapMb = Math.round(mem.heapUsed / (1024 * 1024));

  const uStats = sqlite
    .query(
      `SELECT
         COUNT(*) AS totalUsers,
         COALESCE(SUM(balance), 0) AS totalCash,
         COALESCE(SUM(emergency_fund), 0) AS totalEmergency,
         COALESCE(SUM(pinjol_debt), 0) AS totalDebt,
         COALESCE(SUM(CASE WHEN is_seized = 1 OR pinjol_debt > 0 THEN 1 ELSE 0 END), 0) AS seizedCount,
         COALESCE(ROUND(AVG(karma)), 60) AS avgKarma
       FROM users`
    )
    .get() as {
    totalUsers: number;
    totalCash: number;
    totalEmergency: number;
    totalDebt: number;
    seizedCount: number;
    avgKarma: number;
  };

  const bStats = sqlite
    .query(
      `SELECT
         COUNT(*) AS activeBizCount,
         COALESCE(SUM(value), 0) AS totalBizValue
       FROM user_businesses
       WHERE level > 0`
    )
    .get() as { activeBizCount: number; totalBizValue: number };

  const logCount = sqlite.query("SELECT COUNT(*) AS cnt FROM ledger_logs").get() as { cnt: number };

  const recentLogs = sqlite
    .query(
      `SELECT l.user_id, COALESCE(u.username, l.user_id) AS username, l.kind, l.amount, l.note, l.created_at
       FROM ledger_logs l
       LEFT JOIN users u ON l.user_id = u.id
       ORDER BY l.id DESC
       LIMIT 6`
    )
    .all() as Array<{ user_id: string; username: string; kind: string; amount: number; note: string; created_at: number }>;

  const coop = getOrCreateServerCoop(guildId);
  const mkt = getCurrentMarketEvent();
  const marketTitleClean = mkt.event.title.replace(/[^\x20-\x7E]/g, "").trim().toUpperCase();

  return {
    uptimeSec,
    uptimeShort,
    memoryRssMb,
    memoryHeapMb,
    bunVersion: typeof Bun !== "undefined" ? Bun.version : "1.x",
    totalUsers: uStats.totalUsers,
    activeBizCount: bStats.activeBizCount,
    totalLogs: logCount.cnt,
    seizedCount: uStats.seizedCount,
    avgKarma: uStats.avgKarma,
    totalCash: uStats.totalCash,
    totalEmergency: uStats.totalEmergency,
    totalBizValue: bStats.totalBizValue,
    totalDebt: uStats.totalDebt,
    totalNetWorth: Math.max(0, uStats.totalCash + bStats.totalBizValue - uStats.totalDebt),
    coopPool: coop.pool_balance,
    coopLevel: coop.eco_level,
    coopHealth: coop.eco_health,
    coopRescued: coop.rescued_count,
    marketTitle: mkt.event.title,
    marketTitleClean,
    marketOverride: Boolean(mkt.isOverride),
    recentLogs,
  };
}

export function devClearAllCooldowns(userId?: string): number {
  if (userId) {
    sqlite.query("UPDATE users SET last_work_at = 0, last_passive_at = 0, last_daily_at = 0 WHERE id = ?").run(userId);
    sqlite.query("DELETE FROM ledger_logs WHERE user_id = ? AND kind = 'DAILY_MODAL'").run(userId);
    return 1;
  }
  const res = sqlite.query("UPDATE users SET last_work_at = 0, last_passive_at = 0, last_daily_at = 0").run();
  sqlite.query("DELETE FROM ledger_logs WHERE kind = 'DAILY_MODAL'").run();
  return res.changes;
}

export function devSpawnDummyVictim(guildId = "global_kota_mandiri"): UserRow {
  const dummyId = "dummy_warga_segel";
  const dummyName = "Warung_Mang_Ujang";
  registerNewUser(dummyId, dummyName);
  sqlite
    .query(
      "UPDATE users SET level = 2, job_title = 'BARISTA PASAR', balance = 0, pinjol_debt = 1500000, is_seized = 1, karma = 45, badge = 'LAPAK DISEGEL', active_quest = 'Seduh kopi lalu klik Bayar Segel di bawah' WHERE id = ?"
    )
    .run(dummyId);
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
  let target: UserRow | null = null;

  if (!q || q.toLowerCase() === "me" || q.toLowerCase() === "saya") {
    target = getOrCreateUser(opts.callerId, opts.callerName);
  } else {
    target = sqlite
      .query("SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?) LIMIT 1")
      .get(q, q.replace(/^@/, "")) as UserRow | null;
    if (!target && q.toLowerCase() === opts.callerName.toLowerCase()) {
      target = getOrCreateUser(opts.callerId, opts.callerName);
    }
  }

  if (!target) {
    return {
      ok: false,
      message: `⚠️ Pemain \`${q}\` belum ditemukan di database. Kosongkan kolom target untuk mengedit akunmu sendiri.`,
      user: getOrCreateUser(opts.callerId, opts.callerName),
    };
  }

  let newBalance = target.balance;
  const cashRaw = (opts.cashInput || "").trim();
  if (cashRaw) {
    const isDelta = cashRaw.startsWith("+") || cashRaw.startsWith("-");
    const num = Number(cashRaw.replace(/[^0-9-]/g, ""));
    if (Number.isFinite(num)) {
      newBalance = isDelta ? Math.max(0, target.balance + num) : Math.max(0, num);
    }
  }

  let newLevel = target.level;
  let newXp = target.xp;
  let newGems = target.gems;
  let newKarma = target.karma;
  let newDebt = target.pinjol_debt;
  let newSeized = target.is_seized;

  const statsRaw = (opts.statsInput || "").trim().toLowerCase();
  if (statsRaw) {
    const lvMatch = statsRaw.match(/(?:lv|level)\s*=?\s*(\d+)/);
    if (lvMatch) {
      newLevel = Math.max(1, Math.min(50, Number(lvMatch[1])));
      newXp = (newLevel - 1) * 100;
    }
    const gemMatch = statsRaw.match(/(?:gem|gems)\s*=?\s*(\d+)/);
    if (gemMatch) {
      newGems = Math.max(0, Number(gemMatch[1]));
    }
    const karmaMatch = statsRaw.match(/(?:karma|baik)\s*=?\s*(\d+)/);
    if (karmaMatch) {
      newKarma = Math.max(0, Math.min(100, Number(karmaMatch[1])));
    }
    if (statsRaw.includes("lunas") || statsRaw.includes("clear") || statsRaw.includes("bebas")) {
      newDebt = 0;
      newSeized = 0;
    }
  }

  const newJobTitle = getRankForLevel(newLevel).title;
  const newBadge =
    newSeized === 1
      ? "LAPAK DISEGEL"
      : newKarma >= 80
        ? "WARUNG JUJUR"
        : newKarma <= 35
          ? "CATATAN MERAH"
          : "WARGA PASAR";
  const bizzes = getUserBusinesses(target.id);
  const nextQuest = computeProgressionQuest(
    { ...target, balance: newBalance, level: newLevel, karma: newKarma, pinjol_debt: newDebt, is_seized: newSeized },
    bizzes
  );

  sqlite
    .query(
      "UPDATE users SET balance = ?, level = ?, xp = ?, gems = ?, karma = ?, pinjol_debt = ?, is_seized = ?, job_title = ?, badge = ?, active_quest = ? WHERE id = ?"
    )
    .run(newBalance, newLevel, newXp, newGems, newKarma, newDebt, newSeized, newJobTitle, newBadge, nextQuest, target.id);

  recordTransaction(target.id, "DEV_INJECT", newBalance - target.balance, `Dev Console override oleh ${opts.callerName}`);

  const updated = getOrCreateUser(target.id, target.username);
  return {
    ok: true,
    message: `🛠️ **Dev Inject Berhasil untuk \`${updated.username}\`!**\n• Kas: **Rp ${updated.balance.toLocaleString("id-ID")}** | Level: **Lv.${updated.level} (${updated.job_title})** | Gems: **${updated.gems} 💎** | Nama Baik: **${updated.karma}/100**`,
    user: updated,
  };
}
