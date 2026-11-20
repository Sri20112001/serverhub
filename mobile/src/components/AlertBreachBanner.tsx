import React from "react";
import { View, Text } from "react-native";
import { AlertTriangle, ShieldAlert } from "lucide-react-native";
import type { ThresholdAlert } from "../types/telemetry";

interface AlertBreachBannerProps {
  alerts: ThresholdAlert[];
}

export function AlertBreachBanner({ alerts }: AlertBreachBannerProps) {
  if (!alerts || alerts.length === 0) return null;

  const hasCrit = alerts.some((a) => a.severity === "critical");
  const bgClass = hasCrit ? "bg-rose-500/15" : "bg-amber-500/15";
  const borderClass = hasCrit ? "border-rose-500/40" : "border-amber-500/40";
  const textClass = hasCrit ? "text-rose-300" : "text-amber-300";

  return (
    <View className={`border rounded-card p-3.5 mb-4 ${bgClass} ${borderClass}`}>
      <View className="flex-row items-center gap-2 mb-1.5">
        {hasCrit ? (
          <ShieldAlert size={16} color="#f43f5e" />
        ) : (
          <AlertTriangle size={16} color="#f59e0b" />
        )}
        <Text className={`font-mono text-[12px] font-bold uppercase tracking-wider ${textClass}`}>
          {hasCrit ? "Critical Threshold Breach" : "Resource Warning"}
        </Text>
      </View>

      <View className="gap-1 mt-1">
        {alerts.map((alert, idx) => (
          <View key={idx} className="flex-row items-center gap-1.5">
            <View
              className={`w-1.5 h-1.5 rounded-full ${
                alert.severity === "critical" ? "bg-rose-500" : "bg-amber-500"
              }`}
            />
            <Text className="text-bone text-[11.5px] font-mono">
              {alert.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
