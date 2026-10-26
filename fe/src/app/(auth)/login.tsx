import { Link, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { GoogleButton, OrDivider } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { ApiError, fieldErrors } from "@/services/api/client";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "@/store/toast-store";
import { safeRedirect } from "@/utils/validation";

function loginError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Email hoặc mật khẩu không đúng";
    if (error.status === 403) return "Tài khoản đã bị khóa, vui lòng liên hệ CSKH";
    if (error.status === 429) return "Bạn thử quá nhiều lần, vui lòng thử lại sau";
    return error.message;
  }
  return "Đã có lỗi xảy ra";
}

// A1 – Đăng nhập; xong quay về `redirect` (hoặc trang chủ).
export default function LoginScreen() {
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setErrors({});
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace(safeRedirect(redirect) as never);
    } catch (caught) {
      const byField = fieldErrors(caught);
      if (Object.keys(byField).length) setErrors(byField);
      else setError(loginError(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen back title="Đăng nhập" maxWidth={480}>
      <View className="gap-4 pt-4">
        <Text className="text-base text-muted">Chào mừng trở lại! Đăng nhập để tiếp tục đặt chỗ.</Text>
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <GoogleButton
          onSignedIn={(isNewUser) => {
            if (isNewUser) toast.success("Đã tạo tài khoản bằng Google");
            router.replace(safeRedirect(redirect) as never);
          }}
        />
        <OrDivider />
        <Input
          label="Email"
          required
          left="mail-outline"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={errors.email}
          placeholder="ban@vidu.com"
        />
        <Input
          label="Mật khẩu"
          required
          left="lock-closed-outline"
          password
          value={password}
          onChangeText={setPassword}
          autoComplete="password"
          error={errors.password}
          onSubmitEditing={submit}
        />
        <View className="items-end">
          <Link href="/forgot-password">
            <Text className="font-semibold text-brand-light">Quên mật khẩu?</Text>
          </Link>
        </View>
        <Button title="Đăng nhập" full loading={loading} disabled={!email || !password} onPress={submit} />
        <View className="flex-row justify-center gap-1">
          <Text className="text-muted">Chưa có tài khoản?</Text>
          <Link href={redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : "/register"} >
            <Text className="font-semibold text-brand-light">Đăng ký</Text>
          </Link>
        </View>
      </View>
    </Screen>
  );
}
