import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { ContainerStat, ServerDetail, StorageInfo } from "../lib/types/host";
import type { TelemetryPoint } from "../lib/types/telemetry";
import { rates, type RichPoint } from "../utils/telemetryFormat";
import { useLiveTelemetry } from "./useLiveTelemetry";
import { useTelemetryPrefs } from "./useTelemetryPrefs";

export const RANGES = ["15m", "1h", "6h", "24h"] as const;
export type TelemetryRange = (typeof RANGES)[number];

// Range-scoped samples plus the one-shot host detail, storage and container
// snapshots. `rich` augments each sample with per-second network/disk rates.
// `live` drives the instant rail and polls dynamically according to preferences
// configured in Settings.
export function useTelemetry() {
  const { prefs, updatePrefs } = useTelemetryPrefs();
  const [range, setRange] = useState<TelemetryRange>("1h");
  const [points, setPoints] = useState<TelemetryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ServerDetail | null>(null);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [cstats, setCstats] = useState<ContainerStat[] | null>(null);
  const [live, setLive] = useState(true);
  const liveFeed = useLiveTelemetry(live, prefs.pollIntervalMs, prefs.pauseOnBlur);

  useEffect(() => {
    let alive = true;
    // Intentional: reset loading state when the range changes (alive-guarded).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api
      .telemetry(range)
      .then((r) => {
        if (alive) setPoints(r.points);
      })
      .catch(() => {
        if (alive) setPoints([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [range]);

  useEffect(() => {
    let alive = true;
    api
      .serverDetail()
      .then((d) => {
        if (alive) setDetail(d);
      })
      .catch(() => {});
    api
      .storage()
      .then((s) => {
        if (alive) setStorage(s);
      })
      .catch(() => {});
    api
      .containerStats()
      .then((c) => {
        if (alive) setCstats(c);
      })
      .catch(() => {
        if (alive) setCstats([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const rich: RichPoint[] = useMemo(() => {
    const rx = rates(points, "netRx");
    const tx = rates(points, "netTx");
    const rd = rates(points, "diskRead");
    const wr = rates(points, "diskWrite");
    return points.map((p, i) => ({
      ...p,
      rx: rx[i] ?? 0,
      tx: tx[i] ?? 0,
      rd: rd[i] ?? 0,
      wr: wr[i] ?? 0,
    }));
  }, [points]);

  const reloadDetail = () => {
    api.serverDetail().then(setDetail).catch(() => {});
  };

  return {
    range,
    setRange,
    points,
    loading,
    detail,
    storage,
    cstats,
    rich,
    live,
    setLive,
    liveFeed,
    reloadDetail,
    prefs,
    updatePrefs,
  };
}
