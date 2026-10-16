import os from "node:os";
import { collectCgroupAndDiskMetrics } from "./cgroupMetrics.ts";
import { BOT_STARTED_AT } from "./types.ts";

export function collectHostAndContainerMetrics() {
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
  const memoryRssMb = Math.round(mem.rss / 1048576);
  const memoryHeapMb = Math.round(mem.heapUsed / 1048576);

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
  const cgroup = collectCgroupAndDiskMetrics(memoryRssMb);

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
    ...cgroup,
  };
}
