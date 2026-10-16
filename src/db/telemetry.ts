import { getCurrentMarketEvent } from "../game/mechanics.ts";
import { stmt } from "./connection.ts";
import { collectHostAndContainerMetrics } from "./hostMetrics.ts";
import type { DeveloperTelemetry } from "./telemetryTypes.ts";
import { getOrCreateServerCoop } from "./users.ts";

export function getDeveloperTelemetry(guildId = "global_kota_mandiri"): DeveloperTelemetry {
  const hw = collectHostAndContainerMetrics();
  const uStats = stmt(
    `SELECT COUNT(*) AS totalUsers, COALESCE(SUM(balance), 0) AS totalCash, COALESCE(SUM(emergency_fund), 0) AS totalEmergency,
     COALESCE(SUM(pinjol_debt), 0) AS totalDebt, COALESCE(SUM(CASE WHEN is_seized = 1 OR pinjol_debt > 0 THEN 1 ELSE 0 END), 0) AS seizedCount,
     COALESCE(ROUND(AVG(karma)), 60) AS avgKarma FROM users`,
  ).get() as {
    totalUsers: number;
    totalCash: number;
    totalEmergency: number;
    totalDebt: number;
    seizedCount: number;
    avgKarma: number;
  };

  const bStats = stmt(
    "SELECT COUNT(*) AS activeBizCount, COALESCE(SUM(value), 0) AS totalBizValue FROM user_businesses WHERE level > 0",
  ).get() as { activeBizCount: number; totalBizValue: number };

  const logCount = stmt("SELECT COUNT(*) AS cnt FROM ledger_logs").get() as { cnt: number };

  const recentLogs = stmt(
    `SELECT l.user_id, COALESCE(u.username, l.user_id) AS username, l.kind, l.amount, l.note, l.created_at
     FROM ledger_logs l LEFT JOIN users u ON l.user_id = u.id ORDER BY l.id DESC LIMIT 6`,
  ).all() as DeveloperTelemetry["recentLogs"];

  const coop = getOrCreateServerCoop(guildId);
  const mkt = getCurrentMarketEvent();
  const marketTitleClean = mkt.event.title
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .toUpperCase();

  return {
    ...hw,
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
