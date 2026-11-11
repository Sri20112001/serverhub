import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Memory storage fallback if window.localStorage is not accessible or in tests
const memoryStore = new Map<string, string>();

/**
 * Universal storage helper that transparently routes to `expo-secure-store`
 * on native platforms (Android, iOS) and `localStorage` on web.
 */
export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch {
        // Fallback to memory
      }
      return memoryStore.get(key) ?? null;
    }
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(key, value);
          return;
        }
      } catch {
        // Fallback to memory
      }
      memoryStore.set(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },

  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.removeItem(key);
          return;
        }
      } catch {
        // Fallback to memory
      }
      memoryStore.delete(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};
