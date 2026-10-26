import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import { ApiError, errorMessage } from "@/services/api/client";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "@/store/toast-store";

// Web: đóng cửa sổ popup Google sau khi chuyển hướng về app.
WebBrowser.maybeCompleteAuthSession();

const clientIds = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
};

// Mỗi nền tảng cần client ID riêng. Expo Go không dùng được (Google không chấp nhận package của Expo Go),
// phải chạy bản web, development build hoặc APK.
function googleAvailable(): boolean {
  if (Platform.OS === "web") return Boolean(clientIds.webClientId);
  if (Constants.executionEnvironment === "storeClient") return false;
  return Boolean(Platform.OS === "android" ? clientIds.androidClientId : clientIds.iosClientId);
}

function googleError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return "Tài khoản đã bị khóa, vui lòng liên hệ CSKH";
    if (error.status === 429) return "Bạn thử quá nhiều lần, vui lòng thử lại sau";
  }
  return errorMessage(error);
}

type GoogleButtonProps = { onSignedIn: (isNewUser: boolean) => void; label?: string };

// "Tiếp tục với Google": lấy ID token từ Google rồi gửi POST /api/auth/google.
// Không hiện gì khi chưa cấu hình client ID cho nền tảng đang chạy.
export function GoogleButton(props: GoogleButtonProps) {
  if (!googleAvailable()) return null;
  return <GoogleButtonInner {...props} />;
}

function GoogleButtonInner({ onSignedIn, label = "Tiếp tục với Google" }: GoogleButtonProps) {
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const [request, , promptAsync] = Google.useIdTokenAuthRequest({ ...clientIds, selectAccount: true });
  const [busy, setBusy] = useState(false);

  async function signIn() {
    const result = await promptAsync();
    if (result.type === "error") return toast.error("Đăng nhập Google không thành công, vui lòng thử lại");
    if (result.type !== "success") return; // người dùng đóng cửa sổ Google
    const idToken = result.params.id_token ?? result.authentication?.idToken;
    if (!idToken) return toast.error("Google không trả về thông tin đăng nhập, vui lòng thử lại");
    setBusy(true);
    try {
      onSignedIn(await loginWithGoogle(idToken));
    } catch (error) {
      toast.error(googleError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="gap-2">
      <Pressable
        onPress={() => void signIn()}
        disabled={!request || busy}
        accessibilityRole="button"
        accessibilityLabel={label}
        className={`min-h-12 w-full flex-row items-center justify-center gap-3 rounded-xl border border-line bg-surface-card px-5 ${!request || busy ? "opacity-50" : "active:opacity-80"}`}>
        {busy ? <ActivityIndicator color={Colors.brand} /> : <Ionicons name="logo-google" size={20} color="#DB4437" />}
        <Text className="text-base font-semibold text-brand">{label}</Text>
      </Pressable>
      <Text className="text-center text-xs text-muted">
        Tiếp tục với Google nghĩa là bạn đồng ý Điều khoản sử dụng và Chính sách bảo mật.
      </Text>
    </View>
  );
}

// Dải "hoặc" ngăn giữa nút Google và form email; ẩn khi không có nút Google.
export function OrDivider() {
  if (!googleAvailable()) return null;
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-px flex-1 bg-line" />
      <Text className="text-sm text-muted">hoặc</Text>
      <View className="h-px flex-1 bg-line" />
    </View>
  );
}
