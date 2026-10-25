import { useLocalSearchParams } from "expo-router";

import { BookingDetailView } from "@/components/booking/booking-detail";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { useBooking } from "@/services/booking.service";

// M3 – Xử lý booking (Staff được hủy kể cả khi quá hạn miễn phí; mỗi thao tác backend tự báo cho khách).
export default function AdminBookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const booking = useBooking(Number(id));
  return (
    <Screen back backHref="/admin/bookings" title="Xử lý booking" refreshing={booking.isRefetching} onRefresh={() => void booking.refetch()}>
      <QueryState query={booking}>{(data) => <BookingDetailView booking={data} mode="staff" />}</QueryState>
    </Screen>
  );
}
