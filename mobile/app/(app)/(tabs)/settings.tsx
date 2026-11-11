import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { ArrowRight } from "lucide-react-native";
import { useAuthStore } from "../../../src/stores/authStore";
import { useBiometricStore } from "../../../src/stores/biometricStore";
import { authApi } from "../../../src/api/auth";
import { colors } from "../../../src/theme/colors";

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-[10px] font-semibold uppercase tracking-widest text-fog px-4 pt-5 pb-2">
      {title}
    </Text>
  );
}

function SettingRow({
  label,
  hint,
  right,
}: {
  label: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3.5 border-b border-edge">
      <View className="flex-1 mr-4">
        <Text className="text-bone text-[14px]">{label}</Text>
        {hint && <Text className="text-fog text-[12px] mt-0.5">{hint}</Text>}
      </View>
      {right}
    </View>
  );
}

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const { enabled: biometricEnabled, supported, setEnabled } = useBiometricStore();
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  const handleLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) return;
    if (newPw.length < 8) {
      setPwError("New password must be at least 8 characters");
      return;
    }
    setPwBusy(true);
    setPwError(null);
    try {
      await authApi.changePassword(currentPw, newPw);
      setChangingPassword(false);
      setCurrentPw("");
      setNewPw("");
      Alert.alert("Success", "Password updated successfully");
    } catch (e) {
      setPwError(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.abyss }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="px-4 pt-4 pb-2">
          <Text className="font-head font-bold text-[24px] text-bone">Settings</Text>
          <Text className="font-mono text-[11px] uppercase tracking-widest text-fog mt-0.5">
            Preferences & access
          </Text>
        </View>

        {/* Account */}
        <SectionHeader title="Account" />
        <View className="bg-panel border-t border-b border-edge">
          <SettingRow
            label="Captain"
            hint={user ? `${user.username} · ${user.role}` : "Signed in"}
            right={
              <TouchableOpacity
                onPress={handleLogout}
                className="bg-danger-night border border-brick/40 rounded-input px-3 py-1.5"
                accessibilityRole="button"
                accessibilityLabel="Sign out"
              >
                <Text className="text-brick font-medium text-[12px]">Sign out</Text>
              </TouchableOpacity>
            }
          />
          <SettingRow
            label="Change password"
            hint="Update your master account password"
            right={
              <TouchableOpacity
                onPress={() => setChangingPassword((v) => !v)}
                className="bg-emboss border border-edge rounded-input px-3 py-1.5"
                accessibilityRole="button"
              >
                <Text className="text-bone font-medium text-[12px]">
                  {changingPassword ? "Cancel" : "Update"}
                </Text>
              </TouchableOpacity>
            }
          />
          {changingPassword && (
            <View className="p-4 bg-abyss border-b border-edge">
              <Text className="text-[11px] font-semibold uppercase tracking-widest text-fog mb-1.5">
                Current password
              </Text>
              <TextInput
                value={currentPw}
                onChangeText={setCurrentPw}
                secureTextEntry
                placeholder="Current master password"
                placeholderTextColor={colors.fog}
                className="bg-panel border border-edge rounded-input px-3 py-2.5 text-bone text-[13px] mb-3"
                style={{ fontFamily: "Inter_400Regular" }}
              />
              <Text className="text-[11px] font-semibold uppercase tracking-widest text-fog mb-1.5">
                New password
              </Text>
              <TextInput
                value={newPw}
                onChangeText={setNewPw}
                secureTextEntry
                placeholder="At least 8 characters"
                placeholderTextColor={colors.fog}
                className="bg-panel border border-edge rounded-input px-3 py-2.5 text-bone text-[13px] mb-3"
                style={{ fontFamily: "Inter_400Regular" }}
              />
              {pwError && (
                <Text className="text-brick text-[12px] mb-3">{pwError}</Text>
              )}
              <TouchableOpacity
                onPress={handleChangePassword}
                disabled={pwBusy || !currentPw || !newPw}
                className="bg-ember rounded-input py-2.5 items-center"
                style={{ opacity: pwBusy || !currentPw || !newPw ? 0.55 : 1 }}
                accessibilityRole="button"
              >
                {pwBusy ? (
                  <ActivityIndicator color={colors.abyss} size="small" />
                ) : (
                  <Text className="text-black font-medium text-[13px]">
                    Update password
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <SectionHeader title="Security" />
        <View className="bg-panel border-t border-b border-edge">
          <SettingRow
            label="Biometric unlock"
            hint={
              supported
                ? "Require fingerprint or face ID to open"
                : "Biometrics not available on this device"
            }
            right={
              <Switch
                value={biometricEnabled}
                disabled={!supported}
                onValueChange={(val) => {
                  void Haptics.selectionAsync();
                  setEnabled(val);
                }}
                trackColor={{ false: colors.emboss, true: colors.moss }}
                thumbColor={colors.bone}
              />
            }
          />
        </View>

        {/* Monitoring & Audit links */}
        <SectionHeader title="System & Telemetry" />
        <View className="bg-panel border-t border-b border-edge">
          <TouchableOpacity
            onPress={() => router.push("/(app)/monitoring")}
            className="flex-row items-center justify-between px-4 py-3.5 border-b border-edge"
            accessibilityRole="button"
          >
            <View>
              <Text className="text-bone text-[14px]">Prometheus Monitoring</Text>
              <Text className="text-fog text-[12px] mt-0.5">
                Host targets, TSDB counters & alertmanager
              </Text>
            </View>
            <ArrowRight size={16} color={colors.fog} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(app)/notifications")}
            className="flex-row items-center justify-between px-4 py-3.5 border-b border-edge"
            accessibilityRole="button"
          >
            <View>
              <Text className="text-bone text-[14px]">Notifications & Alerts</Text>
              <Text className="text-fog text-[12px] mt-0.5">
                Recent alert firings and broadcast history
              </Text>
            </View>
            <ArrowRight size={16} color={colors.fog} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(app)/logs")}
            className="flex-row items-center justify-between px-4 py-3.5"
            accessibilityRole="button"
          >
            <View>
              <Text className="text-bone text-[14px]">Audit Logs</Text>
              <Text className="text-fog text-[12px] mt-0.5">
                Append-only captain actions and deployment history
              </Text>
            </View>
            <ArrowRight size={16} color={colors.fog} />
          </TouchableOpacity>
        </View>

        {/* About */}
        <SectionHeader title="About" />
        <View className="bg-panel border-t border-b border-edge px-4 py-3.5">
          <Text className="text-bone text-[13px]">ServerHub Mobile · v2.0</Text>
          <Text className="text-fog text-[11px] mt-0.5">
            React Native + Expo SDK 52 · Cyberdeck theme
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
