import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordStrength } from "@/components/ui/password-strength";
import { Screen } from "@/components/ui/screen";
import { ApiError, errorMessage } from "@/services/api/client";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "@/store/toast-store";
import { passwordProblem } from "@/utils/validation";

// P2 – Đổi mật khẩu. Backend thu hồi mọi phiên và trả phiên mới: phải lưu lại, nếu không thiết bị này bị đăng xuất.
export default function ChangePasswordScreen() {
  const applySession = useAuthStore((state) => state.applySession);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const problem = passwordProblem(next);
    const found = { ...(problem ? { next: problem } : {}), ...(confirm !== next ? { confirm: "Mật khẩu nhập lại không khớp" } : {}) };
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    setError(null);
    try {
      const session = await authService.changePassword(current, next);
      await applySession(session);
      toast.success("Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.");
      router.back();
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "INVALID_PASSWORD") setErrors({ current: "Mật khẩu hiện tại không đúng" });
      else setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen back backHref="/profile" title="Đổi mật khẩu" maxWidth={480}>
      <View className="gap-4">
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <Input label="Mật khẩu hiện tại" required password value={current} onChangeText={setCurrent} error={errors.current} />
        <Input label="Mật khẩu mới" required password value={next} onChangeText={setNext} error={errors.next} hint="8–72 ký tự, có chữ và số" />
        <PasswordStrength value={next} />
        <Input label="Nhập lại mật khẩu mới" required password value={confirm} onChangeText={setConfirm} error={errors.confirm} />
        <Button title="Đổi mật khẩu" full loading={saving} disabled={!current || !next} onPress={submit} />
      </View>
    </Screen>
  );
}
