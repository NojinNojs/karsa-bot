import { readFileSync, statfsSync, statSync } from "node:fs";
import { DB_PATH, isTestEnv } from "./connection.ts";

export function collectCgroupAndDiskMetrics(memoryRssMb: number) {
  let containerVcpu = "0,50";
  let containerRamLimitMb = 256;
  let containerRamUsedMb = memoryRssMb;
  try {
    const [q, p] = readFileSync("/sys/fs/cgroup/cpu.max", "utf-8").trim().split(/\s+/);
    if (q && q !== "max" && p && Number(p) > 0) containerVcpu = (Number(q) / Number(p)).toFixed(2).replace(".", ",");
  } catch {}
  try {
    const mMax = readFileSync("/sys/fs/cgroup/memory.max", "utf-8").trim();
    if (mMax && mMax !== "max" && Number(mMax) < 64 * 1024 ** 3) containerRamLimitMb = Math.max(32, Math.round(Number(mMax) / 1048576));
    const mCur = Number(readFileSync("/sys/fs/cgroup/memory.current", "utf-8").trim());
    if (mCur > 0 && mCur <= containerRamLimitMb * 2 * 1048576) containerRamUsedMb = Math.max(memoryRssMb, Math.round(mCur / 1048576));
  } catch {}
  const containerRamPct = Math.min(100, Math.max(1, Math.round((containerRamUsedMb / Math.max(1, containerRamLimitMb)) * 100)));

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
  } catch {}

  let dbSizeKb = "IN-MEM";
  try {
    if (!isTestEnv) {
      const st = statSync(DB_PATH);
      dbSizeKb = st.size >= 1048576 ? `${(st.size / 1048576).toFixed(2)} MB` : `${Math.round(st.size / 1024)} KB`;
    }
  } catch {}

  return {
    containerVcpu,
    containerRamUsedMb,
    containerRamLimitMb,
    containerRamPct,
    diskUsedGb,
    diskTotalGb,
    diskFreeGb,
    diskPct,
    dbSizeKb,
  };
}
