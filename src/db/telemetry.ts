import { readFileSync, statfsSync, statSync } from "node:fs";
import os from "node:os";
import { getCurrentMarketEvent, getRankForLevel } from "../game/mechanics.ts";
import { DB_PATH, isTestEnv, recordTransaction, sqlite } from "./connection.ts";
import { BOT_STARTED_AT, type DeveloperTelemetry, type UserRow } from "./types.ts";
import {
  computeProgressionQuest,
  getOrCreateServerCoop,
  getOrCreateUser,
  getUserBusinesses,
  registerNewUser,
} from "./users.ts";

export function getDeveloperTelemetry(guildId = "global_kota_mandiri"): DeveloperTelemetry {
  const uptimeSec = Math.max(1, Math.floor((Date.now() - BOT_STARTED_AT) / 1000));
  const hours = Math.floor(uptimeSec / 3600);
  const mins = Math.floor((uptimeSec % 3600) / 60);
  const secs = uptimeSec % 60;
  const uptimeShort = hours > 0 ? `${hours}J ${mins}M` : mins > 0 ? `${mins}M ${secs}D` : `${secs}D`;

  const hostUpSec = Math.max(1, Math.floor(os.uptime()));
  const hHours = Math.floor(hostUpSec / 3600);
  const hMins = Math.floor((hostUpSec % 3600) / 60);
  const hostUptimeShort = hHours > 0 ? `${hHours}j ${hMins}m` : `${hMins}m`;

  const mem = process.memoryUsage();
  const memoryRssMb = Math.round(mem.rss / (1024 * 1024));
  const memoryHeapMb = Math.round(mem.heapUsed / (1024 * 1024));

  // Host CPU & RAM specs
  const cpus = os.cpus();
  const cpuCores = Math.max(1, cpus.length);
  const rawCpuModel = (cpus[0]?.model || "Generic Virtual CPU")
    .replace(/\(R\)|\(TM\)|CPU|Processor|@-.*$/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const cpuSpeedMhz = cpus[0]?.speed || 0;
  const cpuModelShort = rawCpuModel
    .toUpperCase()
    .replace(/AMD |INTEL |CORE |PRO |W\/.*$/g, "")
    .trim()
    .slice(0, 16);
  const load1 = os.loadavg()[0] || 0;
  const cpuLoad1m = load1.toFixed(2);
  const cpuLoadPct = Math.min(100, Math.max(1, Math.round((load1 / cpuCores) * 100)));

  const totalMemBytes = os.totalmem();
  const freeMemBytes = os.freemem();
  const usedMemBytes = Math.max(0, totalMemBytes - freeMemBytes);
  const ramTotalGb = (totalMemBytes / 1024 ** 3).toFixed(1).replace(".", ",");
  const ramUsedGb = (usedMemBytes / 1024 ** 3).toFixed(1).replace(".", ",");
  const ramFreeGb = (freeMemBytes / 1024 ** 3).toFixed(1).replace(".", ",");
  const ramPct = Math.min(100, Math.max(1, Math.round((usedMemBytes / totalMemBytes) * 100)));

  // Docker Container Cgroup v2 Quota & Live Usage (/sys/fs/cgroup)
  let containerVcpu = "0,50";
  let containerRamLimitMb = 256;
  let containerRamUsedMb = memoryRssMb;
  try {
    const cpuMaxRaw = readFileSync("/sys/fs/cgroup/cpu.max", "utf-8").trim();
    const [quotaStr, periodStr] = cpuMaxRaw.split(/\s+/);
    if (quotaStr && quotaStr !== "max" && periodStr) {
      const q = Number(quotaStr);
      const p = Number(periodStr);
      if (Number.isFinite(q) && Number.isFinite(p) && p > 0) {
        containerVcpu = (q / p).toFixed(2).replace(".", ",");
      }
    }
  } catch {
    // Fallback to configured 0,50 vCPU
  }
  try {
    const memMaxRaw = readFileSync("/sys/fs/cgroup/memory.max", "utf-8").trim();
    if (memMaxRaw && memMaxRaw !== "max") {
      const limBytes = Number(memMaxRaw);
      if (Number.isFinite(limBytes) && limBytes > 0 && limBytes < 64 * 1024 ** 3) {
        containerRamLimitMb = Math.max(32, Math.round(limBytes / (1024 * 1024)));
      }
    }
    const memCurRaw = readFileSync("/sys/fs/cgroup/memory.current", "utf-8").trim();
    const curBytes = Number(memCurRaw);
    if (Number.isFinite(curBytes) && curBytes > 0 && curBytes <= containerRamLimitMb * 2 * 1024 * 1024) {
      containerRamUsedMb = Math.max(memoryRssMb, Math.round(curBytes / (1024 * 1024)));
    }
  } catch {
    // Fallback to process RSS vs 256MB limit
  }
  const containerRamPct = Math.min(
    100,
    Math.max(1, Math.round((containerRamUsedMb / Math.max(1, containerRamLimitMb)) * 100)),
  );

  // Disk & SQLite DB File specs
  let diskUsedGb = "0,0";
  let diskTotalGb = "0,0";
  let diskFreeGb = "0,0";
  let diskPct = 0;
  try {
    const sfs = statfsSync(process.cwd());
    const totalDisk = sfs.bsize * sfs.blocks;
    const freeDisk = sfs.bsize * sfs.bavail;
    const usedDisk = Math.max(0, totalDisk - freeDisk);
    diskTotalGb = (totalDisk / 1024 ** 3).toFixed(0);
    diskUsedGb = (usedDisk / 1024 ** 3).toFixed(0);
    diskFreeGb = (freeDisk / 1024 ** 3).toFixed(1).replace(".", ",");
    diskPct = totalDisk > 0 ? Math.min(100, Math.round((usedDisk / totalDisk) * 100)) : 0;
  } catch {
    // Fallback if statfs unavailable
  }

  let dbSizeKb = "0 KB";
  try {
    if (!isTestEnv) {
      const st = statSync(DB_PATH);
      dbSizeKb =
        st.size >= 1024 * 1024
          ? `${(st.size / (1024 * 1024)).toFixed(2)} MB`
          : `${Math.round(st.size / 1024)} KB`;
    } else {
      dbSizeKb = "IN-MEM";
    }
  } catch {
    dbSizeKb = "0 KB";
  }

  const uStats = sqlite
    .query(
      `SELECT
         COUNT(*) AS totalUsers,
         COALESCE(SUM(balance), 0) AS totalCash,
         COALESCE(SUM(emergency_fund), 0) AS totalEmergency,
         COALESCE(SUM(pinjol_debt), 0) AS totalDebt,
         COALESCE(SUM(CASE WHEN is_seized = 1 OR pinjol_debt > 0 THEN 1 ELSE 0 END), 0) AS seizedCount,
         COALESCE(ROUND(AVG(karma)), 60) AS avgKarma
       FROM users`,
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
       WHERE level > 0`,
    )
    .get() as { activeBizCount: number; totalBizValue: number };

  const logCount = sqlite.query("SELECT COUNT(*) AS cnt FROM ledger_logs").get() as { cnt: number };

  const recentLogs = sqlite
    .query(
      `SELECT l.user_id, COALESCE(u.username, l.user_id) AS username, l.kind, l.amount, l.note, l.created_at
       FROM ledger_logs l
       LEFT JOIN users u ON l.user_id = u.id
       ORDER BY l.id DESC
       LIMIT 6`,
    )
    .all() as Array<{
    user_id: string;
    username: string;
    kind: string;
    amount: number;
    note: string;
    created_at: number;
  }>;

  const coop = getOrCreateServerCoop(guildId);
  const mkt = getCurrentMarketEvent();
  const marketTitleClean = mkt.event.title
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .toUpperCase();

  return {
    uptimeSec,
    uptimeShort,
    hostUptimeShort,
    memoryRssMb,
    memoryHeapMb,
    bunVersion: typeof Bun !== "undefined" ? Bun.version : "1.x",
    osPlatform: `${os.type()} ${os.release()}`,
    osRelease: os.release(),
    osArch: os.arch(),
    hostname: os.hostname(),
    cpuModel: rawCpuModel,
    cpuModelShort,
    cpuCores,
    cpuSpeedMhz,
    cpuLoad1m,
    cpuLoadPct,
    ramUsedGb,
    ramTotalGb,
    ramFreeGb,
    ramPct,
    containerVcpu,
    containerRamUsedMb,
    containerRamLimitMb,
    containerRamPct,
    diskUsedGb,
    diskTotalGb,
    diskFreeGb,
    diskPct,
    dbSizeKb,
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
    sqlite
      .query("UPDATE users SET last_work_at = 0, last_passive_at = 0, last_daily_at = 0 WHERE id = ?")
      .run(userId);
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
      "UPDATE users SET level = 2, job_title = 'BARISTA PASAR', balance = 0, pinjol_debt = 1500000, is_seized = 1, karma = 45, badge = 'LAPAK DISEGEL', active_quest = 'Seduh kopi lalu klik Bayar Segel di bawah' WHERE id = ?",
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
    {
      ...target,
      balance: newBalance,
      level: newLevel,
      karma: newKarma,
      pinjol_debt: newDebt,
      is_seized: newSeized,
    },
    bizzes,
  );

  sqlite
    .query(
      "UPDATE users SET balance = ?, level = ?, xp = ?, gems = ?, karma = ?, pinjol_debt = ?, is_seized = ?, job_title = ?, badge = ?, active_quest = ? WHERE id = ?",
    )
    .run(
      newBalance,
      newLevel,
      newXp,
      newGems,
      newKarma,
      newDebt,
      newSeized,
      newJobTitle,
      newBadge,
      nextQuest,
      target.id,
    );

  recordTransaction(
    target.id,
    "DEV_INJECT",
    newBalance - target.balance,
    `Dev Console override oleh ${opts.callerName}`,
  );

  const updated = getOrCreateUser(target.id, target.username);
  return {
    ok: true,
    message: `🛠️ **Dev Inject Berhasil untuk \`${updated.username}\`!**\n• Kas: **Rp ${updated.balance.toLocaleString("id-ID")}** | Level: **Lv.${updated.level} (${updated.job_title})** | Gems: **${updated.gems} 💎** | Nama Baik: **${updated.karma}/100**`,
    user: updated,
  };
}
