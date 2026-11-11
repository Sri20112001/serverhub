import type { ReactNode } from "react";

// Titled block with an icon chip. Sections are the unit of the telemetry page:
// each one carries a lucide icon so the eye can find "memory" or "storage"
// without reading the label.
export function TelemetrySection({
  icon,
  title,
  meta,
  children,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          {icon && (
            <span className="w-6 h-6 shrink-0 rounded-md bg-accent/10 dark:bg-ember/10 text-accent dark:text-ember flex items-center justify-center">
              {icon}
            </span>
          )}
          <div className="text-[11px] font-semibold tracking-[0.08em] uppercase text-muted dark:text-fog truncate">
            {title}
          </div>
        </div>
        {meta && (
          <div className="font-mono text-[11px] text-muted dark:text-fog whitespace-nowrap">
            {meta}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

// Dense label/value row with a dotted leader. Replaces the old boxed tiles:
// eight facts fit in four lines instead of four 64px cards.
export function SpecRow({
  label,
  value,
  title,
  className = "",
}: {
  label: string;
  value: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-baseline gap-2 py-[5px] min-w-0 ${className}`}>
      <span className="text-[11px] font-medium tracking-[0.05em] uppercase text-muted dark:text-fog whitespace-nowrap">
        {label}
      </span>
      <span
        className="flex-1 min-w-3 border-b border-dotted border-line dark:border-edge translate-y-[-2px]"
        aria-hidden="true"
      />
      <span
        className="font-mono text-[12px] text-ink dark:text-bone text-right min-w-0 truncate"
        title={title}
      >
        {value}
      </span>
    </div>
  );
}

// Two columns of rows from sm up — the densest fact layout that still reads
// top-to-bottom.
export function SpecGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7">{children}</div>;
}

// Thin usage meter. `tone` is a Tailwind background utility (bg-moss, …).
export function Meter({
  pct,
  tone = "bg-accent dark:bg-ember",
  className = "",
}: {
  pct: number;
  tone?: string;
  className?: string;
}) {
  const width = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return (
    <div
      className={`h-1.5 rounded-full bg-paper dark:bg-abyss border border-line dark:border-edge overflow-hidden ${className}`}
      role="meter"
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
    </div>
  );
}

// Compact labelled fact tile for backward compatibility and compact stat panels
export function Fact({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="bg-paper dark:bg-abyss border border-line dark:border-edge rounded-lg px-3 py-2">
      <div className="text-[10px] font-semibold tracking-[0.08em] uppercase text-muted dark:text-fog truncate">
        {label}
      </div>
      <div className={`text-[12px] font-medium mt-1 truncate ${mono === false ? "" : "font-mono"}`}>
        {value}
      </div>
    </div>
  );
}
