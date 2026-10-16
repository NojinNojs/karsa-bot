import type { SkinId } from "../renderer/sprites.ts";

export const BOT_STARTED_AT = Date.now();
export const WORK_COOLDOWN_MS = 30 * 1000;
export const PASSIVE_COOLDOWN_MS = 5 * 60 * 1000;
export const DAILY_COOLDOWN_MS = 20 * 60 * 60 * 1000;
export const DAILY_STREAK_RESET_MS = 48 * 60 * 60 * 1000;
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
