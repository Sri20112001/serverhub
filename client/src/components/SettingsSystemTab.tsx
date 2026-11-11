import { Link } from "react-router";
import {
  Activity,
  ArrowRight,
  Bell,
  Cpu,
  Gauge,
  HardDrive,
  LayoutGrid,
  Maximize2,
  MemoryStick,
  Minimize2,
  Network,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { Kicker } from "./ui/Kicker";
import { fmtUptime } from "../lib/format";
import type { SettingsController } from "../hooks/useSettings";
import {
  DEFAULT_TELEMETRY_PREFS,
  TELEMETRY_INTERVAL_OPTIONS,
  type TelemetryPrefs,
} from "../lib/telemetryPrefs";
import { useTelemetryPrefs } from "../hooks/useTelemetryPrefs";

// Tab 3: host parameters (API endpoint, Docker socket, uptime, census),
// interactive telemetry & live polling configuration, threshold alerting engine, and the version card.
export function SettingsSystemTab({ c }: { c: SettingsController }) {
  const info = c.info;
  const { prefs, updatePrefs } = useTelemetryPrefs();

  const handleIntervalChange = (val: number) => {
    updatePrefs({ pollIntervalMs: val });
    const opt = TELEMETRY_INTERVAL_OPTIONS.find((o) => o.value === val);
    c.pushToast(`Telemetry live polling updated to ${opt?.label ?? `${val / 1000}s`}.`);
  };

  const handleCardSizeChange = (size: "comfortable" | "compact") => {
    updatePrefs({ cardSize: size });
    c.pushToast(`Telemetry card size set to ${size === "comfortable" ? "Comfortable (Large)" : "Compact"}.`);
  };

  const toggleMetric = (key: keyof Pick<TelemetryPrefs, "showCpu" | "showMemory" | "showDisk" | "showNetwork" | "showIo">, label: string) => {
    const nextVal = !prefs[key];
    updatePrefs({ [key]: nextVal });
    c.pushToast(`${label} gauge ${nextVal ? "enabled" : "hidden"}.`);
  };

  const togglePauseOnBlur = () => {
    const nextVal = !prefs.pauseOnBlur;
    updatePrefs({ pauseOnBlur: nextVal });
    c.pushToast(nextVal ? "Background polling pause enabled." : "Background polling pause disabled.");
  };

  const toggleAlertsEnabled = () => {
    const nextVal = !prefs.alertsEnabled;
    updatePrefs({ alertsEnabled: nextVal });
    c.pushToast(nextVal ? "Threshold alerts enabled." : "Threshold alerts disabled.");
  };

  const handleThresholdChange = (
    key: "cpuThresholdWarning" | "cpuThresholdCritical" | "memThresholdWarning" | "memThresholdCritical" | "diskThresholdWarning" | "diskThresholdCritical",
    value: number
  ) => {
    const clamped = Math.max(1, Math.min(100, value));
    updatePrefs({ [key]: clamped });
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const res = await Notification.requestPermission();
      if (res === "granted") {
        updatePrefs({ browserNotifications: true });
        c.pushToast("Browser desktop notifications enabled!");
      } else {
        c.pushToast("Notification permission was not granted by browser", true);
      }
    } else {
      c.pushToast("Browser notifications not supported in this environment", true);
    }
  };

  const handleReset = () => {
    updatePrefs(DEFAULT_TELEMETRY_PREFS);
    c.pushToast("Telemetry preferences reset to defaults.");
  };

  const notificationPermission = typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";

  return (
    <div className="space-y-5">
      {/* 1. Host Parameters */}
      <section className="bg-white dark:bg-panel border border-line dark:border-edge rounded-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-ink dark:text-bone">Host Parameters</h2>
            <p className="text-muted dark:text-fog text-[13px]">Core runtime metrics and daemon routing points.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] bg-tint dark:bg-emboss border border-line dark:border-edge text-ink dark:text-bone rounded-md px-2 py-[3px] whitespace-nowrap">
            SERVERHUB · v2.0
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="bg-paper dark:bg-abyss border border-line dark:border-edge rounded-xl px-4 py-3.5">
            <Kicker>API Endpoint</Kicker>
            <div className="font-mono text-[13px] mt-1.5 truncate text-ink dark:text-bone font-medium">{c.apiUrl}</div>
          </div>
          <div className="bg-paper dark:bg-abyss border border-line dark:border-edge rounded-xl px-4 py-3.5">
            <div className="flex items-center justify-between gap-4">
              <Kicker>Docker Socket</Kicker>
              <span
                className={
                  info?.dockerAvailable
                    ? "w-2.5 h-2.5 rounded-full bg-moss shadow-[0_0_0_3px_rgba(22,163,74,0.18)]"
                    : "w-2.5 h-2.5 rounded-full bg-stone shadow-[0_0_0_3px_rgba(168,162,158,0.25)]"
                }
              />
            </div>
            <div className="font-mono text-[13px] mt-1.5 truncate text-ink dark:text-bone font-medium">
              {info ? (info.dockerAvailable ? "/var/run/docker.sock · live" : "unreachable") : "probing…"}
            </div>
          </div>
          <div className="bg-paper dark:bg-abyss border border-line dark:border-edge rounded-xl px-4 py-3.5">
            <Kicker>Uptime</Kicker>
            <div className="font-mono text-[13px] mt-1.5 text-ink dark:text-bone font-medium">{info ? fmtUptime(info.uptimeSec) : "—"}</div>
          </div>
          <div className="bg-paper dark:bg-abyss border border-line dark:border-edge rounded-xl px-4 py-3.5">
            <Kicker>Fleet Census</Kicker>
            <div className="font-mono text-[13px] mt-1.5 truncate text-ink dark:text-bone font-medium">
              {info
                ? `${info.projects} ships · ${info.services} stations · ${
                    info.runningContainers < 0 ? "?" : info.runningContainers
                  } running`
                : "—"}
            </div>
          </div>
        </div>

        <div className="bg-paper dark:bg-abyss border border-line dark:border-edge rounded-xl px-4 py-3.5 mt-4 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-ink dark:text-bone">Heartbeat interval</span>
          <span className="font-mono text-xs text-muted dark:text-fog">
            Every tick <strong className="font-mono text-ink dark:text-bone font-semibold">30s</strong>
          </span>
        </div>
      </section>

      {/* 2. Telemetry & Live Polling Preferences */}
      <section className="bg-white dark:bg-panel border border-line dark:border-edge rounded-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <Gauge size={18} className="text-accent dark:text-ember" />
              <h2 className="text-lg font-semibold text-ink dark:text-bone">Telemetry & Live Polling</h2>
            </div>
            <p className="text-muted dark:text-fog text-[13px] mt-0.5">
              Customize polling frequency, visual card dimensions, and active hardware counters.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-[11px] font-medium border border-line dark:border-edge text-muted dark:text-fog hover:text-ink dark:hover:text-bone transition-colors"
              title="Reset telemetry preferences to default"
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </button>
            <Link
              to="/telemetry"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-[11px] font-semibold bg-accent dark:bg-ember text-white dark:text-black hover:opacity-90 transition-opacity shadow-xs"
            >
              <span>View Telemetry</span>
              <ArrowRight size={11} />
            </Link>
          </div>
        </div>

        {/* Polling Cadence Selector */}
        <div className="bg-paper dark:bg-abyss border border-line dark:border-edge rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
            <Kicker>Live Polling Frequency</Kicker>
            <span className="font-mono text-xs text-moss font-semibold">
              Currently: {prefs.pollIntervalMs / 1000}s ({1000 / prefs.pollIntervalMs >= 1 ? `${(1000 / prefs.pollIntervalMs).toFixed(1)} Hz` : `${prefs.pollIntervalMs / 1000}s/sample`})
            </span>
          </div>
          <p className="text-[12px] text-muted dark:text-fog mb-3">
            Determines how frequently the host updates CPU, Memory, Disk, and Network readings from memory counters.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {TELEMETRY_INTERVAL_OPTIONS.map((opt) => {
              const active = prefs.pollIntervalMs === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleIntervalChange(opt.value)}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-lg border text-center transition-all ${
                    active
                      ? "bg-accent/10 dark:bg-ember/15 border-accent dark:border-ember text-accent dark:text-ember font-bold shadow-xs scale-[1.02]"
                      : "bg-white dark:bg-panel border-line dark:border-edge text-muted dark:text-fog hover:text-ink dark:hover:text-bone hover:border-accent/40"
                  }`}
                  title={opt.desc}
                >
                  <span className="font-mono text-[14px] leading-tight">{opt.label}</span>
                  <span className="text-[10px] opacity-75 mt-0.5 truncate max-w-full">
                    {opt.value === 3000 ? "Default" : opt.value < 3000 ? "Fast" : "Relaxed"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card Display Sizing */}
        <div className="bg-paper dark:bg-abyss border border-line dark:border-edge rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
            <Kicker>Telemetry Card Dimensions</Kicker>
            <span className="font-mono text-xs text-ink dark:text-bone font-medium">
              {prefs.cardSize === "comfortable" ? "Comfortable (Large)" : "Compact"}
            </span>
          </div>
          <p className="text-[12px] text-muted dark:text-fog mb-3">
            Choose whether telemetry gauge cards render in expanded spacious format with large waveforms or compact tiles.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleCardSizeChange("comfortable")}
              className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                prefs.cardSize === "comfortable"
                  ? "bg-accent/10 dark:bg-ember/15 border-accent dark:border-ember text-ink dark:text-bone font-medium shadow-xs"
                  : "bg-white dark:bg-panel border-line dark:border-edge text-muted dark:text-fog hover:text-ink dark:hover:text-bone"
              }`}
            >
              <div className="p-2 rounded-lg bg-accent/20 dark:bg-ember/25 text-accent dark:text-ember shrink-0">
                <Maximize2 size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-ink dark:text-bone">Large & Spacious (Comfortable)</div>
                <div className="text-[11.5px] text-muted dark:text-fog mt-0.5">
                  Extra padding, large metric typography (28px+), branded badges, and tall 48px waveform sparklines.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleCardSizeChange("compact")}
              className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                prefs.cardSize === "compact"
                  ? "bg-accent/10 dark:bg-ember/15 border-accent dark:border-ember text-ink dark:text-bone font-medium shadow-xs"
                  : "bg-white dark:bg-panel border-line dark:border-edge text-muted dark:text-fog hover:text-ink dark:hover:text-bone"
              }`}
            >
              <div className="p-2 rounded-lg bg-tint dark:bg-emboss text-muted dark:text-fog shrink-0">
                <Minimize2 size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-ink dark:text-bone">Compact</div>
                <div className="text-[11.5px] text-muted dark:text-fog mt-0.5">
                  Dense tile layout with minimal padding, saving vertical room on laptops and smaller viewports.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Individual Metrics Toggles */}
        <div className="bg-paper dark:bg-abyss border border-line dark:border-edge rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <Kicker>Active Telemetry Data Streams</Kicker>
            <LayoutGrid size={13} className="text-muted dark:text-fog" />
          </div>
          <p className="text-[12px] text-muted dark:text-fog mb-3">
            Select which hardware sensors and gauges are rendered on the live telemetry dashboard:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => toggleMetric("showCpu", "CPU Utilization")}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-colors ${
                prefs.showCpu
                  ? "bg-white dark:bg-panel border-orange-500/40 text-ink dark:text-bone"
                  : "bg-paper/60 dark:bg-abyss/60 border-line dark:border-edge text-muted dark:text-fog opacity-60"
              }`}
            >
              <div className="flex items-center gap-2">
                <Cpu size={15} className="text-orange-500" />
                <span className="text-[12px] font-medium">CPU Utilization</span>
              </div>
              <span className={`w-2 h-2 rounded-full ${prefs.showCpu ? "bg-moss" : "bg-stone"}`} />
            </button>

            <button
              type="button"
              onClick={() => toggleMetric("showMemory", "Memory (RAM)")}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-colors ${
                prefs.showMemory
                  ? "bg-white dark:bg-panel border-emerald-500/40 text-ink dark:text-bone"
                  : "bg-paper/60 dark:bg-abyss/60 border-line dark:border-edge text-muted dark:text-fog opacity-60"
              }`}
            >
              <div className="flex items-center gap-2">
                <MemoryStick size={15} className="text-emerald-500" />
                <span className="text-[12px] font-medium">Memory (RAM)</span>
              </div>
              <span className={`w-2 h-2 rounded-full ${prefs.showMemory ? "bg-moss" : "bg-stone"}`} />
            </button>

            <button
              type="button"
              onClick={() => toggleMetric("showDisk", "Root Disk Space")}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-colors ${
                prefs.showDisk
                  ? "bg-white dark:bg-panel border-amber-500/40 text-ink dark:text-bone"
                  : "bg-paper/60 dark:bg-abyss/60 border-line dark:border-edge text-muted dark:text-fog opacity-60"
              }`}
            >
              <div className="flex items-center gap-2">
                <HardDrive size={15} className="text-amber-500" />
                <span className="text-[12px] font-medium">Root Disk Space</span>
              </div>
              <span className={`w-2 h-2 rounded-full ${prefs.showDisk ? "bg-moss" : "bg-stone"}`} />
            </button>

            <button
              type="button"
              onClick={() => toggleMetric("showNetwork", "Network Throughput")}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-colors ${
                prefs.showNetwork
                  ? "bg-white dark:bg-panel border-cyan-500/40 text-ink dark:text-bone"
                  : "bg-paper/60 dark:bg-abyss/60 border-line dark:border-edge text-muted dark:text-fog opacity-60"
              }`}
            >
              <div className="flex items-center gap-2">
                <Network size={15} className="text-cyan-500" />
                <span className="text-[12px] font-medium">Network Throughput</span>
              </div>
              <span className={`w-2 h-2 rounded-full ${prefs.showNetwork ? "bg-moss" : "bg-stone"}`} />
            </button>

            <button
              type="button"
              onClick={() => toggleMetric("showIo", "Disk I/O Rate")}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-colors ${
                prefs.showIo
                  ? "bg-white dark:bg-panel border-blue-500/40 text-ink dark:text-bone"
                  : "bg-paper/60 dark:bg-abyss/60 border-line dark:border-edge text-muted dark:text-fog opacity-60"
              }`}
            >
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-blue-500" />
                <span className="text-[12px] font-medium">Disk I/O Rate</span>
              </div>
              <span className={`w-2 h-2 rounded-full ${prefs.showIo ? "bg-moss" : "bg-stone"}`} />
            </button>
          </div>
        </div>

        {/* 3. Host Threshold Alerting Engine */}
        <div className="bg-paper dark:bg-abyss border border-line dark:border-edge rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-accent dark:text-ember" />
              <Kicker>Host Threshold Alerting Engine</Kicker>
            </div>
            <button
              type="button"
              onClick={toggleAlertsEnabled}
              className={`px-3 py-1 rounded-md font-mono text-[11px] font-semibold border transition-colors ${
                prefs.alertsEnabled
                  ? "bg-moss/10 border-moss/40 text-moss"
                  : "bg-stone/10 border-stone/40 text-muted dark:text-fog"
              }`}
            >
              {prefs.alertsEnabled ? "ACTIVE" : "PAUSED"}
            </button>
          </div>
          <p className="text-[12px] text-muted dark:text-fog mb-3.5">
            Continuously monitors live CPU, Memory, and Root Disk levels against Warning and Critical thresholds:
          </p>

          <div className="space-y-3">
            {/* CPU Thresholds */}
            <div className="bg-white dark:bg-panel border border-line dark:border-edge rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-[130px]">
                <Cpu size={15} className="text-orange-500" />
                <span className="text-xs font-semibold text-ink dark:text-bone">CPU Utilization</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Warning:</span>
                  <input
                    type="number"
                    min="10"
                    max="99"
                    value={prefs.cpuThresholdWarning}
                    onChange={(e) => handleThresholdChange("cpuThresholdWarning", Number(e.target.value))}
                    className="w-14 px-2 py-0.5 text-right font-mono text-xs rounded border border-line dark:border-edge bg-paper dark:bg-abyss text-ink dark:text-bone focus:outline-none focus:border-accent"
                  />
                  <span>%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-brick font-medium">Critical:</span>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={prefs.cpuThresholdCritical}
                    onChange={(e) => handleThresholdChange("cpuThresholdCritical", Number(e.target.value))}
                    className="w-14 px-2 py-0.5 text-right font-mono text-xs rounded border border-line dark:border-edge bg-paper dark:bg-abyss text-ink dark:text-bone focus:outline-none focus:border-accent"
                  />
                  <span>%</span>
                </div>
              </div>
            </div>

            {/* Memory Thresholds */}
            <div className="bg-white dark:bg-panel border border-line dark:border-edge rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-[130px]">
                <MemoryStick size={15} className="text-emerald-500" />
                <span className="text-xs font-semibold text-ink dark:text-bone">Memory (RAM)</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Warning:</span>
                  <input
                    type="number"
                    min="10"
                    max="99"
                    value={prefs.memThresholdWarning}
                    onChange={(e) => handleThresholdChange("memThresholdWarning", Number(e.target.value))}
                    className="w-14 px-2 py-0.5 text-right font-mono text-xs rounded border border-line dark:border-edge bg-paper dark:bg-abyss text-ink dark:text-bone focus:outline-none focus:border-accent"
                  />
                  <span>%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-brick font-medium">Critical:</span>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={prefs.memThresholdCritical}
                    onChange={(e) => handleThresholdChange("memThresholdCritical", Number(e.target.value))}
                    className="w-14 px-2 py-0.5 text-right font-mono text-xs rounded border border-line dark:border-edge bg-paper dark:bg-abyss text-ink dark:text-bone focus:outline-none focus:border-accent"
                  />
                  <span>%</span>
                </div>
              </div>
            </div>

            {/* Root Disk Thresholds */}
            <div className="bg-white dark:bg-panel border border-line dark:border-edge rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-[130px]">
                <HardDrive size={15} className="text-amber-500" />
                <span className="text-xs font-semibold text-ink dark:text-bone">Root Disk Space</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Warning:</span>
                  <input
                    type="number"
                    min="10"
                    max="99"
                    value={prefs.diskThresholdWarning}
                    onChange={(e) => handleThresholdChange("diskThresholdWarning", Number(e.target.value))}
                    className="w-14 px-2 py-0.5 text-right font-mono text-xs rounded border border-line dark:border-edge bg-paper dark:bg-abyss text-ink dark:text-bone focus:outline-none focus:border-accent"
                  />
                  <span>%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-brick font-medium">Critical:</span>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={prefs.diskThresholdCritical}
                    onChange={(e) => handleThresholdChange("diskThresholdCritical", Number(e.target.value))}
                    className="w-14 px-2 py-0.5 text-right font-mono text-xs rounded border border-line dark:border-edge bg-paper dark:bg-abyss text-ink dark:text-bone focus:outline-none focus:border-accent"
                  />
                  <span>%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Browser Desktop Notification Trigger */}
          <div className="mt-3.5 pt-3 border-t border-line dark:border-edge flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-muted dark:text-fog" />
              <div>
                <span className="text-xs font-medium text-ink dark:text-bone">
                  Browser Desktop Notifications
                </span>
                <span className="block text-[11px] text-muted dark:text-fog">
                  Status: <strong className="font-mono">{notificationPermission}</strong>
                </span>
              </div>
            </div>

            {notificationPermission === "granted" ? (
              <button
                type="button"
                onClick={() => {
                  const nextVal = !prefs.browserNotifications;
                  updatePrefs({ browserNotifications: nextVal });
                  c.pushToast(nextVal ? "Browser notifications enabled." : "Browser notifications disabled.");
                }}
                className={`px-3 py-1.5 rounded-md font-mono text-xs font-semibold border transition-colors ${
                  prefs.browserNotifications
                    ? "bg-moss/10 border-moss/40 text-moss"
                    : "bg-stone/10 border-stone/40 text-muted"
                }`}
              >
                {prefs.browserNotifications ? "ENABLED" : "DISABLED"}
              </button>
            ) : (
              <button
                type="button"
                onClick={requestNotificationPermission}
                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-accent dark:bg-ember text-white dark:text-black hover:opacity-90 transition-opacity"
              >
                Enable Desktop Alerts
              </button>
            )}
          </div>
        </div>

        {/* Tab Background Power Saving */}
        <div className="bg-paper dark:bg-abyss border border-line dark:border-edge rounded-xl px-4 py-3.5 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[13px] font-medium text-ink dark:text-bone">
              Pause live polling when tab is hidden
            </div>
            <div className="text-xs text-muted dark:text-fog">
              Suspends timer when browser tab is inactive to minimize CPU cycles and network overhead.
            </div>
          </div>
          <button
            type="button"
            onClick={togglePauseOnBlur}
            className={`px-3 py-1.5 rounded-md font-mono text-xs font-semibold border transition-colors ${
              prefs.pauseOnBlur
                ? "bg-moss/10 border-moss/40 text-moss"
                : "bg-stone/10 border-stone/40 text-muted dark:text-fog"
            }`}
          >
            {prefs.pauseOnBlur ? "ENABLED" : "DISABLED"}
          </button>
        </div>
      </section>

      {/* 4. Footer version card */}
      <section className="bg-white dark:bg-panel border border-line dark:border-edge rounded-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] bg-tint dark:bg-emboss border border-line dark:border-edge text-ink dark:text-bone rounded-md px-2 py-[3px] whitespace-nowrap">
              v2.0
            </span>
            <span className="font-mono text-xs text-muted dark:text-fog flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-moss shadow-[0_0_0_3px_rgba(22,163,74,0.18)]" />
              Bridge manned
            </span>
          </div>
          <em className="text-muted dark:text-fog text-[13px] not-italic">Self-hosted container & server orchestrator.</em>
        </div>
      </section>
    </div>
  );
}
