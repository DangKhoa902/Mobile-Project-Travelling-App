import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { errorMessage } from "@/services/api/client";
import { authService } from "@/services/auth.service";

// A3 – Quên mật khẩu: luôn hiện cùng một thông báo (không lộ email có tồn tại hay không).
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.forgotPassword(email.trim());
      setDevToken(result.devResetToken ?? null);
      setSent(true);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen back backHref="/login" title="Quên mật khẩu" maxWidth={480}>
      <View className="gap-4 pt-2">
        {sent ? (
          <>
            <Banner tone="success" title="Đã gửi yêu cầu">
              Nếu email đã đăng ký, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút. Link có hiệu lực trong thời gian ngắn.
            </Banner>
            {devToken ? (
              <Button title="Mở link đặt lại (chế độ dev)" variant="secondary" onPress={() => router.push(`/reset-password?token=${devToken}`)} />
            ) : null}
            <Button title="Về đăng nhập" variant="outline" onPress={() => router.replace("/login")} />
          </>
        ) : (
          <>
            <Text className="text-base text-muted">Nhập email bạn đã dùng để đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu.</Text>
            {error ? <Banner tone="danger">{error}</Banner> : null}
            <Input label="Email" required value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Button title="Gửi link" full loading={loading} disabled={!email.includes("@")} onPress={submit} />
          </>
        )}
      </View>
    </Screen>
  );
}
