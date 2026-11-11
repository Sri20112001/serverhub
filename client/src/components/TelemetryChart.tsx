import { useId, useMemo, useRef, useState, type MouseEvent } from "react";
import { Kicker } from "./ui/Kicker";
import { CountUp } from "./ui/CountUp";
import { fmtTime, type RichPoint } from "../utils/telemetryFormat";

export type ChartDisplayMode = "area" | "bar" | "step";

// Interactive telemetry history chart with:
// 1. Full-width responsive edge-to-edge SVG scaling (preserveAspectRatio="none")
// 2. Crosshair cursor tracking and crisp HTML hover tooltip
// 3. Multi-mode rendering (Area line, Discrete Bar columns, Stepped threshold)
// 4. Min / Avg / Max statistical summary ribbon
export function TelemetryChart({
  title,
  unit,
  points,
  value,
  value2,
  max,
  stroke,
  fill,
  stroke2,
  fill2,
  label2,
  format,
  mode = "area",
}: {
  title: string;
  unit: string;
  points: RichPoint[];
  value: (p: RichPoint) => number;
  value2?: (p: RichPoint) => number;
  max: (vals: number[]) => number;
  stroke: string;
  fill: string;
  stroke2?: string;
  fill2?: string;
  label2?: string;
  format: (v: number) => string;
  mode?: ChartDisplayMode;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gradientId = useId();
  const gradientId2 = useId();

  const W = 600;
  const H = 120;

  const vals = useMemo(() => points.map(value), [points, value]);
  const vals2 = useMemo(() => (value2 ? points.map(value2) : null), [points, value2]);

  const hi = useMemo(() => {
    return Math.max(max(vals), ...vals, ...(vals2 ?? []), 1);
  }, [max, vals, vals2]);

  const step = points.length > 1 ? W / (points.length - 1) : 0;

  // Statistics
  const stats = useMemo(() => {
    if (!vals.length) return null;
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const avgVal = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { minVal, maxVal, avgVal };
  }, [vals]);

  // Points to coordinates
  const getY = (v: number) => Math.round(H - 10 - (Math.min(v, hi) / hi) * (H - 24));

  const toAreaLine = (vs: number[]) =>
    vs.map((v, i) => `${Math.round(i * step)},${getY(v)}`).join(" ");

  const toStepLine = (vs: number[]) => {
    if (vs.length < 2) return toAreaLine(vs);
    const pts: string[] = [];
    vs.forEach((v, i) => {
      const x = Math.round(i * step);
      const y = getY(v);
      if (i === 0) {
        pts.push(`${x},${y}`);
      } else {
        pts.push(`${x},${getY(vs[i - 1])}`);
        pts.push(`${x},${y}`);
      }
    });
    return pts.join(" ");
  };

  const line = mode === "step" ? toStepLine(vals) : toAreaLine(vals);
  const line2 = vals2 ? (mode === "step" ? toStepLine(vals2) : toAreaLine(vals2)) : null;

  const last = vals.length ? vals[vals.length - 1] : 0;
  const last2 = vals2 && vals2.length ? vals2[vals2.length - 1] : 0;

  // Handle mouse move to calculate hovered point
  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const idx = Math.round(pct * (points.length - 1));
    setHoverIndex(idx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const hoveredPoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;
  const hoveredVal = hoverIndex !== null && vals[hoverIndex] !== undefined ? vals[hoverIndex] : null;
  const hoveredVal2 =
    hoverIndex !== null && vals2 && vals2[hoverIndex] !== undefined ? vals2[hoverIndex] : null;

  const hoverX = hoverIndex !== null ? Math.round(hoverIndex * step) : 0;
  const hoverY1 = hoveredVal !== null ? getY(hoveredVal) : 0;
  const hoverY2 = hoveredVal2 !== null ? getY(hoveredVal2) : 0;

  return (
    <div className="bg-white dark:bg-panel border border-line dark:border-edge rounded-card p-4 sm:p-5 min-w-0 w-full flex flex-col justify-between">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <Kicker>{title}</Kicker>
        <div className="font-mono text-[13px] text-right">
          {hoveredVal !== null ? (
            <span className="text-accent dark:text-ember font-semibold flex items-center gap-1">
              <span>{format(hoveredVal)}</span>
              {label2 && hoveredVal2 !== null ? (
                <span className="text-muted dark:text-fog font-normal text-[11px]">
                  {" / "}
                  {format(hoveredVal2)} {label2}
                </span>
              ) : (
                <span className="text-muted dark:text-fog font-normal text-[11px]"> {unit}</span>
              )}
              {hoveredPoint && (
                <span className="text-[10px] text-muted dark:text-fog font-mono ml-1 font-normal opacity-75">
                  @{fmtTime(hoveredPoint.ts)}
                </span>
              )}
            </span>
          ) : (
            <>
              <CountUp value={last} format={format} />
              {label2 && vals2 ? (
                <span className="text-muted dark:text-fog text-[11px]">
                  {" / "}
                  <CountUp value={last2} format={format} /> {label2}
                </span>
              ) : (
                <span className="text-muted dark:text-fog text-[11px]"> {unit}</span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="relative w-full">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full h-44 sm:h-52 bg-paper dark:bg-abyss border border-line dark:border-edge rounded-xl cursor-crosshair select-none block overflow-visible shadow-2xs"
          role="img"
          aria-label={`${title} history chart`}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fill} stopOpacity="0.35" />
              <stop offset="100%" stopColor={fill} stopOpacity="0.02" />
            </linearGradient>
            {fill2 && (
              <linearGradient id={gradientId2} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={fill2} stopOpacity="0.3" />
                <stop offset="100%" stopColor={fill2} stopOpacity="0.02" />
              </linearGradient>
            )}
          </defs>

          {/* Grid reference lines */}
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1="0"
              x2={W}
              y1={H * f}
              y2={H * f}
              className="stroke-line dark:stroke-edge"
              strokeWidth="1"
            />
          ))}

          {/* Bar mode rendering */}
          {mode === "bar" && (
            <g>
              {vals.map((v, i) => {
                const x = Math.round(i * step);
                const barW = Math.max(2, Math.round(step * 0.75));
                const y = getY(v);
                const barH = Math.max(1, H - 10 - y);
                return (
                  <rect
                    key={i}
                    x={x - barW / 2}
                    y={y}
                    width={barW}
                    height={barH}
                    fill={stroke}
                    opacity={hoverIndex === i ? "1" : "0.75"}
                    rx="1"
                  />
                );
              })}
            </g>
          )}

          {/* Area / Line mode rendering */}
          {mode !== "bar" && (
            <>
              <polygon
                className="chart-area transition-all"
                points={`0,${H} ${line} ${W},${H}`}
                fill={`url(#${gradientId})`}
              />
              {line2 && stroke2 && fill2 && (
                <polygon
                  className="chart-area transition-all"
                  points={`0,${H} ${line2} ${W},${H}`}
                  fill={`url(#${gradientId2})`}
                />
              )}
              <polyline
                className="chart-line"
                points={line}
                fill="none"
                stroke={stroke}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {line2 && stroke2 && (
                <polyline
                  className="chart-line"
                  points={line2}
                  fill="none"
                  stroke={stroke2}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
            </>
          )}

          {/* Interactive crosshair and dots */}
          {hoverIndex !== null && hoveredPoint && (
            <g className="pointer-events-none">
              <line
                x1={hoverX}
                y1="0"
                x2={hoverX}
                y2={H}
                stroke="currentColor"
                strokeDasharray="2 2"
                className="text-ink dark:text-bone opacity-40"
                strokeWidth="1.2"
              />
              <circle
                cx={hoverX}
                cy={hoverY1}
                r="4.5"
                fill={stroke}
                stroke="#ffffff"
                strokeWidth="1.5"
                className="drop-shadow-sm"
              />
              {hoveredVal2 !== null && stroke2 && (
                <circle
                  cx={hoverX}
                  cy={hoverY2}
                  r="4.5"
                  fill={stroke2}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="drop-shadow-sm"
                />
              )}
            </g>
          )}
        </svg>

        {/* Floating HTML Tooltip overlay */}
        {hoverIndex !== null && hoveredPoint && (
          <div
            className="pointer-events-none absolute z-20 px-3 py-1.5 rounded-lg bg-ink dark:bg-bone text-paper dark:text-abyss text-[11px] font-mono shadow-lg border border-line/20 whitespace-nowrap"
            style={{
              left: `${(hoverIndex / Math.max(1, points.length - 1)) * 100}%`,
              top: "12px",
              transform: hoverIndex > (points.length / 2) ? "translateX(-105%)" : "translateX(10px)",
            }}
          >
            <div className="text-[10px] opacity-75">{fmtTime(hoveredPoint.ts)}</div>
            <div className="font-semibold flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: stroke }} />
              <span>{format(hoveredVal ?? 0)}</span>
            </div>
            {hoveredVal2 !== null && (
              <div className="font-semibold flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: stroke2 ?? stroke }} />
                <span>{format(hoveredVal2)} {label2}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Statistical summary footer */}
      {stats && (
        <div className="flex items-center justify-between text-[11px] font-mono text-muted dark:text-fog border-t border-line dark:border-edge mt-3 pt-2.5">
          <span>
            min <strong className="text-ink dark:text-bone font-medium">{format(stats.minVal)}</strong>
          </span>
          <span>
            avg <strong className="text-ink dark:text-bone font-medium">{format(stats.avgVal)}</strong>
          </span>
          <span>
            max <strong className="text-ink dark:text-bone font-medium">{format(stats.maxVal)}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
