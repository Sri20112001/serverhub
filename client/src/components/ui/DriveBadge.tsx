import { Disc, HardDrive, Zap } from "lucide-react";

// Drive kind chips: NVMe and SSD are flash (same class of hardware, different
// bus), HDD is spinning. The label is always printed so the distinction never
// depends on colour alone.
const KINDS: Record<
  string,
  { label: string; Icon: typeof HardDrive; tone: string }
> = {
  nvme: {
    label: "NVMe",
    Icon: Zap,
    tone: "border-accent/35 bg-accent/5 text-accent-deep dark:bg-ember/10 dark:text-ember dark:border-ember/35",
  },
  ssd: {
    label: "SSD",
    Icon: HardDrive,
    tone: "border-moss/35 bg-moss/5 text-moss dark:border-moss/35 dark:text-moss",
  },
  hdd: {
    label: "HDD",
    Icon: Disc,
    tone: "border-line bg-paper text-muted dark:border-edge dark:bg-abyss dark:text-fog",
  },
};

export function DriveBadge({
  kind,
  className = "",
}: {
  kind?: string;
  className?: string;
}) {
  const entry = kind ? KINDS[kind] : undefined;
  if (!entry) return null;
  const { Icon, label, tone } = entry;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-[1px] text-[10px] font-semibold tracking-[0.04em] uppercase whitespace-nowrap ${tone} ${className}`}
      title={`Physical media: ${label}`}
    >
      <Icon size={10} aria-hidden="true" />
      {label}
    </span>
  );
}
