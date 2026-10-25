import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { PartnerBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Banner, Card, InfoRow, SectionTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/choice";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { Colors } from "@/constants/theme";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { ApiError, errorMessage, fieldErrors } from "@/services/api/client";
import { useApplyPartner, useMyPartner, useUpdateMyPartner } from "@/services/partner.service";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "@/store/toast-store";
import type { PartnerInput, PartnerProfile } from "@/types/api";
import { maskAccount } from "@/utils/format";
import { PHONE_RE } from "@/utils/validation";

// P4 – Trở thành đối tác: form nộp hồ sơ hoặc trạng thái hồ sơ (chờ / từ chối + nộp lại / đã duyệt / tạm ngưng).
export default function PartnerScreen() {
  const partner = useMyPartner();
  const role = useAuthStore((state) => state.user?.role);
  if (role === "STAFF" || role === "ADMIN") {
    return (
      <Screen back backHref="/profile" title="Đối tác">
        <Banner tone="info">Nhân viên và quản trị viên không nộp hồ sơ đối tác.</Banner>
      </Screen>
    );
  }
  return (
    <Screen back backHref="/profile" title="Trở thành đối tác" maxWidth={1000}>
      <QueryState query={partner}>{(profile) => <PartnerContent profile={profile} />}</QueryState>
    </Screen>
  );
}

function PartnerContent({ profile }: { profile: PartnerProfile | null }) {
  const reloadUser = useAuthStore((state) => state.reloadUser);
  const [editing, setEditing] = useState(false);

  if (!profile || (profile.status === "REJECTED" && editing)) return <PartnerForm profile={profile} />;

  if (profile.status === "APPROVED") {
    return (
      <View className="items-center gap-3 py-8">
        <Ionicons name="ribbon" size={64} color={Colors.brandLight} />
        <Text className="text-xl font-bold text-brand">Bạn đã là đối tác</Text>
        <Text className="text-center text-muted">{`${profile.businessName} · Hoa hồng ${Math.round(profile.commissionRate * 100)}%`}</Text>
        <Button
          title="Vào trang quản lý"
          icon="business-outline"
          onPress={async () => {
            await reloadUser();
            router.replace("/owner");
          }}
        />
      </View>
    );
  }

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-bold text-brand">{profile.businessName}</Text>
        <PartnerBadge status={profile.status} />
      </View>
      {profile.status === "PENDING" ? <Banner tone="warning" title="Hồ sơ đang được xét duyệt">Chúng tôi sẽ thông báo khi có kết quả, thường trong 1–2 ngày làm việc.</Banner> : null}
      {profile.status === "SUSPENDED" ? <Banner tone="danger" title="Tài khoản đối tác đang tạm ngưng">Vui lòng liên hệ CSKH để được hỗ trợ.</Banner> : null}
      {profile.status === "REJECTED" ? (
        <Banner tone="danger" title="Hồ sơ bị từ chối">
          <View className="gap-2">
            <Text className="text-sm text-brand">{profile.rejectReason ?? "Không có lý do"}</Text>
            <View className="items-start">
              <Button title="Sửa và nộp lại" size="sm" onPress={() => setEditing(true)} />
            </View>
          </View>
        </Banner>
      ) : null}
      <Card>
        <InfoRow label="Địa chỉ kinh doanh" value={profile.businessAddress} />
        <InfoRow label="SĐT liên hệ" value={profile.contactPhone} />
        <InfoRow label="Mã số thuế" value={profile.taxCode ?? "—"} />
        <InfoRow label="Ngân hàng" value={profile.bankName ?? "—"} />
        <InfoRow label="Số tài khoản" value={maskAccount(profile.bankAccountNumber)} />
        <InfoRow label="Chủ tài khoản" value={profile.bankAccountName ?? "—"} />
      </Card>
      {profile.status === "PENDING" ? <BankForm profile={profile} /> : null}
    </View>
  );
}

// Hồ sơ đang chờ: cho bổ sung thông tin ngân hàng (PATCH /partners/me).
function BankForm({ profile }: { profile: PartnerProfile }) {
  const update = useUpdateMyPartner();
  const [bank, setBank] = useState({ bankName: profile.bankName ?? "", bankAccountNumber: profile.bankAccountNumber ?? "", bankAccountName: profile.bankAccountName ?? "" });
  return (
    <Card className="gap-3">
      <SectionTitle title="Cập nhật tài khoản nhận tiền" />
      <Input label="Ngân hàng" value={bank.bankName} onChangeText={(bankName) => setBank({ ...bank, bankName })} />
      <Input label="Số tài khoản" keyboardType="number-pad" value={bank.bankAccountNumber} onChangeText={(bankAccountNumber) => setBank({ ...bank, bankAccountNumber })} />
      <Input label="Chủ tài khoản" autoCapitalize="characters" value={bank.bankAccountName} onChangeText={(bankAccountName) => setBank({ ...bank, bankAccountName })} />
      <Button
        title="Lưu"
        loading={update.isPending}
        onPress={() =>
          update.mutate(bank, {
            onSuccess: () => toast.success("Đã cập nhật thông tin ngân hàng"),
            onError: (error) => toast.error(errorMessage(error)),
          })
        }
      />
    </Card>
  );
}

function PartnerForm({ profile }: { profile: PartnerProfile | null }) {
  const user = useAuthStore((state) => state.user);
  const apply = useApplyPartner();
  const { isLg } = useBreakpoint();
  const [form, setForm] = useState<Required<PartnerInput>>({
    businessName: profile?.businessName ?? "",
    businessAddress: profile?.businessAddress ?? "",
    contactPhone: profile?.contactPhone ?? user?.phone ?? "",
    taxCode: profile?.taxCode ?? "",
    description: profile?.description ?? "",
    bankName: profile?.bankName ?? "",
    bankAccountNumber: profile?.bankAccountNumber ?? "",
    bankAccountName: profile?.bankAccountName ?? "",
  });
  const [accept, setAccept] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  // API báo EMAIL_NOT_VERIFIED thì khóa nút dù hồ sơ trên máy chưa cập nhật.
  const [apiUnverified, setApiUnverified] = useState(false);
  const unverified = !user?.emailVerifiedAt || apiUnverified;

  const set = (key: keyof PartnerInput) => (value: string) => setForm({ ...form, [key]: value });

  async function submit() {
    const next: Record<string, string> = {};
    if (form.businessName.trim().length < 2) next.businessName = "Nhập tên cơ sở";
    if (form.businessAddress.trim().length < 5) next.businessAddress = "Nhập địa chỉ kinh doanh";
    if (!PHONE_RE.test(form.contactPhone.trim())) next.contactPhone = "Số điện thoại dạng 0xxxxxxxxx hoặc +84...";
    setErrors(next);
    if (Object.keys(next).length) return;
    setError(null);
    const body = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value)) as unknown as PartnerInput;
    try {
      await apply.mutateAsync(body);
      toast.success("Đã nộp hồ sơ đối tác");
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "EMAIL_NOT_VERIFIED") setApiUnverified(true);
      else if (Object.keys(fieldErrors(caught)).length) setErrors(fieldErrors(caught));
      else setError(errorMessage(caught));
    }
  }

  const benefits = (
    <Card className="gap-3">
      <SectionTitle title="Quyền lợi đối tác" />
      {["Tiếp cận khách du lịch trên web và ứng dụng", "Quản lý tin đăng, phòng, giá mùa, booking", "Dashboard doanh thu theo ngày", "Đối soát và nhận tiền định kỳ"].map((item) => (
        <View key={item} className="flex-row gap-2">
          <Ionicons name="checkmark-circle" size={18} color={Colors.brandLight} />
          <Text className="flex-1 text-brand">{item}</Text>
        </View>
      ))}
      <Banner tone="info" title="Hoa hồng mặc định 15%">Tính trên giá trị booking đã hoàn thành; sàn có thể điều chỉnh theo hợp đồng.</Banner>
    </Card>
  );

  const fields = (
    <View className="gap-4">
      {unverified ? <Banner tone="warning" title="Cần xác thực email">Xác thực email ở trang Tài khoản trước khi nộp hồ sơ đối tác.</Banner> : null}
      {profile?.status === "REJECTED" && profile.rejectReason ? <Banner tone="danger" title="Lý do từ chối lần trước">{profile.rejectReason}</Banner> : null}
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <SectionTitle title="Thông tin cơ sở" />
      <Input label="Tên cơ sở" required value={form.businessName} onChangeText={set("businessName")} error={errors.businessName} />
      <Input label="Địa chỉ kinh doanh" required value={form.businessAddress} onChangeText={set("businessAddress")} error={errors.businessAddress} />
      <Input label="SĐT liên hệ" required keyboardType="phone-pad" value={form.contactPhone} onChangeText={set("contactPhone")} error={errors.contactPhone} />
      <Input label="Mã số thuế" value={form.taxCode} onChangeText={set("taxCode")} error={errors.taxCode} />
      <Input label="Giới thiệu" multiline value={form.description} onChangeText={set("description")} />
      <SectionTitle title="Tài khoản nhận tiền" />
      <Text className="text-xs text-muted">Bắt buộc trước khi hồ sơ được duyệt.</Text>
      <Input label="Ngân hàng" value={form.bankName} onChangeText={set("bankName")} placeholder="Vietcombank" />
      <Input label="Số tài khoản" keyboardType="number-pad" value={form.bankAccountNumber} onChangeText={set("bankAccountNumber")} />
      <Input label="Chủ tài khoản" autoCapitalize="characters" value={form.bankAccountName} onChangeText={set("bankAccountName")} />
      <Checkbox checked={accept} onChange={setAccept}>
        <Text className="text-sm text-brand">
          Tôi đồng ý điều khoản đối tác (hoa hồng mặc định 15%)<Text className="text-danger"> *</Text>
        </Text>
      </Checkbox>
      <Button title={profile ? "Nộp lại hồ sơ" : "Nộp hồ sơ"} full loading={apply.isPending} disabled={!accept || unverified} onPress={submit} />
    </View>
  );

  return isLg ? (
    <View className="flex-row gap-6">
      <View className="flex-1">{fields}</View>
      <View className="w-80">{benefits}</View>
    </View>
  ) : (
    <View className="gap-4">
      {benefits}
      {fields}
    </View>
  );
}
