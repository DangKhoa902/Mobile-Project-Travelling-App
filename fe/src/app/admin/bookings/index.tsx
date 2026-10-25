import { ManagedBookingList } from "@/components/booking/managed-booking-list";
import { Screen } from "@/components/ui/screen";

// M2 – Quản lý booking (Staff/Admin nhận tất cả booking).
export default function AdminBookings() {
  return (
    <Screen title="Quản lý booking">
      <ManagedBookingList base="/admin/bookings" />
    </Screen>
  );
}
