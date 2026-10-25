import { useLocalSearchParams } from "expo-router";

import { BookingDetailView } from "@/components/booking/booking-detail";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { useBooking } from "@/services/booking.service";

// B6 – Chi tiết booking của khách (booking của người khác: API trả 404).
export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const booking = useBooking(Number(id));
  return (
    <Screen back backHref="/bookings" title="Chi tiết booking" refreshing={booking.isRefetching} onRefresh={() => void booking.refetch()}>
      <QueryState query={booking}>{(data) => <BookingDetailView booking={data} mode="customer" />}</QueryState>
    </Screen>
  );
}
