import React from "react";
import { View, Text } from "react-native";
import { Cpu, Server, HardDrive, Layers, Clock } from "lucide-react-native";
import { OsBadge } from "./OsIcon";
import { DriveBadge } from "./DriveBadge";
import type { ServerDetail, StorageInfo } from "../types/telemetry";
import { fmtUptime } from "../utils/format";
import { colors } from "../theme/colors";

interface HardwareInventoryProps {
  detail: ServerDetail | null;
  storage: StorageInfo | null;
}

export function HardwareInventory({ detail, storage }: HardwareInventoryProps) {
  if (!detail) return null;

  const filesystems = storage?.filesystems ?? detail.filesystems ?? [];

  return (
    <View className="mb-4">
      {/* 1. Host Machine & Operating System */}
      <View className="bg-panel border border-edge rounded-card p-4 mb-3">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <Server size={16} color={colors.ember} />
            <Text className="font-head font-bold text-[16px] text-bone">
              Host & Operating System
            </Text>
          </View>
          <OsBadge os={detail.host.os} platform={detail.host.platform} />
        </View>

        <View className="bg-abyss/60 border border-edge rounded-lg p-3">
          <View className="flex-row items-center justify-between pb-2 border-b border-edge/60">
            <Text className="text-fog text-[11px] font-mono">Hostname</Text>
            <Text className="text-bone text-[12px] font-mono font-bold">
              {detail.host.hostname}
            </Text>
          </View>
          <View className="flex-row items-center justify-between py-2 border-b border-edge/60">
            <Text className="text-fog text-[11px] font-mono">Kernel</Text>
            <Text className="text-bone text-[12px] font-mono">
              {detail.host.kernel}
            </Text>
          </View>
          <View className="flex-row items-center justify-between py-2 border-b border-edge/60">
            <Text className="text-fog text-[11px] font-mono">Architecture</Text>
            <Text className="text-bone text-[12px] font-mono">
              {detail.host.arch} ({detail.host.platformVersion || detail.host.platform})
            </Text>
          </View>
          <View className="flex-row items-center justify-between pt-2">
            <Text className="text-fog text-[11px] font-mono">Uptime</Text>
            <View className="flex-row items-center gap-1">
              <Clock size={11} color={colors.ember} />
              <Text className="text-ember text-[12px] font-mono font-bold">
                {fmtUptime(detail.host.uptimeSec)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 2. CPU & Memory Details */}
      <View className="flex-row gap-3 mb-3">
        {/* CPU Card */}
        <View className="flex-1 bg-panel border border-edge rounded-card p-3.5">
          <View className="flex-row items-center gap-1.5 mb-2">
            <Cpu size={14} color="#f59e0b" />
            <Text className="text-[11px] font-mono font-bold uppercase tracking-wider text-fog">
              Processor
            </Text>
          </View>
          <Text className="text-bone text-[12px] font-mono font-semibold mb-1" numberOfLines={1}>
            {detail.cpu.model || "CPU"}
          </Text>
          <Text className="text-fog text-[11px] font-mono mb-2">
            {detail.cpu.physicalCores} cores · {detail.cpu.logicalCores} threads
          </Text>
          <View className="bg-abyss/60 p-2 rounded border border-edge">
            <Text className="text-fog text-[10px] font-mono uppercase">Load Average</Text>
            <Text className="text-bone text-[11.5px] font-mono font-bold">
              {detail.cpu.load1.toFixed(2)} · {detail.cpu.load5.toFixed(2)} · {detail.cpu.load15.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Memory Breakdown Card */}
        <View className="flex-1 bg-panel border border-edge rounded-card p-3.5">
          <View className="flex-row items-center gap-1.5 mb-2">
            <Layers size={14} color="#10b981" />
            <Text className="text-[11px] font-mono font-bold uppercase tracking-wider text-fog">
              Memory Detail
            </Text>
          </View>
          <Text className="text-bone text-[12px] font-mono font-semibold mb-1">
            {(detail.memory.totalMB / 1024).toFixed(1)} GB Total
          </Text>
          <Text className="text-fog text-[11px] font-mono mb-2">
            {(detail.memory.availableMB / 1024).toFixed(1)} GB Available
          </Text>
          <View className="bg-abyss/60 p-2 rounded border border-edge">
            <Text className="text-fog text-[10px] font-mono uppercase">Cached / Buffers</Text>
            <Text className="text-emerald-400 text-[11.5px] font-mono font-bold">
              {detail.memory.cachedMB.toFixed(0)} MB / {detail.memory.buffersMB.toFixed(0)} MB
            </Text>
          </View>
        </View>
      </View>

      {/* 3. Disks & Physical Filesystems */}
      <View className="bg-panel border border-edge rounded-card p-4">
        <View className="flex-row items-center gap-2 mb-3">
          <HardDrive size={16} color="#0284c7" />
          <Text className="font-head font-bold text-[16px] text-bone">
            Storage & Filesystems
          </Text>
        </View>

        {filesystems.length === 0 ? (
          <Text className="text-fog font-mono text-[11px]">No filesystem data reported.</Text>
        ) : (
          <View className="gap-2.5">
            {filesystems.map((fs, idx) => {
              const usedPct = Math.round(fs.usedPct);
              const barColor =
                usedPct >= 90 ? "bg-rose-500" : usedPct >= 80 ? "bg-amber-500" : "bg-sky-500";

              return (
                <View key={`${fs.mount}-${idx}`} className="bg-abyss/60 border border-edge rounded-lg p-3">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <View className="flex-row items-center gap-2 flex-1 mr-2">
                      <DriveBadge kind={fs.kind} size="sm" />
                      <Text className="text-bone text-[12px] font-mono font-bold" numberOfLines={1}>
                        {fs.mount}
                      </Text>
                    </View>
                    <Text className="text-fog text-[11px] font-mono">
                      {fs.usedGB.toFixed(0)} / {fs.totalGB.toFixed(0)} GB ({usedPct}%)
                    </Text>
                  </View>

                  {/* Visual Usage Bar */}
                  <View className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden my-1">
                    <View style={{ width: `${Math.min(100, Math.max(0, usedPct))}%` }} className={`h-full ${barColor}`} />
                  </View>

                  <View className="flex-row items-center justify-between mt-1">
                    <Text className="text-fog/70 text-[10px] font-mono">
                      Device: {fs.device}
                    </Text>
                    <Text className="text-fog/70 text-[10px] font-mono uppercase">
                      {fs.fstype} · {fs.freeGB.toFixed(0)} GB free
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}
