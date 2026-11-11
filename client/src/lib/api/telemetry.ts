import { req } from "./http";
import type { ContainerStat, DetailedProcess, LiveReading, ServerDetail, StorageInfo } from "../types/host";
import type { TelemetryHistory } from "../types/telemetry";

export const telemetryApi = {
  // telemetry history for the resource timeline
  telemetry: (range: string = "1h") =>
    req<TelemetryHistory>(`/server-hub/api/telemetry?range=${range}`),

  // instant host reading for live mode (no database round trip)
  live: () => req<LiveReading>("/server-hub/api/telemetry/live"),

  // host inventory (detail, storage, per-container stats)
  serverDetail: () => req<ServerDetail>("/server-hub/api/server/detail"),
  storage: () => req<StorageInfo>("/server-hub/api/server/storage"),
  containerStats: () =>
    req<ContainerStat[]>("/server-hub/api/containers/stats"),

  // forensic process inspection
  processDetail: (pid: number) =>
    req<DetailedProcess>(`/server-hub/api/processes/${pid}`),

  // process termination (operator+ role)
  killProcess: (pid: number, signal: "SIGTERM" | "SIGKILL" = "SIGTERM") =>
    req<{ ok: boolean; message: string }>(`/server-hub/api/processes/${pid}/kill`, {
      method: "POST",
      body: JSON.stringify({ signal }),
    }),
};
