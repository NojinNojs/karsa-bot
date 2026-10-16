export interface FeedbackRow {
  id: number;
  user_id: string;
  username: string;
  category: string;
  message: string;
  created_at: number;
}

export interface DeveloperTelemetry {
  uptimeSec: number;
  uptimeShort: string;
  hostUptimeShort: string;
  memoryRssMb: number;
  memoryHeapMb: number;
  bunVersion: string;
  osPlatform: string;
  osRelease: string;
  osArch: string;
  hostname: string;
  cpuModel: string;
  cpuModelShort: string;
  cpuCores: number;
  cpuSpeedMhz: number;
  cpuLoad1m: string;
  cpuLoadPct: number;
  ramUsedGb: string;
  ramTotalGb: string;
  ramFreeGb: string;
  ramPct: number;
  containerVcpu: string;
  containerRamUsedMb: number;
  containerRamLimitMb: number;
  containerRamPct: number;
  diskUsedGb: string;
  diskTotalGb: string;
  diskFreeGb: string;
  diskPct: number;
  dbSizeKb: string;
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
  recentLogs: Array<{
    user_id: string;
    username: string;
    kind: string;
    amount: number;
    note: string;
    created_at: number;
  }>;
}
