import { useState } from "react";
import { View } from "react-native";

import { PartnerBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, InfoRow, SectionTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { errorMessage } from "@/services/api/client";
import { useMyPartner, useUpdateMyPartner } from "@/services/partner.service";
import { toast } from "@/store/toast-store";
import type { PartnerProfile } from "@/types/api";
import { formatDateTime, formatPercent, maskAccount } from "@/utils/format";

// O5 – Hồ sơ đối tác & tài khoản nhận tiền (số tài khoản che bớt; hoa hồng chỉ đọc).
export default function OwnerProfile() {
  const partner = useMyPartner();
  return (
    <Screen title="Hồ sơ đối tác" maxWidth={760}>
      <QueryState query={partner} empty={(data) => (data ? null : { message: "Chưa có hồ sơ đối tác" })}>
        {(data) => <ProfileContent profile={data!} />}
      </QueryState>
    </Screen>
  );
}

function ProfileContent({ profile }: { profile: PartnerProfile }) {
  const update = useUpdateMyPartner();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    businessName: profile.businessName,
    businessAddress: profile.businessAddress,
    contactPhone: profile.contactPhone,
    taxCode: profile.taxCode ?? "",
    description: profile.description ?? "",
    bankName: profile.bankName ?? "",
    bankAccountNumber: profile.bankAccountNumber ?? "",
    bankAccountName: profile.bankAccountName ?? "",
  });
  const set = (key: keyof typeof form) => (value: string) => setForm({ ...form, [key]: value });

  if (editing) {
    return (
      <Card className="gap-3">
        <SectionTitle title="Sửa hồ sơ" />
        <Input label="Tên cơ sở" required value={form.businessName} onChangeText={set("businessName")} />
        <Input label="Địa chỉ kinh doanh" required value={form.businessAddress} onChangeText={set("businessAddress")} />
        <Input label="SĐT liên hệ" required keyboardType="phone-pad" value={form.contactPhone} onChangeText={set("contactPhone")} />
        <Input label="Mã số thuế" value={form.taxCode} onChangeText={set("taxCode")} />
        <Input label="Giới thiệu" multiline value={form.description} onChangeText={set("description")} />
        <Input label="Ngân hàng" value={form.bankName} onChangeText={set("bankName")} />
        <Input label="Số tài khoản" keyboardType="number-pad" value={form.bankAccountNumber} onChangeText={set("bankAccountNumber")} />
        <Input label="Chủ tài khoản" autoCapitalize="characters" value={form.bankAccountName} onChangeText={set("bankAccountName")} />
        <View className="flex-row justify-end gap-2">
          <Button title="Hủy" variant="outline" onPress={() => setEditing(false)} />
          <Button
            title="Lưu"
            loading={update.isPending}
            onPress={() =>
              update.mutate(Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim() || undefined])), {
                onSuccess: () => {
                  toast.success("Đã lưu hồ sơ đối tác");
                  setEditing(false);
                },
                onError: (error) => toast.error(errorMessage(error)),
              })
            }
          />
        </View>
      </Card>
    );
  }

  return (
    <View className="gap-4">
      <Card className="gap-1">
        <View className="mb-2 flex-row items-center justify-between">
          <SectionTitle title={profile.businessName} />
          <PartnerBadge status={profile.status} />
        </View>
        <InfoRow label="Địa chỉ" value={profile.businessAddress} />
        <InfoRow label="SĐT liên hệ" value={profile.contactPhone} />
        <InfoRow label="Mã số thuế" value={profile.taxCode ?? "—"} />
        <InfoRow label="Hoa hồng hiện tại" value={formatPercent(profile.commissionRate)} />
        <InfoRow label="Ngày được duyệt" value={profile.reviewedAt ? formatDateTime(profile.reviewedAt) : "—"} />
      </Card>
      <Card className="gap-1">
        <SectionTitle title="Tài khoản nhận tiền" className="mb-2" />
        <InfoRow label="Ngân hàng" value={profile.bankName ?? "—"} />
        <InfoRow label="Số tài khoản" value={maskAccount(profile.bankAccountNumber)} />
        <InfoRow label="Chủ tài khoản" value={profile.bankAccountName ?? "—"} />
      </Card>
      <Button title="Sửa hồ sơ" variant="outline" icon="create-outline" onPress={() => setEditing(true)} />
    </View>
  );
}
