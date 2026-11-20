import React from "react";
import { View, Text } from "react-native";
import { Terminal, Monitor, Laptop } from "lucide-react-native";

interface OsIconProps {
  os?: string;
  platform?: string;
  size?: number;
}

export function detectOs(rawOs = "", rawPlatform = "") {
  const os = (rawOs || "").toLowerCase();
  const platform = (rawPlatform || "").toLowerCase();
  const combo = `${os} ${platform}`;

  if (combo.includes("win")) {
    return { name: "Windows", color: "#0078D4", bg: "bg-blue-500/20", border: "border-blue-500/40", type: "win" };
  }
  if (combo.includes("darwin") || combo.includes("mac") || combo.includes("apple")) {
    return { name: "macOS", color: "#a1a1aa", bg: "bg-zinc-700/30", border: "border-zinc-500/40", type: "mac" };
  }
  if (combo.includes("ubuntu")) {
    return { name: "Ubuntu", color: "#E95420", bg: "bg-orange-500/20", border: "border-orange-500/40", type: "linux" };
  }
  if (combo.includes("debian")) {
    return { name: "Debian", color: "#D70A53", bg: "bg-rose-500/20", border: "border-rose-500/40", type: "linux" };
  }
  if (combo.includes("arch")) {
    return { name: "Arch Linux", color: "#1793D1", bg: "bg-sky-500/20", border: "border-sky-500/40", type: "linux" };
  }
  if (combo.includes("fedora")) {
    return { name: "Fedora", color: "#51A2DA", bg: "bg-blue-400/20", border: "border-blue-400/40", type: "linux" };
  }
  if (combo.includes("alpine")) {
    return { name: "Alpine", color: "#0D597F", bg: "bg-cyan-600/20", border: "border-cyan-600/40", type: "linux" };
  }
  if (combo.includes("redhat") || combo.includes("rhel")) {
    return { name: "Red Hat", color: "#EE0000", bg: "bg-red-600/20", border: "border-red-600/40", type: "linux" };
  }
  if (combo.includes("centos") || combo.includes("rocky") || combo.includes("alma")) {
    return { name: "Enterprise Linux", color: "#22c55e", bg: "bg-emerald-500/20", border: "border-emerald-500/40", type: "linux" };
  }

  return { name: rawPlatform || rawOs || "Linux", color: "#22c55e", bg: "bg-emerald-500/20", border: "border-emerald-500/40", type: "linux" };
}

export function OsIcon({ os = "", platform = "", size = 20 }: OsIconProps) {
  const info = detectOs(os, platform);

  return (
    <View className={`w-8 h-8 rounded-lg items-center justify-center border ${info.bg} ${info.border}`}>
      {info.type === "win" ? (
        <Monitor size={size} color={info.color} />
      ) : info.type === "mac" ? (
        <Laptop size={size} color={info.color} />
      ) : (
        <Terminal size={size} color={info.color} />
      )}
    </View>
  );
}

export function OsBadge({ os = "", platform = "" }: { os?: string; platform?: string }) {
  const info = detectOs(os, platform);

  return (
    <View className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-md border ${info.bg} ${info.border}`}>
      <OsIcon os={os} platform={platform} size={13} />
      <Text className="text-[12px] font-mono font-semibold" style={{ color: info.color }}>
        {info.name}
      </Text>
    </View>
  );
}
