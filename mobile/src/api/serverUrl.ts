import { storage } from "../utils/storage";
import { client, DEFAULT_API_BASE } from "./client";

export const SERVER_URL_KEY = "serverhub_api_url";

/** Strip whitespace/trailing slashes so `http://host:4000/` and `http://host:4000` behave the same. */
export function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/** Production API base URL baked via EXPO_PUBLIC_API_URL (see mobile/.env). */
export function defaultBaseUrl(): string {
  return normalizeUrl(DEFAULT_API_BASE);
}

/** Current base URL in effect (hardcoded from environment). */
export function currentBaseUrl(): string {
  return defaultBaseUrl();
}

/** Apply a base URL to the shared axios instance immediately. */
export function applyBaseUrl(url: string): string {
  const clean = normalizeUrl(url);
  client.defaults.baseURL = clean;
  return clean;
}

/** Initializes and enforces the production base URL from EXPO_PUBLIC_API_URL at startup. */
export async function initStoredBaseUrl(): Promise<string> {
  return applyBaseUrl(defaultBaseUrl());
}

/** Optional helper to persist server URL if ever needed programmatically. */
export async function saveBaseUrl(url: string): Promise<string> {
  const clean = normalizeUrl(url);
  if (!/^https?:\/\/.+/.test(clean)) {
    throw new Error("Server URL must start with http:// or https://");
  }
  await storage.setItem(SERVER_URL_KEY, clean);
  return applyBaseUrl(clean);
}

/** Reset to the environment-configured production default. */
export async function resetBaseUrl(): Promise<string> {
  try {
    await storage.deleteItem(SERVER_URL_KEY);
  } catch {
    // ignore
  }
  return applyBaseUrl(defaultBaseUrl());
}

/** Quick reachability probe. */
export async function probeBaseUrl(url: string, timeoutMs = 8000): Promise<void> {
  const clean = normalizeUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${clean}/health`, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Server answered with HTTP ${res.status}`);
    }
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Timed out reaching the server. Please check that the backend is running.");
    }
    throw e instanceof Error
      ? e
      : new Error("Could not connect to the server.");
  } finally {
    clearTimeout(timer);
  }
}
