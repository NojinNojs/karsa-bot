import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { BUSINESS_CATALOG, WORK_DILEMMAS } from "../game/mechanics.ts";
import { SKIN_PALETTES, type SkinId } from "../renderer/sprites.ts";

const DB_PATH = resolve(process.cwd(), "data/kota_mandiri.sqlite");
mkdirSync(dirname(DB_PATH), { recursive: true });

export const sqlite = new Database(DB_PATH, { create: true });
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA synchronous = NORMAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

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
  coop_shares: number;
  skin_id: SkinId;
  owned_skins: string;
  active_quest: string;
  last_work_at: number;
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
      badge TEXT NOT NULL DEFAULT 'WARUNG JUJUR',
      level INTEGER NOT NULL DEFAULT 1,
      xp INTEGER NOT NULL DEFAULT 0,
      balance INTEGER NOT NULL DEFAULT 12500000,
      emergency_fund INTEGER NOT NULL DEFAULT 5000000,
      gems INTEGER NOT NULL DEFAULT 3,
      karma INTEGER NOT NULL DEFAULT 85,
      pinjol_debt INTEGER NOT NULL DEFAULT 0,
      pinjol_strikes INTEGER NOT NULL DEFAULT 0,
      coop_shares INTEGER NOT NULL DEFAULT 0,
      skin_id TEXT NOT NULL DEFAULT 'retro_gold',
      owned_skins TEXT NOT NULL DEFAULT '["retro_gold"]',
      active_quest TEXT NOT NULL DEFAULT 'Patungan gerobak ke-2 di /koperasi',
      last_work_at INTEGER NOT NULL DEFAULT 0,
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
      pool_balance INTEGER NOT NULL DEFAULT 25000000,
      eco_level INTEGER NOT NULL DEFAULT 4,
      eco_health INTEGER NOT NULL DEFAULT 90,
      rescued_count INTEGER NOT NULL DEFAULT 0
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
}

initDatabase();

export function recordTransaction(userId: string, kind: string, amount: number, note: string): void {
  sqlite
    .query("INSERT INTO ledger_logs (user_id, kind, amount, note, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(userId, kind, amount, note, Date.now());
}

export function getOrCreateUser(userId: string, username: string): UserRow {
  const existing = sqlite.query("SELECT * FROM users WHERE id = ?").get(userId) as UserRow | null;
  if (existing) {
    if (existing.username !== username && username) {
      sqlite.query("UPDATE users SET username = ? WHERE id = ?").run(username, userId);
      existing.username = username;
    }
    return existing;
  }

  const tx = sqlite.transaction(() => {
    const now = Date.now();
    sqlite
      .query(
        `INSERT INTO users (id, username, job_title, badge, level, xp, balance, emergency_fund, gems, karma, skin_id, owned_skins, active_quest, created_at)
         VALUES (?, ?, 'PERACIK KOPI', 'WARUNG JUJUR', 12, 1200, 48250000, 55000000, 3, 90, 'retro_gold', '["retro_gold"]', 'Patungan gerobak ke-2 di /koperasi', ?)`
      )
      .run(userId, username || "WARGA", now);

    const starterBiz: Array<[string, string, number, number, number]> = [
      ["kedai_kopi", "Kedai Kopi Karsa", 4, 64_500_000, 1_800_000],
      ["brankas_darurat", "Tabungan Emas", 3, 55_000_000, 950_000],
      ["saham_koperasi", "Koperasi Warga", 3, 27_000_000, 1_200_000],
    ];
    for (const [btype, bname, lvl, val, yld] of starterBiz) {
      sqlite
        .query(
          `INSERT OR IGNORE INTO user_businesses (user_id, biz_type, name, level, value, daily_yield, ethical_mode)
           VALUES (?, ?, ?, ?, ?, ?, 1)`
        )
        .run(userId, btype, bname, lvl, val, yld);
    }

    recordTransaction(userId, "STARTER", 48_250_000, "Buka lapak pertama Kedai Kopi Karsa");
  });
  tx.immediate();

  return sqlite.query("SELECT * FROM users WHERE id = ?").get(userId) as UserRow;
}

export function getUserBusinesses(userId: string): UserBusinessRow[] {
  return sqlite
    .query("SELECT * FROM user_businesses WHERE user_id = ? ORDER BY id ASC")
    .all(userId) as UserBusinessRow[];
}

export function getOrCreateServerCoop(guildId = "global_kota_mandiri"): ServerCoopRow {
  const row = sqlite.query("SELECT * FROM server_coop WHERE guild_id = ?").get(guildId) as ServerCoopRow | null;
  if (row) return row;
  sqlite
    .query("INSERT INTO server_coop (guild_id, pool_balance, eco_level, eco_health, rescued_count) VALUES (?, 85000000, 4, 92, 5)")
    .run(guildId);
  return sqlite.query("SELECT * FROM server_coop WHERE guild_id = ?").get(guildId) as ServerCoopRow;
}

export function workShift(userId: string, username: string, choice: "ethical" | "corrupt", dilemmaIdx?: number) {
  const user = getOrCreateUser(userId, username);
  const dilemma = WORK_DILEMMAS[(dilemmaIdx ?? Math.floor(Math.random() * WORK_DILEMMAS.length)) % WORK_DILEMMAS.length]!;

  let deltaRp = 0;
  let karmaDelta = 0;
  let xpDelta = 0;
  let busted = false;
  let message = "";

  const tx = sqlite.transaction(() => {
    if (choice === "ethical") {
      const c = dilemma.ethicalChoice;
      const karmaBonus = user.karma >= 80 ? Math.round(c.rewardRp * 0.15) : 0;
      deltaRp = c.rewardRp + karmaBonus;
      karmaDelta = c.karmaDelta;
      xpDelta = c.xpDelta;
      message = `${c.outcomeText}${karmaBonus > 0 ? ` (+Bonus Pelanggan Setia Rp${(karmaBonus / 1000).toLocaleString("id-ID")}K)` : ""}`;
    } else {
      const c = dilemma.corruptChoice;
      karmaDelta = c.karmaDelta;
      xpDelta = c.xpDelta;
      if (Math.random() < c.auditChance) {
        busted = true;
        deltaRp = -c.fineRp;
        message = c.bustedText;
      } else {
        deltaRp = c.rewardRp;
        message = c.successText;
      }
    }

    const newBalance = Math.max(0, user.balance + deltaRp);
    const newKarma = Math.max(0, Math.min(100, user.karma + karmaDelta));
    const newXp = user.xp + xpDelta;
    const newLevel = Math.max(user.level, Math.floor(newXp / 100) + 1);
    const newBadge = newKarma >= 80 ? "WARUNG JUJUR" : newKarma <= 35 ? "CATATAN MERAH" : "PEDAGANG PASAR";

    sqlite
      .query("UPDATE users SET balance = ?, karma = ?, xp = ?, level = ?, badge = ?, last_work_at = ? WHERE id = ?")
      .run(newBalance, newKarma, newXp, newLevel, newBadge, Date.now(), userId);

    recordTransaction(userId, choice === "ethical" ? "WORK_ETHICAL" : "WORK_CORRUPT", deltaRp, `${dilemma.title}: ${message}`);
  });
  tx.immediate();

  return {
    user: getOrCreateUser(userId, username),
    dilemma,
    deltaRp,
    karmaDelta,
    busted,
    message,
  };
}

export function buyOrUpgradeBusiness(userId: string, username: string, bizType: "kedai_kopi" | "brankas_darurat" | "saham_koperasi") {
  const user = getOrCreateUser(userId, username);
  const cat = BUSINESS_CATALOG[bizType]!;
  const existing = sqlite
    .query("SELECT * FROM user_businesses WHERE user_id = ? AND biz_type = ?")
    .get(userId, bizType) as UserBusinessRow | null;

  const nextLevel = (existing?.level ?? 0) + 1;
  const upgradeCost = Math.round(cat.baseCost * Math.pow(1.25, nextLevel - 1));
  const yieldBoost = Math.round(cat.baseYield * 0.35);

  if (user.balance < upgradeCost) {
    return {
      ok: false,
      reason: `Kas belum cukup! Butuh **Rp${(upgradeCost / 1_000_000).toFixed(1)} Juta**, kas kamu **Rp${(user.balance / 1_000_000).toFixed(1)} Juta**.`,
      user,
    };
  }

  const tx = sqlite.transaction(() => {
    sqlite.query("UPDATE users SET balance = balance - ?, karma = MIN(100, karma + 3) WHERE id = ?").run(upgradeCost, userId);
    if (existing) {
      sqlite
        .query("UPDATE user_businesses SET level = ?, name = ?, value = value + ?, daily_yield = daily_yield + ? WHERE id = ?")
        .run(nextLevel, cat.name, upgradeCost, yieldBoost, existing.id);
    } else {
      sqlite
        .query("INSERT INTO user_businesses (user_id, biz_type, name, level, value, daily_yield, ethical_mode) VALUES (?, ?, ?, 1, ?, ?, 1)")
        .run(userId, bizType, cat.name, upgradeCost, cat.baseYield);
    }
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

export function claimPassiveIncome(userId: string, username: string) {
  const user = getOrCreateUser(userId, username);
  const bizzes = getUserBusinesses(userId);
  const gross = bizzes.reduce((acc, b) => acc + b.daily_yield, 0);
  const taxRate = user.karma >= 80 ? 0.05 : 0.2;
  const net = Math.round(gross * (1 - taxRate));

  const tx = sqlite.transaction(() => {
    sqlite.query("UPDATE users SET balance = balance + ?, last_daily_at = ? WHERE id = ?").run(net, Date.now(), userId);
    recordTransaction(userId, "PASSIVE_CLAIM", net, `Setoran usaha harian (Potongan sewa ${Math.round(taxRate * 100)}%)`);
  });
  tx.immediate();

  return {
    gross,
    net,
    taxSaved: user.karma >= 80,
    user: getOrCreateUser(userId, username),
  };
}

export function takeShortcutGambleOrPinjol(userId: string, username: string, mode: "pinjol" | "slot", guildId = "global_kota_mandiri") {
  const user = getOrCreateUser(userId, username);

  let cashLost = 0;
  let newDebtAdded = 0;
  let assetSeizedName = "Mesin Kopi Kedai";
  let assetSeizedValue = 18_000_000;
  let narrative = "";

  const tx = sqlite.transaction(() => {
    if (mode === "pinjol") {
      const loanPrincipal = 15_000_000;
      const illegalFeeAndInterest = 28_500_000;
      newDebtAdded = loanPrincipal + illegalFeeAndInterest;
      cashLost = Math.min(user.balance, 18_000_000);
      assetSeizedName = "Mesin Kopi Kedai";
      assetSeizedValue = 18_000_000;
      narrative =
        "Dana talangan kilat jatuh tempo! Bunga berbunga 8%/hari menguras laci kas dan penagih menyegel mesin kopi warungmu.";
    } else {
      cashLost = Math.max(5_000_000, Math.round(user.balance * 0.65));
      newDebtAdded = 19_500_000;
      assetSeizedName = "Gerobak & Stok Biji";
      assetSeizedValue = cashLost;
      narrative =
        "Modal belanja bahan baku habis di meja putaran malam! Warung gagal buka pagi ini dan gerobak disita penagih.";
    }

    const updatedBalance = Math.max(500_000, user.balance - cashLost);
    const updatedKarma = Math.max(10, user.karma - 35);
    const updatedDebt = user.pinjol_debt + newDebtAdded;

    sqlite
      .query(
        "UPDATE users SET balance = ?, karma = ?, pinjol_debt = ?, pinjol_strikes = pinjol_strikes + 1, badge = 'WARUNG DISEGEL' WHERE id = ?"
      )
      .run(updatedBalance, updatedKarma, updatedDebt, userId);

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

export function investOrRescueCoop(userId: string, username: string, action: "patungan" | "rescue", guildId = "global_kota_mandiri") {
  const user = getOrCreateUser(userId, username);
  const coop = getOrCreateServerCoop(guildId);
  const amount = action === "patungan" ? 5_000_000 : 10_000_000;

  if (user.balance < amount) {
    return {
      ok: false,
      message: `Kas belum cukup (Butuh Rp${(amount / 1_000_000).toFixed(0)} Juta).`,
      user,
      coop,
    };
  }

  const tx = sqlite.transaction(() => {
    if (action === "patungan") {
      sqlite
        .query("UPDATE users SET balance = balance - ?, coop_shares = coop_shares + ?, karma = MIN(100, karma + 8) WHERE id = ?")
        .run(amount, amount, userId);
      sqlite
        .query("UPDATE server_coop SET pool_balance = pool_balance + ?, eco_health = MIN(100, eco_health + 3) WHERE guild_id = ?")
        .run(amount, guildId);
      sqlite
        .query("UPDATE user_businesses SET value = value + ?, daily_yield = daily_yield + 450000 WHERE user_id = ? AND biz_type = 'saham_koperasi'")
        .run(amount, userId);
      recordTransaction(userId, "COOP_INVEST", -amount, "Iuran Koperasi Warga");
    } else {
      const debtCleared = Math.max(15_000_000, user.pinjol_debt);
      sqlite
        .query(
          "UPDATE users SET balance = balance - ?, pinjol_debt = 0, karma = MIN(100, karma + 20), gems = gems + 1, badge = 'WARUNG JUJUR', active_quest = 'Gerobak warga berhasil ditebus! (+1 Gem)' WHERE id = ?"
        )
        .run(amount, userId);
      sqlite
        .query(
          "UPDATE server_coop SET pool_balance = pool_balance + ?, rescued_count = rescued_count + 1, eco_health = MIN(100, eco_health + 6) WHERE guild_id = ?"
        )
        .run(amount, guildId);
      recordTransaction(userId, "COOP_RESCUE", -amount, `Tebus gerobak warga senilai Rp${(debtCleared / 1_000_000).toFixed(1)} Juta`);
    }
  });
  tx.immediate();

  return {
    ok: true,
    amount,
    user: getOrCreateUser(userId, username),
    coop: getOrCreateServerCoop(guildId),
  };
}

export function equipOrBuySkin(userId: string, username: string, skinId: SkinId) {
  const user = getOrCreateUser(userId, username);
  const skin = SKIN_PALETTES[skinId];
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

  if (user.balance < skin.priceRp) {
    return {
      ok: false,
      bought: false,
      message: `Kas belum cukup untuk membeli **${skin.name}** (Harga: Rp${(skin.priceRp / 1_000_000).toFixed(0)} Juta, Kas: Rp${(user.balance / 1_000_000).toFixed(1)} Juta).`,
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

const DAILY_COOLDOWN_MS = 20 * 60 * 60 * 1000;

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
      message: `Sabar dulu, Juragan! Suntikan modal harian koperasi baru bisa diklaim lagi dalam **${cooldownText}** (Streak Hari ke-${currentStreak}).`,
      user,
    };
  }

  const streak = prevClaims + 1;
  const streakBonus = Math.min(streak, 7) * 350_000;
  const karmaBonusRp = user.karma >= 80 ? 500_000 : 0;
  const rewardRp = 2_500_000 + streakBonus + karmaBonusRp;
  const karmaBonus = 2;

  const tx = sqlite.transaction(() => {
    sqlite
      .query("UPDATE users SET balance = balance + ?, karma = MIN(100, karma + ?), last_daily_at = ? WHERE id = ?")
      .run(rewardRp, karmaBonus, now, userId);
    recordTransaction(
      userId,
      "DAILY_MODAL",
      rewardRp,
      `Modal Harian Koperasi (Hari ke-${streak}${karmaBonusRp > 0 ? " + Bonus Warung Jujur" : ""})`
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
    message: `Modal Harian Koperasi cair **Rp${(rewardRp / 1_000_000).toFixed(2)} Juta**! (Streak Hari ke-${streak}${karmaBonusRp > 0 ? " + Bonus Karma Jujur Rp500K" : ""}, +${karmaBonus} Karma)`,
    user: updatedUser,
  };
}

const FALLBACK_NPC_MERCHANTS: Array<Omit<LeaderboardEntry, "rank">> = [
  {
    userId: "npc_raka_roastery",
    username: "RAKA ROASTERY",
    badge: "WARUNG JUJUR",
    level: 11,
    karma: 94,
    balance: 43_500_000,
    businessValue: 125_000_000,
    netWorth: 168_500_000,
  },
  {
    userId: "npc_bu_dina",
    username: "BU DINA",
    badge: "WARUNG JUJUR",
    level: 10,
    karma: 90,
    balance: 34_000_000,
    businessValue: 108_000_000,
    netWorth: 142_000_000,
  },
  {
    userId: "npc_pak_hendra",
    username: "PAK HENDRA",
    badge: "PEDAGANG PASAR",
    level: 8,
    karma: 78,
    balance: 26_500_000,
    businessValue: 92_000_000,
    netWorth: 118_500_000,
  },
];

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
         (u.balance + COALESCE(SUM(b.value), 0)) AS netWorth
       FROM users u
       LEFT JOIN user_businesses b ON u.id = b.user_id
       GROUP BY u.id
       ORDER BY (u.balance + COALESCE(SUM(b.value), 0)) DESC, u.karma DESC
       LIMIT ?`
    )
    .all(safeLimit) as Array<Omit<LeaderboardEntry, "rank">>;

  const combined: Array<Omit<LeaderboardEntry, "rank">> = [...rows];
  if (combined.length < 3) {
    for (const npc of FALLBACK_NPC_MERCHANTS) {
      if (combined.length >= Math.max(3, safeLimit)) break;
      if (!combined.some((entry) => entry.userId === npc.userId)) {
        combined.push({ ...npc });
      }
    }
    combined.sort((a, b) => b.netWorth - a.netWorth || b.karma - a.karma);
  }

  return combined.slice(0, Math.max(safeLimit, Math.min(3, combined.length))).map((entry, idx) => ({
    rank: idx + 1,
    ...entry,
  }));
}
