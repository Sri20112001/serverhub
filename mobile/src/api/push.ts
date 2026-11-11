import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { storage } from "../utils/storage";
import { client } from "./client";

const STORED_PUSH_TOKEN_KEY = "serverhub_push_token";

/**
 * Register this device for push notifications. Safe to call on every
 * launch: permission is only prompted once, registration is idempotent
 * server-side, and every failure path returns null (push stays a
 * best-effort enhancement — it must never break login).
 *
 * Note: real Expo push tokens need a physical device AND, for production
 * builds, an EAS project ID in app.json (`extra.eas.projectId`).
 * Simulators and misconfigured builds silently skip registration.
 */
export async function registerForPush(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;
    const { status: existing } = await Notifications.getPermissionsAsync();
    const status =
      existing === "granted"
        ? existing
        : (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return null;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as
      | string
      | undefined;
    const token = (
      await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      )
    ).data;
    if (!token) return null;
    await client.post("/server-hub/api/push-tokens", {
      expoPushToken: token,
      platform: Device.osName ?? "unknown",
    });
    await storage.setItem(STORED_PUSH_TOKEN_KEY, token);
    return token;
  } catch {
    return null;
  }
}

/** Drop this device's registration (call on logout; failures are silent). */
export async function unregisterPush(): Promise<void> {
  try {
    const token = await storage.getItem(STORED_PUSH_TOKEN_KEY);
    if (!token) return;
    try {
      await client.delete("/server-hub/api/push-tokens", {
        data: { expoPushToken: token },
      });
    } catch {
      // Server unreachable or token already gone — clear locally anyway.
    }
    await storage.deleteItem(STORED_PUSH_TOKEN_KEY);
  } catch {
    // Storage unavailable — nothing to clean up.
  }
}
