import axios from "axios";
import { storage } from "../utils/storage";

function resolveDefaultApiBase(): string {
  if (typeof window !== "undefined" && window.location?.hostname) {
    const host = window.location.hostname;
    if (host) {
      return `http://${host}:4000`;
    }
  }
  const envUrl = (process.env.EXPO_PUBLIC_API_URL as string | undefined)?.trim();
  return envUrl && envUrl.length > 0 ? envUrl : "http://192.168.0.111:4000";
}

// Production API Base URL configured via environment file (.env).
// When previewing on web browser, dynamically routes to the current hostname port 4000.
export const DEFAULT_API_BASE = resolveDefaultApiBase();

export const API_BASE = DEFAULT_API_BASE;

export const TOKEN_KEY = "serverhub_token";
export const REFRESH_KEY = "serverhub_refresh_token";
export const USER_KEY = "serverhub_user";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const client = axios.create({ // eslint-disable-line import/no-named-as-default-member
  baseURL: API_BASE,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Inject stored JWT on every request
client.interceptors.request.use(async (config) => {
  const token = await storage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Single-flight access-token renewal. Returns true when a fresh token was
// stored (caller should retry), false when the session is dead.
let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const [refreshToken, baseURL] = await Promise.all([
          storage.getItem(REFRESH_KEY),
          Promise.resolve(client.defaults.baseURL ?? API_BASE),
        ]);
        if (!refreshToken) return false;
        const res = await axios.post(
          `${baseURL}/server-hub/api/auth/refresh`,
          { refreshToken },
          { timeout: 15000, headers: { "Content-Type": "application/json" } },
        );
        const access: string | undefined = res.data?.token;
        const rotated: string | undefined = res.data?.refreshToken;
        if (!access) return false;
        await storage.setItem(TOKEN_KEY, access);
        if (rotated) await storage.setItem(REFRESH_KEY, rotated);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

function isAuthPath(url: string | undefined): boolean {
  return !!url && url.includes("/server-hub/api/auth/");
}

// Normalize errors into concise, user-friendly messages
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status: number = error.response?.status ?? 0;
    const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
    // Access tokens live 30 minutes: on expiry, rotate once and retry the
    // original request (never for auth endpoints themselves).
    if (
      status === 401 &&
      original &&
      !original._retried &&
      !isAuthPath(original.url)
    ) {
      original._retried = true;
      if (await refreshSession()) {
        const token = await storage.getItem(TOKEN_KEY);
        if (token) {
          original.headers = original.headers ?? {};
          (original.headers as Record<string, string>).Authorization = `Bearer ${token}`;
        }
        return client.request(original);
      }
    }
    let msg: string =
      error.response?.data?.error ??
      error.message ??
      `Request failed (${status})`;
    if (status === 0) {
      msg = "Unable to connect to Server Hub. Please check your network connection or verify that the server is running.";
    }
    return Promise.reject(new ApiError(status, msg));
  },
);
