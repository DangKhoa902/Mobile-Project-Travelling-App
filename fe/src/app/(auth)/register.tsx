import { Link, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { GoogleButton, OrDivider } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/choice";
import { DateField } from "@/components/ui/date-field";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { ApiError, errorMessage, fieldErrors } from "@/services/api/client";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "@/store/toast-store";
import { todayIso } from "@/utils/format";
import { PasswordStrength } from "@/components/ui/password-strength";
import { EMAIL_RE, passwordProblem, PHONE_RE, safeRedirect } from "@/utils/validation";

// A2 – Đăng ký: đủ trường bắt buộc, lỗi dưới đúng ô, xong là đăng nhập luôn.
export default function RegisterScreen() {
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const register = useAuthStore((state) => state.register);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", phone: "", dateOfBirth: null as string | null });
  const [accept, setAccept] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (value: string | null) => setForm({ ...form, [key]: value });

  function validate() {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2 || form.name.trim().length > 100) next.name = "Họ tên từ 2 đến 100 ký tự";
    if (!EMAIL_RE.test(form.email.trim())) next.email = "Email không hợp lệ";
    const problem = passwordProblem(form.password);
    if (problem) next.password = problem;
    if (form.confirm !== form.password) next.confirm = "Mật khẩu nhập lại không khớp";
    if (form.phone && !PHONE_RE.test(form.phone.trim())) next.phone = "Số điện thoại dạng 0xxxxxxxxx hoặc +84...";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    setError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      const session = await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        acceptTerms: true,
        ...(form.phone ? { phone: form.phone.trim() } : {}),
        ...(form.dateOfBirth ? { dateOfBirth: form.dateOfBirth } : {}),
      });
      toast.success("Tạo tài khoản thành công. Kiểm tra email để xác thực.");
      if (session.devVerificationToken && __DEV__) console.info("Link xác thực (dev): /verify-email?token=" + session.devVerificationToken);
      router.replace(safeRedirect(redirect) as never);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "EMAIL_TAKEN") setErrors({ email: "Email đã được sử dụng" });
      else if (Object.keys(fieldErrors(caught)).length) setErrors(fieldErrors(caught));
      else setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen back title="Tạo tài khoản" maxWidth={480}>
      <View className="gap-4 pt-2">
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <GoogleButton
          label="Đăng ký bằng Google"
          onSignedIn={(isNewUser) => {
            toast.success(isNewUser ? "Đã tạo tài khoản bằng Google" : "Email này đã có tài khoản – đã đăng nhập bằng Google");
            router.replace(safeRedirect(redirect) as never);
          }}
        />
        <OrDivider />
        <Input label="Họ tên" required value={form.name} onChangeText={set("name")} error={errors.name} autoComplete="name" placeholder="Nguyễn Văn A" />
        <Input
          label="Email"
          required
          value={form.email}
          onChangeText={set("email")}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <View className="gap-2">
          <Input label="Mật khẩu" required password value={form.password} onChangeText={set("password")} error={errors.password} hint="8–72 ký tự, có chữ và số" />
          <PasswordStrength value={form.password} />
        </View>
        <Input label="Nhập lại mật khẩu" required password value={form.confirm} onChangeText={set("confirm")} error={errors.confirm} />
        <Input label="Số điện thoại" value={form.phone} onChangeText={set("phone")} error={errors.phone} keyboardType="phone-pad" placeholder="0901234567" />
        <DateField label="Ngày sinh" value={form.dateOfBirth} onChange={set("dateOfBirth")} max={todayIso()} min="1920-01-01" error={errors.dateOfBirth} clearable />
        <Checkbox checked={accept} onChange={setAccept}>
          <Text className="text-sm text-brand">
            Tôi đồng ý <Text className="font-semibold">Điều khoản sử dụng</Text> và <Text className="font-semibold">Chính sách bảo mật</Text>
            <Text className="text-danger"> *</Text>
          </Text>
        </Checkbox>
        {errors.acceptTerms ? <Text className="text-xs text-danger">{errors.acceptTerms}</Text> : null}
        <Button title="Đăng ký" full loading={loading} disabled={!accept} onPress={submit} />
        <View className="flex-row justify-center gap-1">
          <Text className="text-muted">Đã có tài khoản?</Text>
          <Link href="/login">
            <Text className="font-semibold text-brand-light">Đăng nhập</Text>
          </Link>
        </View>
      </View>
    </Screen>
  );
}
