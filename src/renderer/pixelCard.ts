import type { DeveloperTelemetry, LeaderboardEntry, ServerCoopRow } from "../db/index.ts";
import { getCachedOrRenderPng } from "./renderCache.ts";
import { renderDevMonitorV3 } from "./renderDevMonitorV3.ts";
import { renderLeaderboardV3 } from "./renderLeaderboardV3.ts";
import { type AzabV3Input, type PortfolioV3Input, renderAzabV3, renderCoopV3, renderPortfolioV3 } from "./renderPortfolioV3.ts";
import type { SkinId } from "./sprites.ts";

export interface PortfolioRenderInput extends PortfolioV3Input {
  overrideSkin?: SkinId;
}

export function renderPortfolioCard(input: PortfolioRenderInput): Buffer {
  const { user: u, businesses: b, coop: c, overrideSkin } = input;
  const bKey = b.map((x) => `${x.biz_type}:${x.level}:${x.value}:${x.daily_yield}`).join("|");
  const key = `pf:${u.id}:${u.username}:${u.level}:${u.job_title}:${u.badge}:${u.balance}:${u.gems}:${u.karma}:${u.pinjol_debt}:${u.is_seized}:${u.active_quest}:${overrideSkin || u.skin_id}:${c.eco_level}:${bKey}`;
  return getCachedOrRenderPng(key, () => renderPortfolioV3(input));
}

export type AzabRenderInput = AzabV3Input;

export function renderAzabCard(input: AzabRenderInput): Buffer {
  const key = `az:${input.username}:${input.mode}:${input.cashLost}:${input.totalDebt}:${input.karmaAfter}`;
  return getCachedOrRenderPng(key, () => renderAzabV3(input));
}

export function renderCoopCard(coop: ServerCoopRow): Buffer {
  const cJson = coop.contributors_json || JSON.stringify(coop.contributors || []);
  const key = `cp:${coop.guild_id}:${coop.pool_balance}:${coop.eco_level}:${coop.eco_health}:${coop.rescued_count}:${cJson}`;
  return getCachedOrRenderPng(key, () => renderCoopV3(coop));
}

export function renderLeaderboardCard(leaders: LeaderboardEntry[], coop: ServerCoopRow): Buffer {
  const lKey = leaders
    .slice(0, 3)
    .map((l) => `${l.username}:${l.level}:${l.badge}:${l.karma}:${l.netWorth}`)
    .join("|");
  const key = `lb:${coop.eco_level}:${coop.pool_balance}:${coop.rescued_count}:${coop.eco_health}:${lKey}`;
  return getCachedOrRenderPng(key, () => renderLeaderboardV3(leaders, coop));
}

export function renderDevMonitorCard(telemetry: DeveloperTelemetry, wsPingMs = 42): Buffer {
  return renderDevMonitorV3(telemetry, wsPingMs);
}
