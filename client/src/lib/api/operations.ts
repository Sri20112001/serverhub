import { req } from "./http";
import type { Operation } from "../types/operations";

export interface ContainerFileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  mode: string;
  modTime: string;
}

export interface ContainerFileReadResult {
  name: string;
  path: string;
  size: number;
  bytesRead: number;
  truncated: boolean;
  isText: boolean;
  content: string;
  modTime: string;
}

export const operationsApi = {
  // operations (unified progress for deploys, restarts, backups …)
  operation: (id: string) => req<Operation>(`/server-hub/api/operations/${id}`),
  operations: (limit = 20) =>
    req<Operation[]>(`/server-hub/api/operations?limit=${limit}`),

  // container exec terminal (single-use token, then WebSocket)
  execToken: (container: string, shell = "/bin/sh", confirm = true) =>
    req<{ token: string; operationId: string; id: string }>(
      `/server-hub/api/containers/${encodeURIComponent(container)}/exec${
        confirm ? "?confirm=true" : ""
      }`,
      { method: "POST", body: JSON.stringify({ shell }) },
    ),

  // container file explorer
  containerFiles: (container: string, path = "/") =>
    req<{ path: string; isDir: boolean; entries: ContainerFileEntry[] }>(
      `/server-hub/api/containers/${encodeURIComponent(container)}/files?path=${encodeURIComponent(path)}`
    ),
  containerReadFile: (container: string, path: string) =>
    req<ContainerFileReadResult>(
      `/server-hub/api/containers/${encodeURIComponent(container)}/files/read?path=${encodeURIComponent(path)}`
    ),
};
