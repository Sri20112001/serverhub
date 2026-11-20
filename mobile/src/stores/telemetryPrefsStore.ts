import { create } from "zustand";
import { storage } from "../utils/storage";
import type { LiveReading, ThresholdAlert } from "../types/telemetry";

const PREFS_STORAGE_KEY = "serverhub_telemetry_prefs_v1";

export interface TelemetryPrefsState {
  pollingIntervalMs: number; // 0 means paused
  cpuWarn: number;
  cpuCrit: number;
  memWarn: number;
  memCrit: number;
  diskWarn: number;
  diskCrit: number;
  activeAlerts: ThresholdAlert[];

  setPollingIntervalMs: (ms: number) => Promise<void>;
  setThresholds: (thresholds: {
    cpuWarn?: number;
    cpuCrit?: number;
    memWarn?: number;
    memCrit?: number;
    diskWarn?: number;
    diskCrit?: number;
  }) => Promise<void>;
  evaluateAlerts: (reading: LiveReading) => ThresholdAlert[];
  loadPrefs: () => Promise<void>;
}

export const useTelemetryPrefsStore = create<TelemetryPrefsState>((set, get) => ({
  pollingIntervalMs: 2000,
  cpuWarn: 80,
  cpuCrit: 90,
  memWarn: 85,
  memCrit: 95,
  diskWarn: 85,
  diskCrit: 95,
  activeAlerts: [],

  loadPrefs: async () => {
    try {
      const raw = await storage.getItem(PREFS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          pollingIntervalMs: parsed.pollingIntervalMs ?? 2000,
          cpuWarn: parsed.cpuWarn ?? 80,
          cpuCrit: parsed.cpuCrit ?? 90,
          memWarn: parsed.memWarn ?? 85,
          memCrit: parsed.memCrit ?? 95,
          diskWarn: parsed.diskWarn ?? 85,
          diskCrit: parsed.diskCrit ?? 95,
        });
      }
    } catch {
      // fallback to defaults
    }
  },

  setPollingIntervalMs: async (ms: number) => {
    set({ pollingIntervalMs: ms });
    const s = get();
    await storage.setItem(
      PREFS_STORAGE_KEY,
      JSON.stringify({
        pollingIntervalMs: ms,
        cpuWarn: s.cpuWarn,
        cpuCrit: s.cpuCrit,
        memWarn: s.memWarn,
        memCrit: s.memCrit,
        diskWarn: s.diskWarn,
        diskCrit: s.diskCrit,
      }),
    );
  },

  setThresholds: async (thresholds) => {
    set((state) => ({ ...state, ...thresholds }));
    const s = get();
    await storage.setItem(
      PREFS_STORAGE_KEY,
      JSON.stringify({
        pollingIntervalMs: s.pollingIntervalMs,
        cpuWarn: s.cpuWarn,
        cpuCrit: s.cpuCrit,
        memWarn: s.memWarn,
        memCrit: s.memCrit,
        diskWarn: s.diskWarn,
        diskCrit: s.diskCrit,
      }),
    );
  },

  evaluateAlerts: (reading: LiveReading) => {
    const { cpuWarn, cpuCrit, memWarn, memCrit, diskWarn, diskCrit } = get();
    const alerts: ThresholdAlert[] = [];

    // CPU
    if (reading.cpuPercent >= cpuCrit) {
      alerts.push({
        metric: "cpu",
        severity: "critical",
        value: reading.cpuPercent,
        threshold: cpuCrit,
        label: `CPU load critical (${Math.round(reading.cpuPercent)}% >= ${cpuCrit}%)`,
      });
    } else if (reading.cpuPercent >= cpuWarn) {
      alerts.push({
        metric: "cpu",
        severity: "warning",
        value: reading.cpuPercent,
        threshold: cpuWarn,
        label: `CPU load warning (${Math.round(reading.cpuPercent)}% >= ${cpuWarn}%)`,
      });
    }

    // Memory
    if (reading.memPercent >= memCrit) {
      alerts.push({
        metric: "mem",
        severity: "critical",
        value: reading.memPercent,
        threshold: memCrit,
        label: `Memory critical (${Math.round(reading.memPercent)}% >= ${memCrit}%)`,
      });
    } else if (reading.memPercent >= memWarn) {
      alerts.push({
        metric: "mem",
        severity: "warning",
        value: reading.memPercent,
        threshold: memWarn,
        label: `Memory warning (${Math.round(reading.memPercent)}% >= ${memWarn}%)`,
      });
    }

    // Disk
    if (reading.diskPercent >= diskCrit) {
      alerts.push({
        metric: "disk",
        severity: "critical",
        value: reading.diskPercent,
        threshold: diskCrit,
        label: `Disk storage critical (${Math.round(reading.diskPercent)}% >= ${diskCrit}%)`,
      });
    } else if (reading.diskPercent >= diskWarn) {
      alerts.push({
        metric: "disk",
        severity: "warning",
        value: reading.diskPercent,
        threshold: diskWarn,
        label: `Disk storage warning (${Math.round(reading.diskPercent)}% >= ${diskWarn}%)`,
      });
    }

    set({ activeAlerts: alerts });
    return alerts;
  },
}));
