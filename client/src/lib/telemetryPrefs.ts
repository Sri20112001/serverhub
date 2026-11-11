// Telemetry and live polling preferences stored in localStorage.
// Shared between Settings (Host System tab) and the Telemetry page.

export const TELEMETRY_PREFS_KEY = "serverhub.telemetry_prefs";
export const TELEMETRY_PREFS_EVENT = "serverhub:telemetry_prefs_changed";

export interface ThresholdAlertState {
  metric: "cpu" | "memory" | "disk";
  label: string;
  level: "WARNING" | "CRITICAL";
  value: number;
  threshold: number;
  triggeredAt: number;
}

export interface TelemetryPrefs {
  // Live polling cadence in milliseconds: 1000, 2000, 3000, 5000, 10000, 30000
  pollIntervalMs: number;
  // Card visual size: "comfortable" (expanded, larger cards) or "compact"
  cardSize: "comfortable" | "compact";
  // Individual telemetry cards/metrics to poll & display
  showCpu: boolean;
  showMemory: boolean;
  showDisk: boolean;
  showNetwork: boolean;
  showIo: boolean;
  // Auto-pause polling when tab is hidden / in background
  pauseOnBlur: boolean;

  // Host Threshold Alerting Engine
  alertsEnabled: boolean;
  cpuThresholdWarning: number;
  cpuThresholdCritical: number;
  memThresholdWarning: number;
  memThresholdCritical: number;
  diskThresholdWarning: number;
  diskThresholdCritical: number;
  browserNotifications: boolean;
}

export const TELEMETRY_INTERVAL_OPTIONS: { value: number; label: string; desc: string }[] = [
  { value: 1000, label: "1s", desc: "1s · High frequency (realtime stream)" },
  { value: 2000, label: "2s", desc: "2s · Fast telemetry" },
  { value: 3000, label: "3s", desc: "3s · Recommended default" },
  { value: 5000, label: "5s", desc: "5s · Balanced updates" },
  { value: 10000, label: "10s", desc: "10s · Relaxed (low CPU/bandwidth)" },
  { value: 30000, label: "30s", desc: "30s · Server heartbeat cadence" },
];

export const DEFAULT_TELEMETRY_PREFS: TelemetryPrefs = {
  pollIntervalMs: 3000,
  cardSize: "comfortable",
  showCpu: true,
  showMemory: true,
  showDisk: true,
  showNetwork: true,
  showIo: true,
  pauseOnBlur: true,

  alertsEnabled: true,
  cpuThresholdWarning: 80,
  cpuThresholdCritical: 90,
  memThresholdWarning: 85,
  memThresholdCritical: 95,
  diskThresholdWarning: 85,
  diskThresholdCritical: 95,
  browserNotifications: false,
};

export function loadTelemetryPrefs(): TelemetryPrefs {
  try {
    const raw = localStorage.getItem(TELEMETRY_PREFS_KEY);
    if (raw) {
      return { ...DEFAULT_TELEMETRY_PREFS, ...JSON.parse(raw) };
    }
  } catch {
    /* fallback to default */
  }
  return { ...DEFAULT_TELEMETRY_PREFS };
}

export function saveTelemetryPrefs(prefs: TelemetryPrefs): void {
  try {
    localStorage.setItem(TELEMETRY_PREFS_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent(TELEMETRY_PREFS_EVENT, { detail: prefs }));
  } catch {
    /* ignore storage errors */
  }
}

// Rate-limiting timestamp cache to avoid spamming OS notifications
const notifiedTimestamps: Record<string, number> = {};

export function evaluateThresholdAlerts(
  readings: { cpu: number; memPct: number; diskPct: number },
  prefs: TelemetryPrefs
): ThresholdAlertState[] {
  if (!prefs.alertsEnabled) return [];

  const alerts: ThresholdAlertState[] = [];
  const now = Date.now();

  const check = (
    metric: "cpu" | "memory" | "disk",
    label: string,
    value: number,
    warn: number,
    crit: number
  ) => {
    if (value >= crit) {
      alerts.push({
        metric,
        label,
        level: "CRITICAL",
        value,
        threshold: crit,
        triggeredAt: now,
      });
    } else if (value >= warn) {
      alerts.push({
        metric,
        label,
        level: "WARNING",
        value,
        threshold: warn,
        triggeredAt: now,
      });
    }
  };

  check("cpu", "CPU Utilization", readings.cpu, prefs.cpuThresholdWarning, prefs.cpuThresholdCritical);
  check("memory", "Memory (RAM)", readings.memPct, prefs.memThresholdWarning, prefs.memThresholdCritical);
  check("disk", "Root Disk Space", readings.diskPct, prefs.diskThresholdWarning, prefs.diskThresholdCritical);

  // Dispatch browser desktop notifications if enabled (throttled to max 1 per 60s per metric)
  if (
    prefs.browserNotifications &&
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    for (const a of alerts) {
      const key = `${a.metric}-${a.level}`;
      const last = notifiedTimestamps[key] ?? 0;
      if (now - last > 60_000) {
        notifiedTimestamps[key] = now;
        try {
          new Notification(`ServerHub Host Alert: ${a.label} (${a.level})`, {
            body: `${a.label} is at ${a.value.toFixed(1)}% (exceeded threshold of ${a.threshold}%).`,
            icon: "/favicon.ico",
          });
        } catch {
          /* ignore notification dispatch errors */
        }
      }
    }
  }

  return alerts;
}
