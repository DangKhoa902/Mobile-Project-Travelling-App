import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { BookingCard } from "@/components/booking/booking-card";
import { DataTable, Pager } from "@/components/layout/data-table";
import { BookingStatusBadge } from "@/components/ui/badge";
import { Chip, ChipRow } from "@/components/ui/choice";
import { Input } from "@/components/ui/input";
import { QueryState } from "@/components/ui/state-view";
import { useDebounce } from "@/hooks/use-debounce";
import { useBookings } from "@/services/booking.service";
import type { BookingStatus } from "@/types/api";
import { BOOKING_STATUS_LABEL, formatDate, formatVnd, PAYMENT_STATUS_LABEL } from "@/utils/format";

const STATUSES: (BookingStatus | undefined)[] = [undefined, "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];

// O6 (chủ: booking tại địa điểm của mình) và M2 (staff: tất cả). Lọc trạng thái, tìm theo mã.
export function ManagedBookingList({ base, owner }: { base: "/owner/bookings" | "/admin/bookings"; owner?: boolean }) {
  const params = useLocalSearchParams<{ status?: BookingStatus }>();
  const [status, setStatus] = useState<BookingStatus | undefined>(params.status);
  const [code, setCode] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(code.trim(), 400);
  const bookings = useBookings({ scope: "managed", status, code: debounced || undefined, page });

  return (
    <View className="gap-3">
      <ChipRow>
        {STATUSES.map((item) => (
          <Chip
            key={item ?? "all"}
            label={item ? BOOKING_STATUS_LABEL[item] : "Tất cả"}
            active={status === item}
            onPress={() => {
              setStatus(item);
              setPage(1);
            }}
          />
        ))}
      </ChipRow>
      <Input left="search" placeholder="Tìm theo mã booking" value={code} onChangeText={(text) => { setCode(text); setPage(1); }} autoCapitalize="characters" />
      <QueryState query={bookings} empty={(data) => (data.data.length === 0 ? { message: "Không có booking nào", icon: "calendar-outline" } : null)}>
        {(data) => (
          <>
            <DataTable
              rows={data.data}
              keyOf={(row) => row.id}
              onPress={(row) => router.push(`${base}/${row.id}` as never)}
              renderCard={(row) => <BookingCard booking={row} showOwnerRevenue={owner} />}
              columns={[
                { key: "code", title: "Mã", width: 150, render: (row) => <Text className="font-mono text-sm text-brand">{row.code}</Text> },
                { key: "guest", title: "Khách", render: (row) => `${row.contactName} · ${row.guests} khách` },
                { key: "place", title: "Địa điểm", render: (row) => row.destination.name },
                { key: "dates", title: "Nhận → Trả", width: 190, render: (row) => `${formatDate(row.checkInDate)} → ${formatDate(row.checkOutDate)}` },
                { key: "total", title: "Tổng tiền", width: 120, align: "right", render: (row) => formatVnd(row.totalAmount) },
                ...(owner ? [{ key: "revenue", title: "Doanh thu của tôi", width: 140, align: "right" as const, render: (row: (typeof data.data)[number]) => formatVnd(row.ownerRevenue) }] : []),
                { key: "pay", title: "Thanh toán", width: 130, render: (row) => (row.payment ? PAYMENT_STATUS_LABEL[row.payment.status] : "—") },
                { key: "status", title: "Trạng thái", width: 140, render: (row) => <BookingStatusBadge booking={row} /> },
              ]}
            />
            <Pager meta={data.meta} onChange={setPage} />
          </>
        )}
      </QueryState>
    </View>
  );
}
