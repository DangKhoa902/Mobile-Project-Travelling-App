import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/card";
import { DateField } from "@/components/ui/date-field";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { errorMessage, fieldErrors } from "@/services/api/client";
import { authService } from "@/services/auth.service";
import { pickImages, uploadImage } from "@/services/upload.service";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "@/store/toast-store";
import { todayIso } from "@/utils/format";
import { PHONE_RE } from "@/utils/validation";

// P1 – Sửa hồ sơ: tên, SĐT, ngày sinh, ảnh đại diện (chọn → nén → tải lên → lưu URL). Email không sửa được.
export default function EditProfileScreen() {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(user?.dateOfBirth?.slice(0, 10) ?? null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function changeAvatar() {
    try {
      const [asset] = await pickImages(1);
      if (!asset) return;
      setUploading(true);
      const uploaded = await uploadImage(asset, "avatar");
      setAvatarUrl(uploaded.url);
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Họ tên tối thiểu 2 ký tự";
    if (phone && !PHONE_RE.test(phone.trim())) next.phone = "Số điện thoại dạng 0xxxxxxxxx hoặc +84...";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await authService.updateMe({ name: name.trim(), phone: phone.trim() || null, dateOfBirth, avatarUrl });
      setUser({ ...user!, ...updated });
      toast.success("Đã lưu hồ sơ");
      router.back();
    } catch (caught) {
      const byField = fieldErrors(caught);
      if (Object.keys(byField).length) setErrors(byField);
      else setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen back backHref="/profile" title="Sửa hồ sơ" maxWidth={560} footer={<Button title="Lưu" full loading={saving} disabled={uploading} onPress={save} />}>
      <View className="gap-4">
        <View className="items-center gap-2">
          <Avatar name={name || user.name} url={avatarUrl} size={96} />
          <Pressable onPress={changeAvatar} disabled={uploading}>
            <Text className="font-semibold text-brand-light">{uploading ? "Đang tải ảnh…" : "Đổi ảnh đại diện"}</Text>
          </Pressable>
          {avatarUrl ? (
            <Pressable onPress={() => setAvatarUrl(null)}>
              <Text className="text-sm text-muted">Xóa ảnh</Text>
            </Pressable>
          ) : null}
        </View>
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <Input label="Họ tên" required value={name} onChangeText={setName} error={errors.name} />
        <Input label="Email" value={user.email} editable={false} hint="Email không thay đổi được" />
        <Input label="Số điện thoại" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={errors.phone} />
        <DateField label="Ngày sinh" value={dateOfBirth} onChange={setDateOfBirth} max={todayIso()} min="1920-01-01" error={errors.dateOfBirth} clearable />
      </View>
    </Screen>
  );
}
