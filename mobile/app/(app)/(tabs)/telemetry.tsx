import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Gauge, RefreshCw } from "lucide-react-native";
import { useLiveTelemetry } from "../../../src/hooks/useLiveTelemetry";
import { TelemetryLiveRail } from "../../../src/components/TelemetryLiveRail";
import { HardwareInventory } from "../../../src/components/HardwareInventory";
import { ProcessExplorer } from "../../../src/components/ProcessExplorer";
import { AlertBreachBanner } from "../../../src/components/AlertBreachBanner";
import { SkeletonCard } from "../../../src/components/SkeletonBox";
import { colors } from "../../../src/theme/colors";

export default function TelemetryScreen() {
  const {
    current,
    history,
    pollingIntervalMs,
    setPollingIntervalMs,
    activeAlerts,
    serverDetail,
    storageInfo,
    isLoading,
    refreshAll,
  } = useLiveTelemetry();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  const processes = serverDetail?.processes.top ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.abyss }}>
      {/* Screen Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-edge bg-abyss">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-lg bg-ember/15 items-center justify-center border border-ember/30">
            <Gauge size={18} color={colors.ember} />
          </View>
          <View>
            <Text className="font-head font-bold text-[18px] text-bone">
              Telemetry
            </Text>
            <Text className="text-fog text-[10.5px] font-mono">
              {serverDetail?.host.hostname ?? "Host System"} · Real-time
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => void onRefresh()}
          className="w-9 h-9 rounded-full bg-emboss items-center justify-center border border-edge"
          accessibilityLabel="Refresh telemetry"
          accessibilityRole="button"
        >
          <RefreshCw size={16} color={colors.fog} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={colors.ember}
          />
        }
      >
        {isLoading && (
          <View className="gap-3">
            <SkeletonCard dark />
            <SkeletonCard dark />
            <SkeletonCard dark />
          </View>
        )}

        {/* 1. Active Threshold Alerts Breach Banner */}
        <AlertBreachBanner alerts={activeAlerts} />

        {/* 2. Live Rail: CPU, RAM, Disk, Net I/O + Waveform Sparklines */}
        <TelemetryLiveRail
          current={current}
          history={history}
          pollingIntervalMs={pollingIntervalMs}
          onSetPollingInterval={setPollingIntervalMs}
        />

        {/* 3. Hardware Specs, OS Detection & Storage/Drive Badges */}
        <HardwareInventory detail={serverDetail} storage={storageInfo} />

        {/* 4. Process Explorer & Tree Hierarchy */}
        <ProcessExplorer
          processes={processes}
          onRefreshProcesses={refreshAll}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
