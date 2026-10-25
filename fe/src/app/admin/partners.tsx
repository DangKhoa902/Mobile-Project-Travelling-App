import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { DataTable, Pager } from "@/components/layout/data-table";
import { PartnerBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Banner, Card, InfoRow, SectionTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/choice";
import { Dialog, useDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { Colors } from "@/constants/theme";
import { useDebounce } from "@/hooks/use-debounce";
import { usePartnerActions, usePartners } from "@/services/partner.service";
import { toast } from "@/store/toast-store";
import type { AdminPartner, PartnerStatus } from "@/types/api";
import { formatDate, formatPercent } from "@/utils/format";

const hasBank = (partner: AdminPartner) => Boolean(partner.bankName && partner.bankAccountNumber && partner.bankAccountName);

// Hoa hồng nhập theo %, API nhận tỷ lệ 0–0.5.
function parseRate(value: string): number {
  const percent = Number(value.replace(",", "."));
  if (!Number.isFinite(percent) || percent < 0 || percent > 50) throw new Error("Hoa hồng từ 0 đến 50%");
  return Math.round(percent * 10) / 1000;
}

// M12 – Hồ sơ đối tác (ADMIN): duyệt + đặt hoa hồng, từ chối (lý do), tạm ngưng / mở lại, đổi hoa hồng.
export default function PartnersScreen() {
  const [status, setStatus] = useState<PartnerStatus>("PENDING");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(q.trim(), 400);
  const partners = usePartners({ status, q: debounced || undefined, page });
  const [selected, setSelected] = useState<AdminPartner | null>(null);

  return (
    <Screen title="Hồ sơ đối tác">
      <View className="gap-3">
        <Segmented
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
            setSelected(null);
          }}
          options={[
            { value: "PENDING", label: "Chờ duyệt" },
            { value: "APPROVED", label: "Đã duyệt" },
            { value: "REJECTED", label: "Bị từ chối" },
            { value: "SUSPENDED", label: "Tạm ngưng" },
          ]}
        />
        <Input left="search" placeholder="Tìm tên cơ sở, email" value={q} onChangeText={setQ} />
        <QueryState query={partners} empty={(data) => (data.data.length === 0 ? { message: "Không có hồ sơ", icon: "briefcase-outline" } : null)}>
          {(data) => (
            <>
              <DataTable
                rows={data.data}
                keyOf={(row) => row.id}
                onPress={(row) => setSelected(selected?.id === row.id ? null : row)}
                renderCard={(row) => (
                  <Card className="gap-1">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="flex-1 font-bold text-brand">{row.businessName}</Text>
                      <PartnerBadge status={row.status} />
                    </View>
                    <Text className="text-xs text-muted">{`${row.user.name} · ${row.user.email} · ${row.contactPhone}`}</Text>
                    <Text className="text-xs text-muted">{`Ngân hàng ${hasBank(row) ? "✓" : "✗"} · ${row.user._count.ownedDestinations} địa điểm · HH ${formatPercent(row.commissionRate)}`}</Text>
                  </Card>
                )}
                columns={[
                  { key: "name", title: "Tên cơ sở", render: (row) => <Text className="font-semibold text-brand">{row.businessName}</Text> },
                  { key: "user", title: "Người nộp", render: (row) => `${row.user.name} · ${row.user.email}` },
                  { key: "phone", title: "SĐT", width: 120, render: (row) => row.contactPhone },
                  { key: "tax", title: "MST", width: 110, render: (row) => row.taxCode ?? "—" },
                  {
                    key: "bank",
                    title: "Ngân hàng",
                    width: 90,
                    render: (row) => <Ionicons name={hasBank(row) ? "checkmark-circle" : "close-circle"} size={18} color={hasBank(row) ? Colors.brandLight : Colors.danger} />,
                  },
                  { key: "count", title: "Địa điểm", width: 80, align: "right", render: (row) => String(row.user._count.ownedDestinations) },
                  { key: "date", title: "Ngày nộp", width: 110, render: (row) => formatDate(row.createdAt) },
                  { key: "rate", title: "Hoa hồng", width: 90, align: "right", render: (row) => formatPercent(row.commissionRate) },
                ]}
              />
              <Pager meta={data.meta} onChange={setPage} />
            </>
          )}
        </QueryState>
        {selected ? <PartnerPanel partner={selected} onChanged={() => setSelected(null)} /> : null}
      </View>
    </Screen>
  );
}

function PartnerPanel({ partner, onChanged }: { partner: AdminPartner; onChanged: () => void }) {
  const actions = usePartnerActions();
  const approve = useDialog();
  const reject = useDialog();
  const suspend = useDialog();
  const commission = useDialog();
  const bank = hasBank(partner);

  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <SectionTitle title={partner.businessName} />
        <PartnerBadge status={partner.status} />
      </View>
      <InfoRow label="Địa chỉ" value={partner.businessAddress} />
      <InfoRow label="Người nộp" value={`${partner.user.name} (${partner.user.email})`} />
      <InfoRow label="Giới thiệu" value={partner.description ?? "—"} />
      <InfoRow label="Ngân hàng" value={bank ? `${partner.bankName} · ${partner.bankAccountNumber} · ${partner.bankAccountName}` : "Chưa đủ thông tin"} tone={bank ? undefined : "danger"} />
      <InfoRow label="Hoa hồng" value={formatPercent(partner.commissionRate)} />
      {partner.rejectReason ? <Banner tone="danger" title="Lý do từ chối">{partner.rejectReason}</Banner> : null}
      <View className="flex-row flex-wrap justify-end gap-2">
        <Button title="Lịch sử thao tác" size="sm" variant="ghost" onPress={() => router.push(`/admin/audit-logs?entity=PartnerProfile&entityId=${partner.id}`)} />
        {partner.status === "PENDING" ? (
          <>
            <Button title="Từ chối" size="sm" variant="outline" onPress={() => reject.open(true)} />
            <Button title={bank ? "Duyệt" : "Thiếu ngân hàng"} size="sm" disabled={!bank} onPress={() => approve.open(true)} />
          </>
        ) : null}
        {partner.status === "APPROVED" ? (
          <>
            <Button title="Đổi hoa hồng" size="sm" variant="outline" onPress={() => commission.open(true)} />
            <Button title="Tạm ngưng" size="sm" variant="danger" onPress={() => suspend.open(true)} />
          </>
        ) : null}
        {partner.status === "SUSPENDED" ? <Button title="Mở lại" size="sm" onPress={() => suspend.open(true)} /> : null}
      </View>

      <Dialog
        open={approve.isOpen}
        onClose={approve.close}
        title={`Duyệt ${partner.businessName}?`}
        message="Người nộp sẽ trở thành Chủ địa điểm và đăng tin được."
        input={{ label: "Hoa hồng (%)", initial: String(Math.round(partner.commissionRate * 1000) / 10), required: true }}
        confirmLabel="Duyệt"
        onConfirm={async (value) => {
          await actions.review.mutateAsync({ id: partner.id, status: "APPROVED", commissionRate: parseRate(value) });
          toast.success("Đã duyệt đối tác");
          onChanged();
        }}
      />
      <Dialog
        open={reject.isOpen}
        onClose={reject.close}
        title="Từ chối hồ sơ?"
        input={{ label: "Lý do từ chối", required: true, minLength: 3, suggestions: ["Thiếu giấy tờ kinh doanh", "Thông tin ngân hàng sai", "Địa chỉ không xác minh được"] }}
        confirmLabel="Từ chối"
        destructive
        onConfirm={async (reason) => {
          await actions.review.mutateAsync({ id: partner.id, status: "REJECTED", rejectReason: reason });
          toast.success("Đã từ chối hồ sơ");
          onChanged();
        }}
      />
      <Dialog
        open={suspend.isOpen}
        onClose={suspend.close}
        title={partner.status === "SUSPENDED" ? "Mở lại đối tác?" : "Tạm ngưng đối tác?"}
        message={partner.status === "SUSPENDED" ? "Các địa điểm của đối tác sẽ hiển thị lại." : "Mọi địa điểm của đối tác sẽ bị ẩn khỏi sàn."}
        input={{ label: "Lý do", placeholder: "Không bắt buộc" }}
        destructive={partner.status !== "SUSPENDED"}
        onConfirm={async (reason) => {
          await actions.setStatus.mutateAsync({ id: partner.id, status: partner.status === "SUSPENDED" ? "APPROVED" : "SUSPENDED", reason: reason || undefined });
          toast.success("Đã cập nhật đối tác");
          onChanged();
        }}
      />
      <Dialog
        open={commission.isOpen}
        onClose={commission.close}
        title="Đổi hoa hồng"
        message="Chỉ áp dụng cho booking mới."
        input={{ label: "Hoa hồng (%)", initial: String(Math.round(partner.commissionRate * 1000) / 10), required: true }}
        onConfirm={async (value) => {
          await actions.setCommission.mutateAsync({ id: partner.id, commissionRate: parseRate(value) });
          toast.success("Đã đổi hoa hồng");
          onChanged();
        }}
      />
    </Card>
  );
}
