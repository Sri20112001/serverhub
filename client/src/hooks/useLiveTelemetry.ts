import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { LiveReading } from "../lib/types/host";

// One polled reading plus the per-second rates derived from the previous poll.
export type LiveSample = LiveReading & {
  netRx: number; // KB/s
  netTx: number;
  rd: number;
  wr: number;
};

// ~2 minutes of history at the default 3s cadence — enough for the sparklines
// without keeping a big array alive.
const WINDOW = 40;

// Polls /telemetry/live while live mode is on. Rates are derived from the
// elapsed wall-clock time between polls, not from the server's second-granular
// timestamp, so a fast cadence does not round down to a 0s divisor.
export function useLiveTelemetry(enabled: boolean, intervalMs = 3000, pauseOnBlur = true) {
  const [latest, setLatest] = useState<LiveSample | null>(null);
  const [samples, setSamples] = useState<LiveSample[]>([]);
  const [failed, setFailed] = useState(false);

  const prev = useRef<LiveReading | null>(null);
  const prevAt = useRef(0);

  useEffect(() => {
    if (!enabled) {
      // Starting fresh on re-enable keeps stale counters from producing a
      // bogus first rate.
      prev.current = null;
      prevAt.current = 0;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSamples([]);
      setLatest(null);
      setFailed(false);
      return;
    }

    let alive = true;
    let timer = 0;

    const poll = async () => {
      try {
        const reading = await api.live();
        if (!alive) return;

        const now = Date.now();
        const before = prev.current;
        const dt = prevAt.current ? Math.max(0.25, (now - prevAt.current) / 1000) : 0;
        const rate = (value: number, previous: number) =>
          before && dt > 0 && value >= previous ? (value - previous) / dt / 1024 : 0;

        const sample: LiveSample = {
          ...reading,
          netRx: rate(reading.netRxBytes, before?.netRxBytes ?? 0),
          netTx: rate(reading.netTxBytes, before?.netTxBytes ?? 0),
          rd: rate(reading.diskReadBytes, before?.diskReadBytes ?? 0),
          wr: rate(reading.diskWriteBytes, before?.diskWriteBytes ?? 0),
        };

        prev.current = reading;
        prevAt.current = now;
        setLatest(sample);
        setSamples((prior) => [...prior, sample].slice(-WINDOW));
        setFailed(false);
      } catch {
        if (alive) setFailed(true);
      }
    };

    const tick = () => {
      // Skip polling in a background tab if pauseOnBlur is enabled
      if (pauseOnBlur && document.hidden) {
        timer = window.setTimeout(tick, intervalMs);
        return;
      }
      void poll().finally(() => {
        if (alive) timer = window.setTimeout(tick, intervalMs);
      });
    };

    tick();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [enabled, intervalMs, pauseOnBlur]);

  return { latest, samples, failed };
}
