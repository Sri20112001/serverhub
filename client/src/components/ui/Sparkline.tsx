// Axis-free sparkline for the live rail and telemetry cards. Redraws on every poll,
// carrying no heavy entry animation so it stays smooth across intervals.
export function Sparkline({
  values,
  stroke,
  max,
  height = 48,
  className = "",
}: {
  values: number[];
  stroke: string;
  // Floor for the scale: keeps a 2% trace from filling the whole tile.
  max?: number;
  height?: number;
  className?: string;
}) {
  const W = 160;
  const H = height;
  if (values.length < 2) {
    return <svg viewBox={`0 0 ${W} ${H}`} className={`w-full ${className}`} aria-hidden="true" />;
  }
  const hi = Math.max(max ?? 0, ...values, 1e-6);
  const step = W / (values.length - 1);
  const pts = values
    .map((v, i) => {
      const x = Math.round(i * step);
      const y = Math.round(H - 4 - (Math.min(v, hi) / hi) * (H - 8));
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`w-full ${className}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill={stroke} opacity="0.14" />
      <polyline
        points={pts}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
