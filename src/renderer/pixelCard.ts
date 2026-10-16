import {
  renderAzabV3,
  renderCoopV3,
  renderPortfolioV3,
  type AzabV3Input,
  type PortfolioV3Input,
} from "./renderPortfolioV3.ts";
import { renderLeaderboardV3 } from "./renderLeaderboardV3.ts";
import { renderDevMonitorV3 } from "./renderDevMonitorV3.ts";
import type { DeveloperTelemetry, LeaderboardEntry, ServerCoopRow } from "../db/index.ts";
import type { SkinId } from "./sprites.ts";

export interface PortfolioRenderInput extends PortfolioV3Input {
  overrideSkin?: SkinId;
}

export function renderPortfolioCard(input: PortfolioRenderInput): Buffer {
  return renderPortfolioV3(input);
}

export type AzabRenderInput = AzabV3Input;

export function renderAzabCard(input: AzabRenderInput): Buffer {
  return renderAzabV3(input);
}

export function renderCoopCard(coop: ServerCoopRow): Buffer {
  return renderCoopV3(coop);
}

export function renderLeaderboardCard(leaders: LeaderboardEntry[], coop: ServerCoopRow): Buffer {
  return renderLeaderboardV3(leaders, coop);
}

export function renderDevMonitorCard(telemetry: DeveloperTelemetry, wsPingMs = 42): Buffer {
  return renderDevMonitorV3(telemetry, wsPingMs);
}
