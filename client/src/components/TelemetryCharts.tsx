import { useState } from "react";
import { AreaChart, BarChart2, Columns2, GitCommitVertical, Maximize2 } from "lucide-react";
import { fmtRate } from "../lib/format";
import { RANGES, type TelemetryRange } from "../hooks/useTelemetry";
import { TelemetryChart, type ChartDisplayMode } from "./TelemetryChart";
import type { RichPoint } from "../utils/telemetryFormat";

// Description line + the 15m/1h/6h/24h range switcher above the charts.
export function TelemetryRangeControls({
  range,
  onRange,
}: {
  range: TelemetryRange;
  onRange: (r: TelemetryRange) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-paper dark:bg-abyss border border-line dark:border-edge">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onRange(r)}
          aria-pressed={range === r}
          className={`px-3 py-1.5 rounded-lg font-mono text-[12px] cursor-pointer border transition-colors duration-150 ${
            range === r
              ? "bg-white dark:bg-panel text-ink dark:text-bone border-line dark:border-edge shadow-xs font-semibold"
              : "bg-transparent text-muted dark:text-fog border-transparent hover:text-ink dark:hover:text-bone"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

// CPU / memory / disk / network / disk-IO history charts with full-width responsive scaling,
// 1-column / 2-column layout switcher, multi-format switcher, and interactive hover tooltips.
export function TelemetryCharts({
  loading,
  hasPoints,
  rich,
}: {
  loading: boolean;
  hasPoints: boolean;
  rich: RichPoint[];
}) {
  const [chartMode, setChartMode] = useState<ChartDisplayMode>("area");
  const [columns, setColumns] = useState<1 | 2>(1); // 1 = 100% Full Width, 2 = 2-Column Split

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <p className="text-muted dark:text-fog text-[12.5px]">
          Interactive telemetry history: hover over lines to inspect point values.
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          {/* 1-Col Full Width vs 2-Col Split switcher */}
          <div className="inline-flex items-center bg-paper dark:bg-abyss border border-line dark:border-edge rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setColumns(1)}
              title="Full width (1 column)"
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                columns === 1
                  ? "bg-white dark:bg-panel text-ink dark:text-bone shadow-xs font-semibold"
                  : "text-muted dark:text-fog hover:text-ink dark:hover:text-bone"
              }`}
            >
              <Maximize2 size={11} />
              <span>Full Width</span>
            </button>
            <button
              type="button"
              onClick={() => setColumns(2)}
              title="Side-by-side (2 columns)"
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                columns === 2
                  ? "bg-white dark:bg-panel text-ink dark:text-bone shadow-xs font-semibold"
                  : "text-muted dark:text-fog hover:text-ink dark:hover:text-bone"
              }`}
            >
              <Columns2 size={11} />
              <span>2 Columns</span>
            </button>
          </div>

          {/* Chart presentation style switcher */}
          <div className="inline-flex items-center bg-paper dark:bg-abyss border border-line dark:border-edge rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setChartMode("area")}
              title="Area & Line representation"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                chartMode === "area"
                  ? "bg-white dark:bg-panel text-ink dark:text-bone shadow-xs font-semibold"
                  : "text-muted dark:text-fog hover:text-ink dark:hover:text-bone"
              }`}
            >
              <AreaChart size={12} />
              <span>Line</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode("bar")}
              title="Discrete column bars representation"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                chartMode === "bar"
                  ? "bg-white dark:bg-panel text-ink dark:text-bone shadow-xs font-semibold"
                  : "text-muted dark:text-fog hover:text-ink dark:hover:text-bone"
              }`}
            >
              <BarChart2 size={12} />
              <span>Bars</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode("step")}
              title="Stepped threshold line representation"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                chartMode === "step"
                  ? "bg-white dark:bg-panel text-ink dark:text-bone shadow-xs font-semibold"
                  : "text-muted dark:text-fog hover:text-ink dark:hover:text-bone"
              }`}
            >
              <GitCommitVertical size={12} />
              <span>Stepped</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-muted dark:text-fog text-[13px] py-8 text-center font-mono">
          Tuning the dials and loading telemetry data…
        </div>
      ) : !hasPoints ? (
        <div className="bg-paper dark:bg-abyss border border-line dark:border-edge rounded-xl px-4 py-8 text-center">
          <div className="font-head font-semibold mb-1">No readings yet</div>
          <div className="text-muted dark:text-fog text-[13px]">
            The sampler records every minute — check back shortly.
          </div>
        </div>
      ) : (
        <div className={columns === 1 ? "flex flex-col gap-5 w-full" : "grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 w-full"}>
          <TelemetryChart
            title="CPU Load"
            unit="load"
            points={rich}
            value={(p) => p.cpu}
            max={(v) => Math.max(100, ...v)}
            stroke="#EA580C"
            fill="#EA580C"
            format={(v) => `${v.toFixed(1)}%`}
            mode={chartMode}
          />
          <TelemetryChart
            title="Memory Usage"
            unit="used"
            points={rich}
            value={(p) => p.memPct}
            max={(v) => Math.max(100, ...v)}
            stroke="#16A34A"
            fill="#16A34A"
            format={(v) => `${v.toFixed(1)}%`}
            mode={chartMode}
          />
          <TelemetryChart
            title="Root Disk Space"
            unit="used"
            points={rich}
            value={(p) => p.diskPct}
            max={(v) => Math.max(100, ...v)}
            stroke="#D97706"
            fill="#D97706"
            format={(v) => `${v.toFixed(1)}%`}
            mode={chartMode}
          />
          <TelemetryChart
            title="Network Traffic"
            unit=""
            points={rich}
            value={(p) => p.rx}
            value2={(p) => p.tx}
            max={(v) => Math.max(...v, 1)}
            stroke="#0E7490"
            fill="#0E7490"
            stroke2="#7C3AED"
            fill2="#7C3AED"
            label2="out"
            format={fmtRate}
            mode={chartMode}
          />
          <TelemetryChart
            title="Disk I/O Throughput"
            unit=""
            points={rich}
            value={(p) => p.rd}
            value2={(p) => p.wr}
            max={(v) => Math.max(...v, 1)}
            stroke="#2563EB"
            fill="#2563EB"
            stroke2="#DB2777"
            fill2="#DB2777"
            label2="write"
            format={fmtRate}
            mode={chartMode}
          />
        </div>
      )}
    </div>
  );
}
