import "../../global.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { DefaultTheme, router, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ToastHost } from "@/components/ui/toast-host";
import { Colors } from "@/constants/theme";
import { subscribePushTaps } from "@/services/push";
import { queryClient } from "@/services/query-client";
import { useAuthStore } from "@/store/auth-store";
import type { NotificationData } from "@/types/api";
import { notificationHref } from "@/utils/notification-link";

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: Colors.surface, primary: Colors.brand } };

export default function RootLayout() {
  useEffect(() => {
    // Khôi phục phiên đăng nhập một lần khi mở app (refresh token → /auth/me).
    void useAuthStore.getState().hydrate();
    // Chạm vào push → mở đúng trang.
    let unsubscribe: (() => void) | undefined;
    void subscribePushTaps((data) => {
      const href = notificationHref(data as NotificationData, useAuthStore.getState().user?.role);
      if (href) router.push(href);
    }).then((fn) => (unsubscribe = fn));
    return () => unsubscribe?.();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={theme}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.surface } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="booking" options={{ gestureEnabled: true }} />
          </Stack>
          <ToastHost />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
