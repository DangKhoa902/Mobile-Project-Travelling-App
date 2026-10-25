import { ManagedBookingList } from "@/components/booking/managed-booking-list";
import { Screen } from "@/components/ui/screen";

// O6 – Booking tại cơ sở của tôi (OWNER mặc định scope=managed).
export default function OwnerBookings() {
  return (
    <Screen title="Booking tại cơ sở">
      <ManagedBookingList base="/owner/bookings" owner />
    </Screen>
  );
}
