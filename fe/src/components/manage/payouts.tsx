import { Text, View } from "react-native";

import { DataTable } from "@/components/layout/data-table";
import { PayoutBadge } from "@/components/ui/badge";
import { Card, InfoRow, SectionTitle } from "@/components/ui/card";
import { QueryState } from "@/components/ui/state-view";
import { usePayout } from "@/services/payout.service";
import type { Payout } from "@/types/api";
import { formatDate, formatDateTime, formatVnd } from "@/utils/format";

// Bảng kỳ đối soát + chi tiết booking của kỳ: dùng ở O8 (chủ) và M14 (admin).
export function PayoutTable({ rows, onPress, showOwner }: { rows: Payout[]; onPress: (row: Payout) => void; showOwner?: boolean }) {
  return (
    <DataTable
      rows={rows}
      keyOf={(row) => row.id}
      onPress={onPress}
      renderCard={(row) => (
        <Card className="gap-1">
          <View className="flex-row items-center justify-between">
            <Text className="font-bold text-brand">{`${formatDate(row.periodStart)} → ${formatDate(row.periodEnd)}`}</Text>
            <PayoutBadge status={row.status} />
          </View>
          {showOwner ? <Text className="text-sm text-muted">{row.owner.partnerProfile?.businessName ?? row.owner.name}</Text> : null}
          <InfoRow label={`${row.bookingCount} booking · khách trả`} value={formatVnd(row.grossAmount)} />
          <InfoRow label="Hoa hồng" value={formatVnd(row.commissionAmount)} />
          <InfoRow label="Số tiền nhận" value={formatVnd(row.amount)} strong />
          {row.transferRef ? <Text className="text-xs text-muted">{`Mã GD ${row.transferRef} · ${row.paidAt ? formatDateTime(row.paidAt) : ""}`}</Text> : null}
        </Card>
      )}
      columns={[
        { key: "period", title: "Kỳ", width: 200, render: (row) => `${formatDate(row.periodStart)} → ${formatDate(row.periodEnd)}` },
        ...(showOwner ? [{ key: "owner", title: "Đối tác", render: (row: Payout) => row.owner.partnerProfile?.businessName ?? row.owner.name }] : []),
        { key: "count", title: "Booking", width: 80, align: "right", render: (row) => String(row.bookingCount) },
        { key: "gross", title: "Khách trả", width: 120, align: "right", render: (row) => formatVnd(row.grossAmount) },
        { key: "commission", title: "Hoa hồng", width: 110, align: "right", render: (row) => formatVnd(row.commissionAmount) },
        { key: "amount", title: "Số tiền nhận", width: 130, align: "right", render: (row) => <Text className="font-bold text-brand">{formatVnd(row.amount)}</Text> },
        { key: "status", title: "Trạng thái", width: 120, render: (row) => <PayoutBadge status={row.status} /> },
        { key: "ref", title: "Ngày chuyển · Mã GD", width: 190, render: (row) => (row.paidAt ? `${formatDate(row.paidAt)} · ${row.transferRef ?? ""}` : "—") },
      ]}
    />
  );
}

export function PayoutDetailCard({ id }: { id: number }) {
  const payout = usePayout(id);
  return (
    <QueryState query={payout} compact>
      {(data) => (
        <Card className="gap-2">
          <SectionTitle title={`Booking trong kỳ ${formatDate(data.periodStart)} → ${formatDate(data.periodEnd)}`} />
          {data.bankAccountNumber ? <Text className="text-sm text-muted">{`Chuyển vào ${data.bankName} · ${data.bankAccountNumber} · ${data.bankAccountName}`}</Text> : null}
          {data.bookings.map((booking) => (
            <View key={booking.id} className="flex-row items-center justify-between gap-2 border-b border-line py-2">
              <View className="flex-1">
                <Text className="font-mono text-sm text-brand">{booking.code}</Text>
                <Text className="text-xs text-muted">{`${booking.destination.name} · ${formatDate(booking.checkInDate)}`}</Text>
              </View>
              <View className="items-end">
                <Text className="text-sm text-muted">{formatVnd(booking.totalAmount)}</Text>
                <Text className="font-bold text-brand">{formatVnd(booking.ownerRevenue)}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}
    </QueryState>
  );
}
