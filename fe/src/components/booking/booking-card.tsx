import { Image } from "expo-image";
import { Text, View } from "react-native";

import { BookingStatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Colors } from "@/constants/theme";
import type { Booking } from "@/types/api";
import { formatDate, formatVnd } from "@/utils/format";

// Một dòng booking: mã, badge, ảnh + tên địa điểm, gói · phòng, ngày, khách, tổng tiền.
export function BookingCard({ booking, onPress, footer, showOwnerRevenue }: { booking: Booking; onPress?: () => void; footer?: React.ReactNode; showOwnerRevenue?: boolean }) {
  return (
    <Card onPress={onPress} className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-mono text-sm font-semibold text-muted">{booking.code}</Text>
        <BookingStatusBadge booking={booking} />
      </View>
      <View className="flex-row gap-3">
        <Image
          source={booking.destination.imageUrl ?? undefined}
          style={{ width: 72, height: 72, borderRadius: 12, backgroundColor: Colors.brandSoft }}
          contentFit="cover"
        />
        <View className="flex-1 gap-0.5">
          <Text className="text-base font-bold text-brand" numberOfLines={1}>
            {booking.destination.name}
          </Text>
          <Text className="text-sm text-muted" numberOfLines={1}>
            {`${booking.package.name} · ${booking.roomType.name} × ${booking.roomsCount}`}
          </Text>
          <Text className="text-sm text-muted">{`${formatDate(booking.checkInDate)} → ${formatDate(booking.checkOutDate)} · ${booking.guests} khách`}</Text>
        </View>
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-muted">{showOwnerRevenue ? `Doanh thu của tôi: ${formatVnd(booking.ownerRevenue)}` : `${booking.nights} đêm`}</Text>
        <Text className="text-base font-bold text-brand">{formatVnd(booking.totalAmount)}</Text>
      </View>
      {footer}
    </Card>
  );
}
