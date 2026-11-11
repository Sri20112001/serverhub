import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Activity,
  AlertTriangle,
  Database,
  HardDrive,
  LayoutDashboard,
  ListFilter,
  Pause,
  Play,
  SlidersHorizontal,
  Terminal,
} from "lucide-react";
import { TelemetryCharts, TelemetryRangeControls } from "../../components/TelemetryCharts";
import { TelemetryProcesses } from "../../components/TelemetryDetail";
import { TelemetryInventory } from "../../components/TelemetryInventory";
import { TelemetryLiveRail, type RailSeries, type RailValues } from "../../components/TelemetryLiveRail";
import { TelemetryStorage } from "../../components/TelemetryStorage";
import { TelemetrySystemCard } from "../../components/TelemetrySystemCard";
import { Page } from "../../components/ui/Page";
import { PageHeader } from "../../components/ui/PageHeader";
import { useTelemetry } from "../../hooks/useTelemetry";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { evaluateThresholdAlerts } from "../../lib/telemetryPrefs";

type ViewLayout = "overview" | "dense" | "storage" | "processes";

export function TelemetryPage() {
  useDocumentTitle("Host Telemetry");
  const t = useTelemetry();
  const [layout, setLayout] = useState<ViewLayout>("overview");

  // Derive instant values for the live rail either from the 3s live poller
  // or the latest snapshot in the historical buffer.
  const railValues: RailValues | null = useMemo(() => {
    if (t.live && t.liveFeed.latest) {
      const l = t.liveFeed.latest;
      return {
        cpu: l.cpuPercent,
        memPct: l.memPercent,
        memUsedMB: l.memUsedMB,
        memTotalMB: l.memTotalMB,
        diskPct: l.diskPercent,
        diskUsedGB: l.diskUsedGB,
        diskTotalGB: l.diskTotalGB,
        netRx: l.netRx,
        netTx: l.netTx,
        rd: l.rd,
        wr: l.wr,
      };
    }
    const last = t.rich[t.rich.length - 1];
    if (!last) return null;
    const diskTotal =
      t.storage?.filesystems.reduce((acc, f) => acc + f.totalGB, 0) ||
      t.detail?.filesystems.reduce((acc, f) => acc + f.totalGB, 0) ||
      0;
    return {
      cpu: last.cpu,
      memPct: last.memPct,
      memUsedMB: last.memMB,
      memTotalMB: t.detail?.memory.totalMB ?? 0,
      diskPct: last.diskPct,
      diskUsedGB: diskTotal * (last.diskPct / 100),
      diskTotalGB: diskTotal,
      netRx: last.rx,
      netTx: last.tx,
      rd: last.rd,
      wr: last.wr,
    };
  }, [t.live, t.liveFeed.latest, t.rich, t.detail, t.storage]);

  // Derive sparkline rolling series for the live rail
  const railSeries: RailSeries = useMemo(() => {
    if (t.live && t.liveFeed.samples.length > 0) {
      const s = t.liveFeed.samples;
      return {
        cpu: s.map((x) => x.cpuPercent),
        mem: s.map((x) => x.memPercent),
        disk: s.map((x) => x.diskPercent),
        net: s.map((x) => x.netRx + x.netTx),
        io: s.map((x) => x.rd + x.wr),
      };
    }
    const slice = t.rich.slice(-30);
    return {
      cpu: slice.map((x) => x.cpu),
      mem: slice.map((x) => x.memPct),
      disk: slice.map((x) => x.diskPct),
      net: slice.map((x) => (x.rx ?? 0) + (x.tx ?? 0)),
      io: slice.map((x) => (x.rd ?? 0) + (x.wr ?? 0)),
    };
  }, [t.live, t.liveFeed.samples, t.rich]);

  // Evaluate active host threshold alerts against configured warning and critical limits
  const activeAlerts = useMemo(() => {
    if (!railValues) return [];
    return evaluateThresholdAlerts(
      { cpu: railValues.cpu, memPct: railValues.memPct, diskPct: railValues.diskPct },
      t.prefs
    );
  }, [railValues, t.prefs]);

  return (
    <Page width="wide">
      {/* Prometheus clarity callout banner */}
      <div className="mb-6 p-3.5 rounded-card border border-accent/25 bg-accent/5 dark:bg-ember/5 text-[12px] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-ink dark:text-bone min-w-0">
          <Activity size={15} className="text-accent dark:text-ember shrink-0" />
          <span>
            <strong>Host Telemetry:</strong> Streaming live OS-level hardware counters (NVMe/SSD/HDD, RAM, CPU, I/O). For Prometheus PromQL queries & Alertmanager targets, visit{" "}
            <Link to="/monitoring" className="underline font-semibold text-accent dark:text-ember hover:opacity-80">
              Prometheus Monitoring →
            </Link>
          </span>
        </div>
        <div className="font-mono text-[11px] text-muted dark:text-fog">
          Prometheus integration: <span className="text-moss font-semibold">Active at /monitoring</span>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <PageHeader
          title="Telemetry."
          subtitle="Real-time host metrics, hardware spec sheet and storage health"
        />

        {/* Live mode toggle & layout controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => t.setLive(!t.live)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-[11px] font-medium border transition-colors ${
              t.live
                ? "bg-moss/10 border-moss/40 text-moss dark:bg-moss/20"
                : "bg-paper dark:bg-abyss border-line dark:border-edge text-muted dark:text-fog hover:text-ink dark:hover:text-bone"
            }`}
            title={
              t.live
                ? "Click to pause live polling"
                : `Click to resume ${t.prefs.pollIntervalMs / 1000}-second live polling`
            }
          >
            {t.live ? (
              <>
                <span className="w-2 h-2 rounded-full bg-moss animate-pulse" />
                <Pause size={11} />
                <span>LIVE ({t.prefs.pollIntervalMs / 1000}s)</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-stone" />
                <Play size={11} />
                <span>PAUSED</span>
              </>
            )}
          </button>

          {/* View switcher */}
          <div className="inline-flex items-center bg-paper dark:bg-abyss border border-line dark:border-edge rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setLayout("overview")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                layout === "overview"
                  ? "bg-white dark:bg-panel text-ink dark:text-bone shadow-sm font-semibold"
                  : "text-muted dark:text-fog hover:text-ink dark:hover:text-bone"
              }`}
            >
              <LayoutDashboard size={11} />
              <span>Overview</span>
            </button>
            <button
              type="button"
              onClick={() => setLayout("dense")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                layout === "dense"
                  ? "bg-white dark:bg-panel text-ink dark:text-bone shadow-sm font-semibold"
                  : "text-muted dark:text-fog hover:text-ink dark:hover:text-bone"
              }`}
            >
              <ListFilter size={11} />
              <span>All Details</span>
            </button>
            <button
              type="button"
              onClick={() => setLayout("storage")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                layout === "storage"
                  ? "bg-white dark:bg-panel text-ink dark:text-bone shadow-sm font-semibold"
                  : "text-muted dark:text-fog hover:text-ink dark:hover:text-bone"
              }`}
            >
              <HardDrive size={11} />
              <span>Drives</span>
            </button>
            <button
              type="button"
              onClick={() => setLayout("processes")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                layout === "processes"
                  ? "bg-white dark:bg-panel text-ink dark:text-bone shadow-sm font-semibold"
                  : "text-muted dark:text-fog hover:text-ink dark:hover:text-bone"
              }`}
            >
              <Terminal size={11} />
              <span>Processes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Threshold Alert Banner */}
      {activeAlerts.length > 0 && (
        <div className="mb-6 p-4 rounded-xl border border-brick/40 bg-red-500/10 text-ink dark:text-bone flex items-start justify-between gap-3 flex-wrap shadow-xs">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-1.5 rounded-lg bg-brick/20 text-brick shrink-0 mt-0.5">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="text-[13px] font-bold text-brick flex items-center gap-2">
                <span>Threshold Alert Breached ({activeAlerts.length})</span>
                <span className="w-2 h-2 rounded-full bg-brick animate-ping" />
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-1.5">
                {activeAlerts.map((a) => (
                  <span
                    key={a.metric}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-xs border ${
                      a.level === "CRITICAL"
                        ? "bg-brick text-white border-brick font-bold"
                        : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 font-semibold"
                    }`}
                  >
                    <span>{a.label}:</span>
                    <span>{a.value.toFixed(1)}%</span>
                    <span className="text-[10px] opacity-80">(limit: {a.threshold}%)</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <Link
            to="/settings?tab=system"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-white dark:bg-panel border border-line dark:border-edge text-ink dark:text-bone hover:border-accent transition-colors shadow-2xs"
          >
            <SlidersHorizontal size={12} />
            <span>Adjust Alert Thresholds</span>
          </Link>
        </div>
      )}

      {/* Live top rail with sparklines */}
      <TelemetryLiveRail
        values={railValues}
        series={railSeries}
        detail={t.detail}
        mode={t.live ? "live" : "sample"}
        failed={t.liveFeed.failed}
        prefs={t.prefs}
      />

      {/* Layout Content */}
      {layout === "overview" && (
        <div className="flex flex-col gap-6">
          {t.detail && <TelemetrySystemCard detail={t.detail} />}
          {t.storage && <TelemetryStorage storage={t.storage} />}
          <div className="mt-2">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted dark:text-fog flex items-center gap-1.5">
                <Database size={13} className="text-accent dark:text-ember" />
                <span>Historical Telemetry Trends</span>
              </div>
              <TelemetryRangeControls range={t.range} onRange={t.setRange} />
            </div>
            <TelemetryCharts key={t.range} loading={t.loading} hasPoints={t.points.length > 0} rich={t.rich} />
          </div>
          {t.detail && <TelemetryProcesses detail={t.detail} onRefresh={t.reloadDetail} />}
        </div>
      )}

      {layout === "dense" && (
        <div className="flex flex-col gap-6">
          {t.detail && <TelemetrySystemCard detail={t.detail} />}
          {t.storage && <TelemetryStorage storage={t.storage} />}
          {t.detail && <TelemetryProcesses detail={t.detail} onRefresh={t.reloadDetail} />}
          <TelemetryInventory detail={t.detail} cstats={t.cstats} />
          <div className="mt-2">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted dark:text-fog flex items-center gap-1.5">
                <Database size={13} className="text-accent dark:text-ember" />
                <span>Historical Telemetry Trends</span>
              </div>
              <TelemetryRangeControls range={t.range} onRange={t.setRange} />
            </div>
            <TelemetryCharts key={t.range} loading={t.loading} hasPoints={t.points.length > 0} rich={t.rich} />
          </div>
        </div>
      )}

      {layout === "storage" && (
        <div className="flex flex-col gap-6">
          {t.storage && <TelemetryStorage storage={t.storage} />}
          <TelemetryInventory detail={t.detail} cstats={null} />
        </div>
      )}

      {layout === "processes" && (
        <div className="flex flex-col gap-6">
          {t.detail && <TelemetryProcesses detail={t.detail} onRefresh={t.reloadDetail} />}
          {t.cstats && t.cstats.length > 0 && (
            <TelemetryInventory detail={null} cstats={t.cstats} />
          )}
        </div>
      )}
    </Page>
  );
}
