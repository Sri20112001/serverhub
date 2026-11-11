import { create } from "zustand";
import { storage } from "../utils/storage";
import { authApi } from "../api/auth";
import { TOKEN_KEY, REFRESH_KEY, USER_KEY } from "../api/client";
import { initStoredBaseUrl } from "../api/serverUrl";
import { registerForPush, unregisterPush } from "../api/push";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  checked: boolean;
  busy: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  checked: false,
  busy: false,
  error: null,

  hydrate: async () => {
    try {
      // Apply any saved server-URL override before any request fires.
      await initStoredBaseUrl();
      const [token, userJson] = await Promise.all([
        storage.getItem(TOKEN_KEY),
        storage.getItem(USER_KEY),
      ]);
      if (token && userJson) {
        // Verify token is still valid, use fresh user data from server.
        // (A 401 here transparently rotates via the refresh token first.)
        try {
          const freshUser = await authApi.me();
          await storage.setItem(USER_KEY, JSON.stringify(freshUser));
          set({ user: freshUser, token, checked: true });
          // Refresh the push registration (idempotent server-side).
          void registerForPush();
        } catch {
          await storage.deleteItem(TOKEN_KEY);
          await storage.deleteItem(REFRESH_KEY);
          await storage.deleteItem(USER_KEY);
          set({ user: null, token: null, checked: true });
        }
      } else {
        set({ checked: true });
      }
    } catch {
      set({ checked: true });
    }
  },

  login: async (username, password) => {
    set({ busy: true, error: null });
    try {
      const res = await authApi.login(username, password);
      const user: User = { username: res.username, role: res.role };
      await storage.setItem(TOKEN_KEY, res.token);
      if (res.refreshToken) {
        await storage.setItem(REFRESH_KEY, res.refreshToken);
      }
      await storage.setItem(USER_KEY, JSON.stringify(user));
      set({ user, token: res.token, busy: false });
      // Best-effort: a failed registration just means no push on this device.
      void registerForPush();
    } catch (e) {
      set({
        busy: false,
        error: e instanceof Error ? e.message : "Login failed",
      });
      throw e;
    }
  },

  logout: async () => {
    try {
      // Drop this device's push registration while the token still works.
      await unregisterPush();
      await authApi.logout();
    } catch {
      // ignore — clear local state regardless
    } finally {
      await storage.deleteItem(TOKEN_KEY);
      await storage.deleteItem(REFRESH_KEY);
      await storage.deleteItem(USER_KEY);
      set({ user: null, token: null });
    }
  },

  clearError: () => set({ error: null }),
}));
