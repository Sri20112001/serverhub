import "../global.css";
import React, { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
} from "@expo-google-fonts/inter";
import {
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import {
  JetBrainsMono_400Regular,
} from "@expo-google-fonts/jetbrains-mono";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "../src/stores/authStore";
import { useBiometricStore } from "../src/stores/biometricStore";
import { AnimatedSplash } from "../src/components/AnimatedSplash";

if (Platform.OS !== "web") {
  void SplashScreen.preventAutoHideAsync().catch(() => {});

  // Foreground pushes render as a system notification (sound included);
  // taps deep-link into the in-app notification center (see below).
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const checked = useAuthStore((s) => s.checked);
  const loadBiometric = useBiometricStore((s) => s.load);
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    SpaceGrotesk_700Bold,
    JetBrainsMono_400Regular,
  });
  const [introDone, setIntroDone] = useState(false);
  const handleIntroDone = useCallback(() => setIntroDone(true), []);

  useEffect(() => {
    void hydrate();
    void loadBiometric();
  }, [hydrate, loadBiometric]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    // Tapping a push opens the notification center.
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push("/(app)/notifications");
    });
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    // Swap the native splash for the animated intro once fonts are loaded
    // AND the auth check is done.
    if (fontsLoaded && checked) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, checked]);

  if (!fontsLoaded || !checked) return null;

  if (!introDone) {
    return <AnimatedSplash onDone={handleIntroDone} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
