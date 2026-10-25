import { useLocalSearchParams } from "expo-router";

import { BookingDetailView } from "@/components/booking/booking-detail";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { useBooking } from "@/services/booking.service";

// O7 – Xử lý booking: xác nhận, hoàn thành, hủy (bắt buộc lý do); hiện hoa hồng và doanh thu của chủ.
export default function OwnerBookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const booking = useBooking(Number(id));
  return (
    <Screen back backHref="/owner/bookings" title="Xử lý booking" refreshing={booking.isRefetching} onRefresh={() => void booking.refetch()}>
      <QueryState query={booking}>{(data) => <BookingDetailView booking={data} mode="owner" />}</QueryState>
    </Screen>
  );
}
