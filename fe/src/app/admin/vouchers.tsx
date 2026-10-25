import { useState } from "react";
import { Text, View } from "react-native";

import { DataTable, Pager } from "@/components/layout/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, InfoRow } from "@/components/ui/card";
import { Chip, Toggle } from "@/components/ui/choice";
import { DateField } from "@/components/ui/date-field";
import { Dialog } from "@/components/ui/dialog";
import { Input, toInt } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { manageService, useManageMutation, useVouchers, type VoucherInput } from "@/services/manage.service";
import { toast } from "@/store/toast-store";
import type { Voucher } from "@/types/api";
import { addDays, formatDate, formatVnd, todayIso } from "@/utils/format";

const describe = (voucher: Voucher) => (voucher.discountType === "PERCENT" ? `${voucher.value}%${voucher.maxDiscount ? ` (tối đa ${formatVnd(voucher.maxDiscount)})` : ""}` : formatVnd(voucher.value));

// M10 – Mã giảm giá (ADMIN): bảng + form tạo / sửa.
export default function VouchersScreen() {
  const [page, setPage] = useState(1);
  const vouchers = useVouchers(page);
  const [editing, setEditing] = useState<Voucher | "new" | null>(null);

  return (
    <Screen title="Voucher" right={<Button title="Tạo voucher" size="sm" icon="add" onPress={() => setEditing("new")} />}>
      <QueryState query={vouchers} empty={(data) => (data.data.length === 0 ? { message: "Chưa có voucher", icon: "ticket-outline" } : null)}>
        {(data) => (
          <>
            <DataTable
              rows={data.data}
              keyOf={(row) => row.id}
              onPress={setEditing}
              renderCard={(row) => (
                <Card className="gap-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-mono text-base font-bold text-brand">{row.code}</Text>
                    <Badge label={row.isActive ? "Đang bật" : "Tắt"} tone={row.isActive ? "green" : "gray"} />
                  </View>
                  <InfoRow label="Giảm" value={describe(row)} />
                  <InfoRow label="Đã dùng" value={`${row.usedCount}/${row.usageLimit ?? "∞"}`} />
                  <InfoRow label="Hiệu lực" value={`${formatDate(row.startsAt)} → ${formatDate(row.endsAt)}`} />
                </Card>
              )}
              columns={[
                { key: "code", title: "Mã", width: 140, render: (row) => <Text className="font-mono font-bold text-brand">{row.code}</Text> },
                { key: "value", title: "Giảm", render: (row) => describe(row) },
                { key: "min", title: "Đơn tối thiểu", width: 130, align: "right", render: (row) => formatVnd(row.minOrderValue) },
                { key: "used", title: "Đã dùng", width: 100, align: "right", render: (row) => `${row.usedCount}/${row.usageLimit ?? "∞"}` },
                { key: "range", title: "Hiệu lực", width: 200, render: (row) => `${formatDate(row.startsAt)} → ${formatDate(row.endsAt)}` },
                { key: "active", title: "Trạng thái", width: 100, render: (row) => <Badge label={row.isActive ? "Đang bật" : "Tắt"} tone={row.isActive ? "green" : "gray"} /> },
              ]}
            />
            <Pager meta={data.meta} onChange={setPage} />
          </>
        )}
      </QueryState>
      <VoucherDialog voucher={editing} onClose={() => setEditing(null)} />
    </Screen>
  );
}

function VoucherDialog({ voucher, onClose }: { voucher: Voucher | "new" | null; onClose: () => void }) {
  const save = useManageMutation(({ id, input }: { id: number | null; input: Partial<VoucherInput> }) => manageService.saveVoucher(id, input));
  const existing = voucher && voucher !== "new" ? voucher : null;
  const [form, setForm] = useState(() => initial(existing));
  const [key, setKey] = useState<unknown>(null);
  if (voucher !== key) {
    setKey(voucher);
    setForm(initial(existing));
  }

  return (
    <Dialog
      open={voucher !== null}
      onClose={onClose}
      title={existing ? `Sửa ${existing.code}` : "Tạo voucher"}
      confirmLabel="Lưu"
      onConfirm={async () => {
        if (!form.startsAt || !form.endsAt) throw new Error("Chọn ngày bắt đầu và kết thúc");
        await save.mutateAsync({
          id: existing?.id ?? null,
          input: {
            ...(existing ? {} : { code: form.code.trim().toUpperCase() }),
            description: form.description.trim() || null,
            discountType: form.discountType,
            value: toInt(form.value) ?? 0,
            maxDiscount: toInt(form.maxDiscount) ?? null,
            minOrderValue: toInt(form.minOrderValue) ?? 0,
            usageLimit: toInt(form.usageLimit) ?? null,
            startsAt: `${form.startsAt}T00:00:00+07:00`,
            endsAt: `${form.endsAt}T23:59:59+07:00`,
            isActive: form.isActive,
          },
        });
        toast.success("Đã lưu voucher");
      }}>
      <View className="gap-3">
        {!existing ? <Input label="Mã" required autoCapitalize="characters" value={form.code} onChangeText={(code) => setForm({ ...form, code })} placeholder="SUMMER20" /> : null}
        <Input label="Mô tả" value={form.description} onChangeText={(description) => setForm({ ...form, description })} />
        <View className="flex-row gap-2">
          <Chip label="Theo %" active={form.discountType === "PERCENT"} onPress={() => setForm({ ...form, discountType: "PERCENT" })} />
          <Chip label="Số tiền cố định" active={form.discountType === "FIXED"} onPress={() => setForm({ ...form, discountType: "FIXED" })} />
        </View>
        <View className="flex-row gap-2">
          <Input className="flex-1" label={form.discountType === "PERCENT" ? "Giảm (%)" : "Giảm (VNĐ)"} required keyboardType="number-pad" value={form.value} onChangeText={(value) => setForm({ ...form, value })} />
          {form.discountType === "PERCENT" ? <Input className="flex-1" label="Giảm tối đa" keyboardType="number-pad" value={form.maxDiscount} onChangeText={(maxDiscount) => setForm({ ...form, maxDiscount })} /> : null}
        </View>
        <View className="flex-row gap-2">
          <Input className="flex-1" label="Đơn tối thiểu" keyboardType="number-pad" value={form.minOrderValue} onChangeText={(minOrderValue) => setForm({ ...form, minOrderValue })} />
          <Input className="flex-1" label="Giới hạn lượt" keyboardType="number-pad" value={form.usageLimit} onChangeText={(usageLimit) => setForm({ ...form, usageLimit })} placeholder="Không giới hạn" />
        </View>
        <DateField label="Bắt đầu" required value={form.startsAt} onChange={(startsAt) => setForm({ ...form, startsAt })} />
        <DateField label="Kết thúc" required value={form.endsAt} onChange={(endsAt) => setForm({ ...form, endsAt })} min={form.startsAt ?? undefined} />
        <Toggle label="Đang bật" value={form.isActive} onChange={(isActive) => setForm({ ...form, isActive })} />
      </View>
    </Dialog>
  );
}

function initial(voucher: Voucher | null) {
  return {
    code: voucher?.code ?? "",
    description: voucher?.description ?? "",
    discountType: voucher?.discountType ?? ("PERCENT" as "PERCENT" | "FIXED"),
    value: voucher ? String(voucher.value) : "",
    maxDiscount: voucher?.maxDiscount ? String(voucher.maxDiscount) : "",
    minOrderValue: voucher ? String(voucher.minOrderValue) : "0",
    usageLimit: voucher?.usageLimit ? String(voucher.usageLimit) : "",
    startsAt: (voucher?.startsAt.slice(0, 10) ?? todayIso()) as string | null,
    endsAt: (voucher?.endsAt.slice(0, 10) ?? addDays(todayIso(), 30)) as string | null,
    isActive: voucher?.isActive ?? true,
  };
}
