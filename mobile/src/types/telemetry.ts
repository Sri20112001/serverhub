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
  // nvme | ssd | hdd, empty when host cannot report
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
  diskReadMB: number;
  diskWriteMB: number;
  rxSpeedBps?: number;
  txSpeedBps?: number;
  readSpeedBps?: number;
  writeSpeedBps?: number;
}

export interface StorageInfo {
  filesystems: Filesystem[];
  appsRoot: string;
  apps: { name: string; path: string; bytesMB: number }[];
  appsPartial: boolean;
  docker: {
    imagesMB: number;
    containersMB: number;
    volumesMB: number;
    buildCacheMB: number;
    imagesTop: { name: string; sizeMB: number }[];
  } | null;
}

export interface ThresholdAlert {
  metric: "cpu" | "mem" | "disk";
  severity: "warning" | "critical";
  value: number;
  threshold: number;
  label: string;
}
