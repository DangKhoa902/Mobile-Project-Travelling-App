import { useQuery } from "@tanstack/react-query";
import { FlatList, Text, View } from "react-native";

import { RequireAuth } from "@/components/require-auth";
import { Screen } from "@/components/screen";
import { StateView } from "@/components/state-view";
import { bookingService } from "@/services/travel.service";
import type { BookingStatus, BookingSummary } from "@/types/api";
import { BOOKING_STATUS_LABEL, formatDate, formatVnd } from "@/utils/format";

const STATUS_STYLE: Record<BookingStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-sky-100 text-sky-800",
  CANCELLED: "bg-zinc-200 text-zinc-600",
};

export default function BookingsScreen() {
  return (
    <Screen title="Chuyến đi của tôi">
      <RequireAuth message="Đăng nhập để đặt dịch vụ và theo dõi lịch sử đặt chỗ.">
        <BookingList />
      </RequireAuth>
    </Screen>
  );
}

function BookingList() {
  const bookings = useQuery({ queryKey: ["bookings"], queryFn: bookingService.list });

  if (bookings.isPending) return <StateView kind="loading" />;
  if (bookings.isError) {
    return <StateView kind="error" message={bookings.error.message} onRetry={() => void bookings.refetch()} />;
  }
  return (
    <FlatList
      data={bookings.data.data}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <BookingRow booking={item} />}
      ItemSeparatorComponent={() => <View className="h-3" />}
      contentContainerClassName="pb-28"
      refreshing={bookings.isRefetching}
      onRefresh={() => void bookings.refetch()}
      ListEmptyComponent={<StateView kind="empty" icon="airplane-outline" message="Bạn chưa có booking nào." />}
    />
  );
}

function BookingRow({ booking }: { booking: BookingSummary }) {
  const [badgeBg, badgeText] = STATUS_STYLE[booking.status].split(" ");
  return (
    <View className="gap-2 rounded-2xl bg-surface-card p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-semibold text-muted">{booking.code}</Text>
        <View className={`rounded-full px-3 py-1 ${badgeBg}`}>
          <Text className={`text-xs font-semibold ${badgeText}`}>{BOOKING_STATUS_LABEL[booking.status]}</Text>
        </View>
      </View>
      <Text className="text-base font-bold text-brand">{booking.destination.name}</Text>
      <Text className="text-sm text-muted">
        {booking.package.name} · {booking.roomType.name} × {booking.roomsCount}
      </Text>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-muted">
          {formatDate(booking.checkInDate)} → {formatDate(booking.checkOutDate)} · {booking.guests} khách
        </Text>
        <Text className="text-base font-bold text-brand">{formatVnd(booking.totalAmount)}</Text>
      </View>
    </View>
  );
}
