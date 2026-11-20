import React from "react";
import { View, Text } from "react-native";
import { Zap, HardDrive, Disc } from "lucide-react-native";

interface DriveBadgeProps {
  kind?: string;
  size?: "sm" | "md";
}

export function DriveBadge({ kind, size = "md" }: DriveBadgeProps) {
  const norm = (kind ?? "").toLowerCase().trim();

  if (norm === "nvme") {
    return (
      <View className="flex-row items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30">
        <Zap size={size === "sm" ? 10 : 12} color="#c084fc" />
        <Text className="text-[10px] font-mono font-bold tracking-wider text-purple-300">
          NVMe
        </Text>
      </View>
    );
  }

  if (norm === "ssd") {
    return (
      <View className="flex-row items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/30">
        <HardDrive size={size === "sm" ? 10 : 12} color="#38bdf8" />
        <Text className="text-[10px] font-mono font-bold tracking-wider text-sky-300">
          SSD
        </Text>
      </View>
    );
  }

  if (norm === "hdd") {
    return (
      <View className="flex-row items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30">
        <Disc size={size === "sm" ? 10 : 12} color="#fcd34d" />
        <Text className="text-[10px] font-mono font-bold tracking-wider text-amber-300">
          HDD
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700">
      <HardDrive size={size === "sm" ? 10 : 12} color="#a1a1aa" />
      <Text className="text-[10px] font-mono font-medium text-zinc-400">
        DISK
      </Text>
    </View>
  );
}
