import { client } from "./client";
import type {
  DetailedProcess,
  LiveReading,
  ServerDetail,
  StorageInfo,
} from "../types/telemetry";

export const telemetryApi = {
  // Instant host reading for real-time telemetry
  live: async (): Promise<LiveReading> => {
    const res = await client.get<LiveReading>("/server-hub/api/telemetry/live");
    return res.data;
  },

  // Detailed host inventory (CPU, RAM, Disks, OS, Processes)
  serverDetail: async (): Promise<ServerDetail> => {
    const res = await client.get<ServerDetail>("/server-hub/api/server/detail");
    return res.data;
  },

  // Storage breakdown & physical filesystems
  storage: async (): Promise<StorageInfo> => {
    const res = await client.get<StorageInfo>("/server-hub/api/server/storage");
    return res.data;
  },

  // Detailed inspection of a specific process
  processDetail: async (pid: number): Promise<DetailedProcess> => {
    const res = await client.get<DetailedProcess>(
      `/server-hub/api/processes/${pid}`,
    );
    return res.data;
  },

  // Process termination (SIGTERM or SIGKILL)
  killProcess: async (
    pid: number,
    signal: "SIGTERM" | "SIGKILL" = "SIGTERM",
  ): Promise<{ ok: boolean; message: string }> => {
    const res = await client.post<{ ok: boolean; message: string }>(
      `/server-hub/api/processes/${pid}/kill`,
      { signal },
    );
    return res.data;
  },
};
