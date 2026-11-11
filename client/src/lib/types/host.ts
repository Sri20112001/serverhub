export interface MemDetail {
  totalMB: number;
  usedMB: number;
  availableMB: number;
  freeMB: number;
  cachedMB: number;
  buffersMB: number;
  usedPct: number;
  swapTotalMB: number;
  swapUsedMB: number;
  swapFreeMB: number;
  swapPct: number;
}

export interface Filesystem {
  device: string;
  mount: string;
  fstype: string;
  // nvme | ssd | hdd, empty when the host cannot report it
  kind?: string;
  totalGB: number;
  usedGB: number;
  freeGB: number;
  usedPct: number;
}

export interface CPUDetail {
  logicalCores: number;
  physicalCores: number;
  model: string;
  mhz: number;
  load1: number;
  load5: number;
  load15: number;
  timesUserPct: number;
  timesSysPct: number;
  timesIdlePct: number;
  timesIowaitPct: number;
}

export interface NetIface {
  name: string;
  rxBytes: number;
  txBytes: number;
  rxErrors: number;
  txErrors: number;
}

export interface DiskIO {
  device: string;
  // nvme | ssd | hdd, empty when the host cannot report it
  kind?: string;
  readMB: number;
  writeMB: number;
  readOps: number;
  writeOps: number;
}

export interface ProcInfo {
  pid: number;
  ppid?: number;
  name: string;
  status: string;
  cpuPercent?: number;
  memMB: number;
  memPct: number;
  username?: string;
}

export interface DetailedProcess extends ProcInfo {
  ppid?: number;
  cmdline?: string;
  exe?: string;
  cwd?: string;
  createTime?: number;
  numThreads?: number;
  isProtected?: boolean;
}

export interface ServerDetail {
  host: {
    hostname: string;
    os: string;
    platform: string;
    platformVersion?: string;
    kernel: string;
    arch: string;
    virtualization?: string;
    uptimeSec: number;
    goVersion: string;
  };
  cpu: CPUDetail;
  memory: MemDetail;
  filesystems: Filesystem[];
  network: NetIface[];
  diskIO: DiskIO[];
  processes: {
    total: number;
    running: number;
    sleeping: number;
    other: number;
    zombie: number;
    top: ProcInfo[];
  };
  pressure: { cpu: string; memory: string; disk: string };
}

export interface AppUsage {
  name: string;
  path: string;
  bytesMB: number;
}

export interface StorageInfo {
  filesystems: Filesystem[];
  appsRoot: string;
  apps: AppUsage[];
  appsPartial: boolean;
  docker: {
    imagesMB: number;
    containersMB: number;
    volumesMB: number;
    buildCacheMB: number;
    imagesTop: { name: string; sizeMB: number }[];
  } | null;
}

export interface ContainerStat {
  id: string;
  name: string;
  image: string;
  state: string;
  cpuPercent: number;
  memMB: number;
  memLimitMB: number;
  memPct: number;
  netRxMB: number;
  netTxMB: number;
  blockReadMB: number;
  blockWriteMB: number;
  pids: number;
}

// Instant host reading from /telemetry/live. Network and disk fields are
// cumulative counters; the client derives rates from consecutive polls.
export interface LiveReading {
  ts: number;
  cpuPercent: number;
  memUsedMB: number;
  memTotalMB: number;
  memPercent: number;
  diskUsedGB: number;
  diskTotalGB: number;
  diskPercent: number;
  netRxBytes: number;
  netTxBytes: number;
  diskReadBytes: number;
  diskWriteBytes: number;
}
