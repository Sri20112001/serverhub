import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Cpu, Server, HardDrive, Network, Play, Pause } from "lucide-react-native";
import { Sparkline } from "./Sparkline";
import type { LiveReading } from "../types/telemetry";
import { colors } from "../theme/colors";

interface TelemetryLiveRailProps {
  current: LiveReading | null;
  history: {
    cpu: number[];
    mem: number[];
    disk: number[];
    net: number[];
  };
  pollingIntervalMs: number;
  onSetPollingInterval: (ms: number) => void;
}

function formatSpeed(bytesPerSec?: number): string {
  if (bytesPerSec === undefined || bytesPerSec === null || isNaN(bytesPerSec)) {
    return "0 B/s";
  }
  const b = Math.round(bytesPerSec);
  if (b < 1024) return `${b} B/s`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB/s`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB/s`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB/s`;
}

export function TelemetryLiveRail({
  current,
  history,
  pollingIntervalMs,
  onSetPollingInterval,
}: TelemetryLiveRailProps) {
  const isPaused = pollingIntervalMs === 0;

  const cpuPct = current ? Math.round(current.cpuPercent) : 0;
  const memPct = current ? Math.round(current.memPercent) : 0;
  const diskPct = current ? Math.round(current.diskPercent) : 0;

  const memUsedGB = current ? (current.memUsedMB / 1024).toFixed(1) : "0";
  const memTotalGB = current ? (current.memTotalMB / 1024).toFixed(1) : "0";

  const diskUsedGB = current ? current.diskUsedGB.toFixed(0) : "0";
  const diskTotalGB = current ? current.diskTotalGB.toFixed(0) : "0";

  const rxFormatted = formatSpeed(current?.rxSpeedBps);
  const txFormatted = formatSpeed(current?.txSpeedBps);

  // Status colors based on thresholds
  const getBadgeColor = (val: number) => {
    if (val >= 90) return { text: "text-rose-400", bg: "bg-rose-500/15", border: "border-rose-500/30", dot: "bg-rose-500" };
    if (val >= 80) return { text: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/30", dot: "bg-amber-500" };
    return { text: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/30", dot: "bg-emerald-500" };
  };

  const cpuStatus = getBadgeColor(cpuPct);
  const memStatus = getBadgeColor(memPct);
  const diskStatus = getBadgeColor(diskPct);

  return (
    <View className="mb-4">
      {/* Header controls: Polling Cadence Selector */}
      <View className="flex-row items-center justify-between mb-3 px-1">
        <View className="flex-row items-center gap-1.5">
          <View className={`w-2 h-2 rounded-full ${isPaused ? "bg-zinc-500" : "bg-emerald-400 animate-pulse"}`} />
          <Text className="text-[11px] font-mono uppercase tracking-wider text-fog">
            {isPaused ? "Polling Paused" : `Live Rail · ${pollingIntervalMs / 1000}s poll`}
          </Text>
        </View>

        {/* Cadence Pills */}
        <View className="flex-row items-center gap-1 bg-panel border border-edge rounded-lg p-0.5">
          <TouchableOpacity
            onPress={() => onSetPollingInterval(isPaused ? 2000 : 0)}
            className={`px-2 py-1 rounded ${isPaused ? "bg-amber-500/20" : "bg-transparent"}`}
          >
            {isPaused ? <Play size={10} color="#f59e0b" /> : <Pause size={10} color={colors.fog} />}
          </TouchableOpacity>
          {[1000, 2000, 5000].map((ms) => (
            <TouchableOpacity
              key={ms}
              onPress={() => onSetPollingInterval(ms)}
              className={`px-2 py-0.5 rounded ${pollingIntervalMs === ms ? "bg-ember" : "bg-transparent"}`}
            >
              <Text
                className={`text-[10px] font-mono font-bold ${
                  pollingIntervalMs === ms ? "text-abyss" : "text-fog"
                }`}
              >
                {ms / 1000}s
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 2x2 Grid of Live Cards */}
      <View className="flex-row flex-wrap gap-3">
        {/* CPU Card */}
        <View className="flex-1 min-w-[155px] bg-panel border border-edge rounded-card p-3.5">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-1.5">
              <View className="w-6 h-6 rounded bg-amber-500/15 items-center justify-center">
                <Cpu size={14} color="#f59e0b" />
              </View>
              <Text className="text-[11px] font-semibold text-fog uppercase tracking-wider font-mono">
                CPU
              </Text>
            </View>
            <View className={`flex-row items-center gap-1 px-1.5 py-0.5 rounded-full border ${cpuStatus.bg} ${cpuStatus.border}`}>
              <View className={`w-1.5 h-1.5 rounded-full ${cpuStatus.dot}`} />
              <Text className={`text-[10px] font-mono font-bold ${cpuStatus.text}`}>
                {cpuPct}%
              </Text>
            </View>
          </View>
          <Text className="font-head font-extrabold text-[26px] text-bone mb-1">
            {cpuPct}%
          </Text>
          <View className="h-10 my-1">
            <Sparkline
              data={history.cpu}
              strokeColor="#f59e0b"
              fillColor="#f59e0b"
              min={0}
              max={100}
              height={40}
            />
          </View>
          <Text className="text-[10.5px] font-mono text-fog mt-1">
            Activity waveform
          </Text>
        </View>

        {/* Memory Card */}
        <View className="flex-1 min-w-[155px] bg-panel border border-edge rounded-card p-3.5">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-1.5">
              <View className="w-6 h-6 rounded bg-emerald-500/15 items-center justify-center">
                <Server size={14} color="#10b981" />
              </View>
              <Text className="text-[11px] font-semibold text-fog uppercase tracking-wider font-mono">
                RAM
              </Text>
            </View>
            <View className={`flex-row items-center gap-1 px-1.5 py-0.5 rounded-full border ${memStatus.bg} ${memStatus.border}`}>
              <View className={`w-1.5 h-1.5 rounded-full ${memStatus.dot}`} />
              <Text className={`text-[10px] font-mono font-bold ${memStatus.text}`}>
                {memPct}%
              </Text>
            </View>
          </View>
          <Text className="font-head font-extrabold text-[26px] text-bone mb-1">
            {memUsedGB} <Text className="text-[13px] font-normal text-fog">/ {memTotalGB} GB</Text>
          </Text>
          <View className="h-10 my-1">
            <Sparkline
              data={history.mem}
              strokeColor="#10b981"
              fillColor="#10b981"
              min={0}
              max={100}
              height={40}
            />
          </View>
          <Text className="text-[10.5px] font-mono text-fog mt-1">
            {memPct}% utilized
          </Text>
        </View>

        {/* Disk Card */}
        <View className="flex-1 min-w-[155px] bg-panel border border-edge rounded-card p-3.5">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-1.5">
              <View className="w-6 h-6 rounded bg-sky-500/15 items-center justify-center">
                <HardDrive size={14} color="#0284c7" />
              </View>
              <Text className="text-[11px] font-semibold text-fog uppercase tracking-wider font-mono">
                DISK
              </Text>
            </View>
            <View className={`flex-row items-center gap-1 px-1.5 py-0.5 rounded-full border ${diskStatus.bg} ${diskStatus.border}`}>
              <View className={`w-1.5 h-1.5 rounded-full ${diskStatus.dot}`} />
              <Text className={`text-[10px] font-mono font-bold ${diskStatus.text}`}>
                {diskPct}%
              </Text>
            </View>
          </View>
          <Text className="font-head font-extrabold text-[26px] text-bone mb-1">
            {diskUsedGB} <Text className="text-[13px] font-normal text-fog">/ {diskTotalGB} GB</Text>
          </Text>
          <View className="h-10 my-1">
            <Sparkline
              data={history.disk}
              strokeColor="#0284c7"
              fillColor="#0284c7"
              min={0}
              max={100}
              height={40}
            />
          </View>
          <Text className="text-[10.5px] font-mono text-fog mt-1">
            Physical root storage
          </Text>
        </View>

        {/* Network Card */}
        <View className="flex-1 min-w-[155px] bg-panel border border-edge rounded-card p-3.5">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-1.5">
              <View className="w-6 h-6 rounded bg-purple-500/15 items-center justify-center">
                <Network size={14} color="#a855f7" />
              </View>
              <Text className="text-[11px] font-semibold text-fog uppercase tracking-wider font-mono">
                NET I/O
              </Text>
            </View>
            <View className="px-1.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30">
              <Text className="text-[10px] font-mono font-bold text-purple-300">
                LIVE
              </Text>
            </View>
          </View>
          <View className="mb-1">
            <Text className="text-[13px] font-mono font-bold text-bone">
              ↓ {rxFormatted}
            </Text>
            <Text className="text-[11px] font-mono text-fog">
              ↑ {txFormatted}
            </Text>
          </View>
          <View className="h-10 my-1">
            <Sparkline
              data={history.net}
              strokeColor="#a855f7"
              fillColor="#a855f7"
              height={40}
            />
          </View>
          <Text className="text-[10.5px] font-mono text-fog mt-1">
            Throughput rate
          </Text>
        </View>
      </View>
    </View>
  );
}
