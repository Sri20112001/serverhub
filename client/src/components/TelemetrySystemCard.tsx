import {
  Cpu,
  MemoryStick,
  Server,
} from "lucide-react";
import { Meter, SpecGrid, SpecRow, TelemetrySection } from "./TelemetrySection";
import { OsIcon } from "./ui/OsIcon";
import { detectOs } from "../utils/osDetect";
import { fmtUptime } from "../lib/format";
import { fmtSize } from "../utils/telemetryFormat";
import type { ServerDetail } from "../lib/types/host";

function PressureChip({ label, level }: { label: string; level: string }) {
  const dot =
    level === "High" ? "bg-brick" : level === "Elevated" ? "bg-status-amber" : "bg-moss";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-line dark:border-edge bg-paper dark:bg-abyss px-2 py-1">
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-muted dark:text-fog">
        {label}
      </span>
      <span className="font-mono text-[11px] text-ink dark:text-bone">{level}</span>
    </span>
  );
}

// Host identity, processor and memory in one card: a dense spec sheet instead
// of the old grid of eleven boxed tiles. Covers all OS and distribution variants
// with their official icons and brand accents.
export function TelemetrySystemCard({ detail }: { detail: ServerDetail }) {
  const { host, cpu, memory } = detail;
  const { meta } = detectOs(host.os, host.platform);
  const label = [meta.name, host.platformVersion].filter(Boolean).join(" ");

  const cpuLegend = [
    ["user", cpu.timesUserPct, "bg-accent dark:bg-ember"],
    ["sys", cpu.timesSysPct, "bg-moss"],
    ["iowait", cpu.timesIowaitPct, "bg-status-amber"],
  ] as const;

  return (
    <div className="bg-white dark:bg-panel border border-line dark:border-edge rounded-2xl p-5 sm:p-6 shadow-xs">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 shrink-0 rounded-lg bg-paper dark:bg-abyss border border-line dark:border-edge flex items-center justify-center p-2 shadow-xs">
            <OsIcon os={host.os} platform={host.platform} size={22} />
          </span>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-ink dark:text-bone truncate" title={label}>
              {label || "Unknown OS"} <span className="text-muted dark:text-fog font-normal">· {host.arch || "—"}</span>
            </div>
            <div className="font-mono text-[11px] text-muted dark:text-fog truncate">
              <Server size={10} className="inline-block mr-1 -mt-[2px]" aria-hidden="true" />
              {host.hostname || "—"} · kernel {host.kernel || "—"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {host.virtualization && (
            <span className="inline-flex items-center rounded-md border border-line dark:border-edge px-2 py-1 font-mono text-[10.5px] text-muted dark:text-fog">
              {host.virtualization}
            </span>
          )}
          <span className="inline-flex items-center rounded-md border border-line dark:border-edge px-2 py-1 font-mono text-[10.5px] text-muted dark:text-fog">
            up {fmtUptime(host.uptimeSec)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mt-3">
        <PressureChip label="CPU" level={detail.pressure.cpu} />
        <PressureChip label="Memory" level={detail.pressure.memory} />
        <PressureChip label="Disk" level={detail.pressure.disk} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5 mt-4 pt-4 border-t border-line dark:border-edge">
        <TelemetrySection
          icon={<Cpu size={13} />}
          title="Processor"
          meta={`${cpu.logicalCores || "?"} threads`}
        >
          <div
            className="font-mono text-[11px] text-muted dark:text-fog truncate mt-0.5 mb-1"
            title={cpu.model}
          >
            {cpu.model || "unknown processor"}
          </div>
          <SpecGrid>
            <SpecRow label="Physical" value={`${cpu.physicalCores || "?"} cores`} />
            <SpecRow label="Clock" value={`${((cpu.mhz || 0) / 1000).toFixed(2)} GHz`} />
            <SpecRow label="Load 1m" value={cpu.load1.toFixed(2)} />
            <SpecRow
              label="Load 5/15m"
              value={`${cpu.load5.toFixed(2)} / ${cpu.load15.toFixed(2)}`}
            />
          </SpecGrid>

          <div className="flex h-1.5 rounded-full overflow-hidden bg-paper dark:bg-abyss border border-line dark:border-edge mt-2.5">
            {cpuLegend.map(([name, pct, tone]) => (
              <span
                key={name}
                className={tone}
                style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                title={`${name} ${pct.toFixed(1)}%`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap font-mono text-[10.5px] text-muted dark:text-fog mt-1">
            {cpuLegend.map(([name, pct]) => (
              <span key={name}>
                {name} {pct.toFixed(1)}%
              </span>
            ))}
            <span>idle {cpu.timesIdlePct.toFixed(1)}%</span>
          </div>
        </TelemetrySection>

        <TelemetrySection
          icon={<MemoryStick size={13} />}
          title="Memory"
          meta={`${memory.usedPct.toFixed(1)}% used`}
        >
          <div className="mt-1.5">
            <Meter
              pct={memory.usedPct}
              tone={
                memory.usedPct >= 90
                  ? "bg-brick"
                  : memory.usedPct >= 70
                    ? "bg-status-amber"
                    : "bg-moss"
              }
            />
          </div>
          <SpecGrid>
            <SpecRow label="Total" value={fmtSize(memory.totalMB)} />
            <SpecRow label="Used" value={fmtSize(memory.usedMB)} />
            <SpecRow label="Available" value={fmtSize(memory.availableMB)} />
            <SpecRow label="Free" value={fmtSize(memory.freeMB)} />
            <SpecRow
              label="Cache+buf"
              value={fmtSize(memory.cachedMB + memory.buffersMB)}
            />
            <SpecRow
              label="Swap"
              value={
                memory.swapTotalMB > 0
                  ? (
                      <span>
                        {fmtSize(memory.swapUsedMB)} / {fmtSize(memory.swapTotalMB)}
                        <span className="text-muted dark:text-fog"> · {memory.swapPct.toFixed(0)}%</span>
                      </span>
                    )
                  : "none"
              }
            />
          </SpecGrid>
        </TelemetrySection>
      </div>
    </div>
  );
}
