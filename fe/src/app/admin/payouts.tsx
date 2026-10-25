import { useState } from "react";
import { Text, View } from "react-native";

import { DataTable, Pager } from "@/components/layout/data-table";
import { PayoutDetailCard, PayoutTable } from "@/components/manage/payouts";
import { Button } from "@/components/ui/button";
import { Banner, Card, InfoRow } from "@/components/ui/card";
import { Chip, ChipRow, Segmented } from "@/components/ui/choice";
import { DateField } from "@/components/ui/date-field";
import { Dialog, useDialog } from "@/components/ui/dialog";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { usePayoutActions, usePayoutPreview, usePayouts } from "@/services/payout.service";
import { toast } from "@/store/toast-store";
import type { Payout, PayoutPreviewRow, PayoutStatus } from "@/types/api";
import { addDays, formatDate, formatVnd, PAYOUT_STATUS_LABEL, todayIso } from "@/utils/format";

// Mặc định tháng trước (kỳ phải đã kết thúc).
function lastMonth() {
  const firstThisMonth = `${todayIso().slice(0, 7)}-01`;
  const end = addDays(firstThisMonth, -1);
  return { start: `${end.slice(0, 7)}-01`, end };
}

// M14 – Đối soát (ADMIN): xem trước theo kỳ → Lập kỳ; các kỳ đã lập → Xác nhận đã chuyển / Hủy kỳ.
export default function AdminPayouts() {
  const [tab, setTab] = useState<"preview" | "list">("preview");
  return (
    <Screen title="Đối soát">
      <View className="gap-4">
        <Segmented value={tab} onChange={setTab} options={[{ value: "preview", label: "Lập kỳ mới" }, { value: "list", label: "Các kỳ đã lập" }]} />
        {tab === "preview" ? <PreviewTab /> : <ListTab />}
      </View>
    </Screen>
  );
}

function PreviewTab() {
  const initial = lastMonth();
  const [start, setStart] = useState<string | null>(initial.start);
  const [end, setEnd] = useState<string | null>(initial.end);
  const preview = usePayoutPreview(start ?? "", end ?? "", Boolean(start && end));
  const { create } = usePayoutActions();
  const confirm = useDialog<PayoutPreviewRow>();

  return (
    <View className="gap-4">
      <View className="gap-3 md:flex-row">
        <View className="flex-1">
          <DateField label="Từ ngày" value={start} onChange={setStart} max={todayIso()} />
        </View>
        <View className="flex-1">
          <DateField label="Đến ngày" value={end} onChange={setEnd} min={start ?? undefined} max={addDays(todayIso(), -1)} />
        </View>
      </View>
      <Text className="text-xs text-muted">Chỉ tính booking đã hoàn thành, chưa thuộc kỳ nào. Kỳ phải đã kết thúc.</Text>
      <QueryState query={preview} empty={(data) => (data.length === 0 ? { message: "Không có booking cần đối soát trong kỳ này", icon: "cash-outline" } : null)}>
        {(data) => (
          <DataTable
            rows={data}
            keyOf={(row) => row.ownerId}
            renderCard={(row) => (
              <Card className="gap-1">
                <Text className="font-bold text-brand">{row.businessName}</Text>
                <InfoRow label={`${row.bookingCount} booking · khách trả`} value={formatVnd(row.grossAmount)} />
                <InfoRow label="Hoa hồng" value={formatVnd(row.commissionAmount)} />
                <InfoRow label="Phải chuyển" value={formatVnd(row.amount)} strong />
                <Button title={row.hasBankAccount ? "Lập kỳ" : "Thiếu tài khoản ngân hàng"} size="sm" disabled={!row.hasBankAccount} onPress={() => confirm.open(row)} />
              </Card>
            )}
            columns={[
              { key: "name", title: "Cơ sở", render: (row) => <Text className="font-semibold text-brand">{row.businessName}</Text> },
              { key: "count", title: "Booking", width: 80, align: "right", render: (row) => String(row.bookingCount) },
              { key: "gross", title: "Khách trả", width: 130, align: "right", render: (row) => formatVnd(row.grossAmount) },
              { key: "commission", title: "Hoa hồng", width: 120, align: "right", render: (row) => formatVnd(row.commissionAmount) },
              { key: "amount", title: "Phải chuyển", width: 130, align: "right", render: (row) => <Text className="font-bold text-brand">{formatVnd(row.amount)}</Text> },
              { key: "bank", title: "Ngân hàng", width: 100, render: (row) => (row.hasBankAccount ? "Có" : <Text className="text-danger">Chưa có</Text>) },
              { key: "action", title: "", width: 120, render: (row) => <Button title="Lập kỳ" size="sm" disabled={!row.hasBankAccount} onPress={() => confirm.open(row)} /> },
            ]}
          />
        )}
      </QueryState>
      <Dialog
        open={confirm.isOpen}
        onClose={confirm.close}
        title={`Lập kỳ cho ${confirm.target?.businessName}?`}
        message={confirm.target ? `${formatDate(start!)} → ${formatDate(end!)} · ${confirm.target.bookingCount} booking · phải chuyển ${formatVnd(confirm.target.amount)}` : undefined}
        input={{ label: "Ghi chú", placeholder: "Không bắt buộc" }}
        confirmLabel="Lập kỳ"
        onConfirm={async (note) => {
          const target = confirm.target;
          if (!target || !start || !end) return;
          await create.mutateAsync({ ownerId: target.ownerId, periodStart: start, periodEnd: end, ...(note ? { note } : {}) });
          toast.success("Đã lập kỳ đối soát");
        }}
      />
    </View>
  );
}

function ListTab() {
  const [status, setStatus] = useState<PayoutStatus | undefined>("PENDING");
  const [page, setPage] = useState(1);
  const payouts = usePayouts({ status, page });
  const { pay, cancel } = usePayoutActions();
  const [selected, setSelected] = useState<Payout | null>(null);
  const payDialog = useDialog<Payout>();
  const cancelDialog = useDialog<Payout>();

  return (
    <View className="gap-3">
      <ChipRow>
        {([undefined, "PENDING", "PAID", "CANCELLED"] as (PayoutStatus | undefined)[]).map((item) => (
          <Chip key={item ?? "all"} label={item ? PAYOUT_STATUS_LABEL[item] : "Tất cả"} active={status === item} onPress={() => { setStatus(item); setPage(1); }} />
        ))}
      </ChipRow>
      <QueryState query={payouts} empty={(data) => (data.data.length === 0 ? { message: "Không có kỳ đối soát", icon: "cash-outline" } : null)}>
        {(data) => (
          <>
            <PayoutTable rows={data.data} showOwner onPress={(row) => setSelected(selected?.id === row.id ? null : row)} />
            <Pager meta={data.meta} onChange={setPage} />
          </>
        )}
      </QueryState>
      {selected ? (
        <View className="gap-3">
          {selected.status === "PENDING" ? (
            <Card className="flex-row flex-wrap items-center justify-end gap-2">
              <Text className="flex-1 font-semibold text-brand">{`${selected.owner.partnerProfile?.businessName ?? selected.owner.name} · ${formatVnd(selected.amount)}`}</Text>
              <Button title="Hủy kỳ" size="sm" variant="outline" onPress={() => cancelDialog.open(selected)} />
              <Button title="Xác nhận đã chuyển" size="sm" onPress={() => payDialog.open(selected)} />
            </Card>
          ) : null}
          <PayoutDetailCard id={selected.id} />
        </View>
      ) : null}
      <Dialog
        open={payDialog.isOpen}
        onClose={payDialog.close}
        title="Xác nhận đã chuyển khoản"
        input={{ label: "Mã giao dịch ngân hàng", required: true, minLength: 3 }}
        confirmLabel="Xác nhận"
        onConfirm={async (transferRef) => {
          const target = payDialog.target;
          if (!target) return;
          await pay.mutateAsync({ id: target.id, transferRef });
          toast.success("Đã xác nhận chuyển tiền, đối tác được thông báo");
          setSelected(null);
        }}>
        {payDialog.target ? (
          <Banner tone="warning" title="Đối chiếu tài khoản nhận trước khi chuyển">
            {`${payDialog.target.bankName} · ${payDialog.target.bankAccountNumber} · ${payDialog.target.bankAccountName}\nSố tiền: ${formatVnd(payDialog.target.amount)}`}
          </Banner>
        ) : null}
      </Dialog>
      <Dialog
        open={cancelDialog.isOpen}
        onClose={cancelDialog.close}
        title="Hủy kỳ đối soát?"
        message="Các booking của kỳ trở về trạng thái chưa đối soát."
        input={{ label: "Lý do", placeholder: "Không bắt buộc" }}
        confirmLabel="Hủy kỳ"
        destructive
        onConfirm={async (reason) => {
          const target = cancelDialog.target;
          if (!target) return;
          await cancel.mutateAsync({ id: target.id, reason: reason || undefined });
          toast.success("Đã hủy kỳ");
          setSelected(null);
        }}
      />
    </View>
  );
}
