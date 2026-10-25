import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { ApiError, errorMessage } from "@/services/api/client";
import { authService } from "@/services/auth.service";
import { toast } from "@/store/toast-store";
import { PasswordStrength } from "@/components/ui/password-strength";
import { passwordProblem } from "@/utils/validation";

// A4 – Đặt mật khẩu mới (mở từ link email APP_URL/reset-password?token=...).
export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expired, setExpired] = useState(!token);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const problem = passwordProblem(password);
    const next = { ...(problem ? { password: problem } : {}), ...(confirm !== password ? { confirm: "Mật khẩu nhập lại không khớp" } : {}) };
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      await authService.resetPassword(token!, password);
      toast.success("Đã đổi mật khẩu. Hãy đăng nhập lại.");
      router.replace("/login");
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "INVALID_TOKEN") setExpired(true);
      else setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen back backHref="/login" title="Đặt mật khẩu mới" maxWidth={480}>
      <View className="gap-4 pt-2">
        {expired ? (
          <>
            <Banner tone="danger" title="Link hết hạn hoặc không hợp lệ">
              Vui lòng gửi lại yêu cầu đặt lại mật khẩu.
            </Banner>
            <Button title="Gửi lại link" onPress={() => router.replace("/forgot-password")} />
          </>
        ) : (
          <>
            {error ? <Banner tone="danger">{error}</Banner> : null}
            <Input label="Mật khẩu mới" required password value={password} onChangeText={setPassword} error={errors.password} hint="8–72 ký tự, có chữ và số" />
            <PasswordStrength value={password} />
            <Input label="Nhập lại mật khẩu" required password value={confirm} onChangeText={setConfirm} error={errors.confirm} />
            <Button title="Đổi mật khẩu" full loading={loading} onPress={submit} />
          </>
        )}
      </View>
    </Screen>
  );
}
