import type { ReactNode } from "react";
import { Link } from "react-router";
import { Activity, Cpu, HardDrive, MemoryStick, Network, SlidersHorizontal } from "lucide-react";
import { CountUp } from "./ui/CountUp";
import { Sparkline } from "./ui/Sparkline";
import { fmtGB, fmtSize } from "../utils/telemetryFormat";
import { fmtRate } from "../lib/format";
import type { ServerDetail } from "../lib/types/host";
import type { TelemetryPrefs } from "../lib/telemetryPrefs";

export type RailValues = {
  cpu: number;
  memPct: number;
  memUsedMB: number;
  memTotalMB: number;
  diskPct: number;
  diskUsedGB: number;
  diskTotalGB: number;
  netRx: number; // KB/s
  netTx: number;
  rd: number;
  wr: number;
};

export type RailSeries = {
  cpu: number[];
  mem: number[];
  disk: number[];
  net: number[];
  io: number[];
};

function LiveCard({
  icon,
  label,
  value,
  hint,
  spark,
  stroke,
  tintClass,
  max,
  compact = false,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint: ReactNode;
  spark: number[];
  stroke: string;
  tintClass: string;
  max?: number;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="bg-white dark:bg-panel border border-line dark:border-edge rounded-card px-3.5 pt-3 pb-2 min-w-0 flex flex-col shadow-xs">
        <div className="flex items-center gap-1.5 text-muted dark:text-fog">
          <span className="text-accent dark:text-ember">{icon}</span>
          <span className="text-[10.5px] font-semibold tracking-[0.08em] uppercase">{label}</span>
        </div>
        <div className="font-mono text-[22px] font-bold leading-tight text-ink dark:text-bone mt-1 truncate">
          {value}
        </div>
        <div className="font-mono text-[11px] text-muted dark:text-fog truncate">{hint}</div>
        <Sparkline values={spark} stroke={stroke} max={max} height={32} className="h-8 mt-2" />
      </div>
    );
  }

  // Expanded "comfortable" card size: larger typography, branded badge container,
  // generous breathing room and a tall, crisp sparkline.
  return (
    <div className="group bg-white dark:bg-panel border border-line dark:border-edge rounded-2xl p-5 min-w-0 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-accent/40 dark:hover:border-ember/40 transition-all duration-200">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105 ${tintClass}`}
            >
              {icon}
            </span>
            <span className="text-[11.5px] font-bold tracking-wider uppercase text-muted dark:text-fog truncate">
              {label}
            </span>
          </div>
        </div>

        <div className="font-mono text-2xl sm:text-[28px] font-extrabold tracking-tight text-ink dark:text-bone leading-none my-2 truncate">
          {value}
        </div>

        <div className="font-mono text-[11.5px] text-muted dark:text-fog truncate font-medium">
          {hint}
        </div>
      </div>

      <div className="mt-4 pt-2 border-t border-line/60 dark:border-edge/60">
        <Sparkline values={spark} stroke={stroke} max={max} height={44} className="h-11 sm:h-12" />
      </div>
    </div>
  );
}

// The live rail: customizable telemetry cards that answer "what is the host doing right now".
// Sizes and polling cadence adapt to user preferences configured in the Settings page.
export function TelemetryLiveRail({
  values,
  series,
  detail,
  mode,
  failed = false,
  prefs,
}: {
  values: RailValues | null;
  series: RailSeries;
  detail: ServerDetail | null;
  mode: "live" | "sample";
  failed?: boolean;
  prefs?: TelemetryPrefs;
}) {
  const v = values;
  const isCompact = prefs?.cardSize === "compact";
  const intervalSec = prefs ? (prefs.pollIntervalMs / 1000).toFixed(0) : "3";

  // Check which cards are enabled (default to true)
  const showCpu = prefs ? prefs.showCpu : true;
  const showMemory = prefs ? prefs.showMemory : true;
  const showDisk = prefs ? prefs.showDisk : true;
  const showNetwork = prefs ? prefs.showNetwork : true;
  const showIo = prefs ? prefs.showIo : true;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3 mb-3 min-w-0 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex w-2.5 h-2.5">
            {mode === "live" && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-moss opacity-60 animate-ping" />
            )}
            <span
              className={`relative inline-flex w-2.5 h-2.5 rounded-full ${
                failed ? "bg-brick" : mode === "live" ? "bg-moss" : "bg-stone"
              }`}
            />
          </span>
          <span className="text-[11.5px] font-semibold tracking-[0.08em] uppercase text-muted dark:text-fog truncate">
            {failed
              ? "Live feed unreachable"
              : mode === "live"
                ? `Live · polling every ${intervalSec}s`
                : "Last sample · 60s cadence"}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {mode === "sample" && (
            <span className="font-mono text-[11px] text-muted dark:text-fog whitespace-nowrap bg-paper dark:bg-abyss px-2 py-0.5 rounded border border-line dark:border-edge">
              live mode paused
            </span>
          )}

          {/* Quick link to Settings to adjust polling rate & metrics */}
          <Link
            to="/settings?tab=system"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-muted dark:text-fog hover:text-ink dark:hover:text-bone bg-paper dark:bg-abyss border border-line dark:border-edge transition-colors shadow-xs"
            title="Configure polling frequency and telemetry settings in Settings → Host System"
          >
            <SlidersHorizontal size={11} className="text-accent dark:text-ember" />
            <span>Polling settings ({intervalSec}s)</span>
          </Link>
        </div>
      </div>

      <div
        className={`grid gap-4 ${
          isCompact
            ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        }`}
      >
        {showCpu && (
          <LiveCard
            compact={isCompact}
            icon={<Cpu size={16} />}
            label="CPU Utilization"
            stroke="#EA580C"
            tintClass="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
            max={100}
            spark={series.cpu}
            value={v ? <CountUp value={v.cpu} decimals={1} suffix="%" /> : "—"}
            hint={
              detail
                ? `${detail.cpu.logicalCores} cores · load ${detail.cpu.load1.toFixed(2)}`
                : "load unavailable"
            }
          />
        )}

        {showMemory && (
          <LiveCard
            compact={isCompact}
            icon={<MemoryStick size={16} />}
            label="Memory (RAM)"
            stroke="#16A34A"
            tintClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            max={100}
            spark={series.mem}
            value={v ? <CountUp value={v.memPct} decimals={1} suffix="%" /> : "—"}
            hint={v ? `${fmtSize(v.memUsedMB)} / ${fmtSize(v.memTotalMB)}` : "—"}
          />
        )}

        {showDisk && (
          <LiveCard
            compact={isCompact}
            icon={<HardDrive size={16} />}
            label="Root Disk Space"
            stroke="#D97706"
            tintClass="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            max={100}
            spark={series.disk}
            value={v ? <CountUp value={v.diskPct} decimals={1} suffix="%" /> : "—"}
            hint={v ? `${fmtGB(v.diskUsedGB)} / ${fmtGB(v.diskTotalGB)}` : "—"}
          />
        )}

        {showNetwork && (
          <LiveCard
            compact={isCompact}
            icon={<Network size={16} />}
            label="Network Throughput"
            stroke="#0E7490"
            tintClass="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
            spark={series.net}
            value={v ? <CountUp value={v.netRx} format={fmtRate} /> : "—"}
            hint={v ? `↑ ${fmtRate(v.netTx)} outbound` : "—"}
          />
        )}

        {showIo && (
          <LiveCard
            compact={isCompact}
            icon={<Activity size={16} />}
            label="Disk I/O Rate"
            stroke="#2563EB"
            tintClass="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
            spark={series.io}
            value={v ? <CountUp value={v.rd} format={fmtRate} /> : "—"}
            hint={v ? `write ${fmtRate(v.wr)}` : "—"}
          />
        )}
      </div>
    </div>
  );
}
