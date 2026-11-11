import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_TELEMETRY_PREFS,
  loadTelemetryPrefs,
  saveTelemetryPrefs,
  TELEMETRY_PREFS_EVENT,
  TELEMETRY_PREFS_KEY,
  type TelemetryPrefs,
} from "../lib/telemetryPrefs";

export function useTelemetryPrefs() {
  const [prefs, setPrefsState] = useState<TelemetryPrefs>(loadTelemetryPrefs);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === TELEMETRY_PREFS_KEY && e.newValue) {
        try {
          setPrefsState({ ...DEFAULT_TELEMETRY_PREFS, ...JSON.parse(e.newValue) });
        } catch {
          // ignore parsing error
        }
      }
    };

    const handleCustom = (e: Event) => {
      const ce = e as CustomEvent<TelemetryPrefs>;
      if (ce.detail) {
        setPrefsState(ce.detail);
      } else {
        setPrefsState(loadTelemetryPrefs());
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(TELEMETRY_PREFS_EVENT, handleCustom);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(TELEMETRY_PREFS_EVENT, handleCustom);
    };
  }, []);

  const updatePrefs = useCallback((updater: Partial<TelemetryPrefs> | ((prev: TelemetryPrefs) => TelemetryPrefs)) => {
    setPrefsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      saveTelemetryPrefs(next);
      return next;
    });
  }, []);

  return { prefs, updatePrefs };
}
