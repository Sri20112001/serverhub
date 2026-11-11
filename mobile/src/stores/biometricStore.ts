import { create } from "zustand";
import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { storage } from "../utils/storage";

const BIOMETRIC_KEY = "serverhub_biometric_enabled";

interface BiometricState {
  enabled: boolean;
  supported: boolean;
  load: () => Promise<void>;
  setEnabled: (v: boolean) => Promise<void>;
  authenticate: () => Promise<boolean>;
}

export const useBiometricStore = create<BiometricState>((set, get) => ({
  enabled: false,
  supported: false,

  load: async () => {
    try {
      if (Platform.OS === "web") {
        set({ supported: false, enabled: false });
        return;
      }
      const supported = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const raw = await storage.getItem(BIOMETRIC_KEY);
      set({ supported: supported && enrolled, enabled: raw === "true" });
    } catch {
      set({ supported: false, enabled: false });
    }
  },

  setEnabled: async (v) => {
    await storage.setItem(BIOMETRIC_KEY, v ? "true" : "false");
    set({ enabled: v });
  },

  authenticate: async () => {
    if (Platform.OS === "web" || !get().enabled) return true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to access Server Hub",
        fallbackLabel: "Use password",
      });
      return result.success;
    } catch {
      return false;
    }
  },
}));
