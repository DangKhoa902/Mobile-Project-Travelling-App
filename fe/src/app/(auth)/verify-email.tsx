import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { Colors } from "@/constants/theme";
import { errorMessage } from "@/services/api/client";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "@/store/toast-store";

// A5 – Xác thực email: tự gọi API khi mở trang (link APP_URL/verify-email?token=...).
export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { status: authStatus, reloadUser } = useAuthStore();
  const [state, setState] = useState<"working" | "done" | "failed">(token ? "working" : "failed");
  const [message, setMessage] = useState("Link xác thực không hợp lệ.");
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    authService
      .verifyEmail(token)
      .then(async () => {
        setState("done");
        await reloadUser();
      })
      .catch((error) => {
        setMessage(errorMessage(error));
        setState("failed");
      });
  }, [token, reloadUser]);

  async function resend() {
    try {
      const result = await authService.resendVerification();
      toast.success("Đã gửi lại email xác thực");
      if (result.devVerificationToken) router.replace(`/verify-email?token=${result.devVerificationToken}`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Screen title="Xác thực email" maxWidth={480}>
      <View className="items-center gap-4 py-12">
        {state === "working" ? (
          <>
            <ActivityIndicator color={Colors.brand} />
            <Text className="text-base text-muted">Đang xác thực email…</Text>
          </>
        ) : state === "done" ? (
          <>
            <Ionicons name="checkmark-circle" size={64} color={Colors.brandLight} />
            <Text className="text-center text-lg font-bold text-brand">Email đã được xác thực</Text>
            <Text className="text-center text-muted">Bạn có thể nộp hồ sơ trở thành đối tác.</Text>
            <Button title="Về tài khoản" onPress={() => router.replace("/profile")} />
          </>
        ) : (
          <>
            <Ionicons name="close-circle" size={64} color={Colors.danger} />
            <Text className="text-center text-lg font-bold text-brand">Không xác thực được</Text>
            <Text className="text-center text-muted">{message}</Text>
            {authStatus === "authenticated" ? <Button title="Gửi lại email xác thực" onPress={resend} /> : null}
            <Button title="Về trang chủ" variant="outline" onPress={() => router.replace("/")} />
          </>
        )}
      </View>
    </Screen>
  );
}
