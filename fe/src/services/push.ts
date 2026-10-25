import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

import { apiClient } from "@/services/api/client";

// Push chỉ chạy trên development build / APK: Expo Go Android không nhận push từ SDK 53,
// máy ảo không có push token. Nạp expo-notifications động để Expo Go không báo lỗi khi import.
const pushSupported = Device.isDevice && Constants.executionEnvironment !== "storeClient";

let registeredToken: string | null = null;

export async function registerPushDevice(): Promise<void> {
  if (!pushSupported) return;
  try {
    const Notifications = await import("expo-notifications");
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Mặc định",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
    if (!permission.granted) return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await apiClient.post("/devices", { token, platform: Platform.OS === "ios" ? "IOS" : "ANDROID" });
    registeredToken = token;
  } catch (error) {
    // Thiếu projectId EAS hoặc người dùng từ chối: app vẫn chạy, chỉ không có push.
    if (__DEV__) console.warn("Không đăng ký được push", error instanceof Error ? error.message : error);
  }
}

export async function unregisterPushDevice(): Promise<void> {
  if (!registeredToken) return;
  try {
    await apiClient.delete("/devices", { data: { token: registeredToken } });
  } catch {}
  registeredToken = null;
}

// Chạm vào push → trả về `data` để layout gốc điều hướng.
export async function subscribePushTaps(onData: (data: Record<string, unknown>) => void): Promise<() => void> {
  if (!pushSupported) return () => {};
  const Notifications = await import("expo-notifications");
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: true }),
  });
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    onData(response.notification.request.content.data as Record<string, unknown>);
  });
  return () => subscription.remove();
}
