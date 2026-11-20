import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { telemetryApi } from "../api/telemetry";
import { useTelemetryPrefsStore } from "../stores/telemetryPrefsStore";
import type { LiveReading, ServerDetail, StorageInfo } from "../types/telemetry";

const MAX_HISTORY_POINTS = 25;

export function useLiveTelemetry() {
  const {
    pollingIntervalMs,
    setPollingIntervalMs,
    evaluateAlerts,
    activeAlerts,
    loadPrefs,
  } = useTelemetryPrefsStore();

  const [history, setHistory] = useState<{
    cpu: number[];
    mem: number[];
    disk: number[];
    net: number[];
  }>({
    cpu: [],
    mem: [],
    disk: [],
    net: [],
  });

  const lastReadingRef = useRef<LiveReading | null>(null);

  // Load preferences from local storage on mount
  useEffect(() => {
    void loadPrefs();
  }, [loadPrefs]);

  // Live host polling via React Query
  const liveQuery = useQuery<LiveReading>({
    queryKey: ["liveTelemetry"],
    queryFn: async () => {
      const reading = await telemetryApi.live();
      const prev = lastReadingRef.current;
      lastReadingRef.current = reading;

      if (prev && reading.ts > prev.ts) {
        const dtSec = Math.max(0.2, (reading.ts - prev.ts) / 1000);
        const rxDiff = Math.max(0, reading.netRxBytes - prev.netRxBytes);
        const txDiff = Math.max(0, reading.netTxBytes - prev.netTxBytes);
        reading.rxSpeedBps = rxDiff / dtSec;
        reading.txSpeedBps = txDiff / dtSec;
      }

      evaluateAlerts(reading);

      const netThroughput = (reading.rxSpeedBps ?? 0) + (reading.txSpeedBps ?? 0);
      setHistory((old) => ({
        cpu: [...old.cpu.slice(-MAX_HISTORY_POINTS), reading.cpuPercent],
        mem: [...old.mem.slice(-MAX_HISTORY_POINTS), reading.memPercent],
        disk: [...old.disk.slice(-MAX_HISTORY_POINTS), reading.diskPercent],
        net: [...old.net.slice(-MAX_HISTORY_POINTS), netThroughput],
      }));

      return reading;
    },
    refetchInterval: pollingIntervalMs > 0 ? pollingIntervalMs : false,
  });

  const current = liveQuery.data ?? null;

  // Inventory queries
  const detailQuery = useQuery<ServerDetail>({
    queryKey: ["serverDetail"],
    queryFn: telemetryApi.serverDetail,
    staleTime: 30_000,
  });

  const storageQuery = useQuery<StorageInfo>({
    queryKey: ["serverStorage"],
    queryFn: telemetryApi.storage,
    staleTime: 30_000,
  });

  const refreshAll = useCallback(async () => {
    await Promise.all([
      liveQuery.refetch(),
      detailQuery.refetch(),
      storageQuery.refetch(),
    ]);
  }, [liveQuery, detailQuery, storageQuery]);

  return {
    current,
    history,
    pollingIntervalMs,
    setPollingIntervalMs,
    activeAlerts,
    serverDetail: detailQuery.data ?? null,
    storageInfo: storageQuery.data ?? null,
    isLoading: detailQuery.isLoading && !current,
    refreshAll,
  };
}
