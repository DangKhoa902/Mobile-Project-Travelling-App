import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { BookingCard } from "@/components/booking/booking-card";
import { RequireAuth } from "@/components/layout/require-auth";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/choice";
import { Screen } from "@/components/ui/screen";
import { StateView } from "@/components/ui/state-view";
import { useBookings } from "@/services/booking.service";
import { useAuthStore } from "@/store/auth-store";
import type { Booking } from "@/types/api";

type Tab = "upcoming" | "completed" | "cancelled";

// T3 – Chuyến đi của tôi: Sắp tới (PENDING + CONFIRMED) · Đã hoàn thành · Đã hủy.
export default function BookingsScreen() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const authed = useAuthStore((state) => state.status === "authenticated");

  // "Sắp tới" gọi hai trạng thái rồi ghép (backend nhận một status mỗi lần).
  const pending = useBookings({ scope: "mine", status: "PENDING", limit: 50 }, authed && tab === "upcoming");
  const confirmed = useBookings({ scope: "mine", status: "CONFIRMED", limit: 50 }, authed && tab === "upcoming");
  const completed = useBookings({ scope: "mine", status: "COMPLETED", limit: 50 }, authed && tab === "completed");
  const cancelled = useBookings({ scope: "mine", status: "CANCELLED", limit: 50 }, authed && tab === "cancelled");

  const queries = tab === "upcoming" ? [pending, confirmed] : tab === "completed" ? [completed] : [cancelled];
  const loading = queries.some((query) => query.isPending);
  const failed = queries.find((query) => query.isError);
  const rows: Booking[] = queries
    .flatMap((query) => query.data?.data ?? [])
    .sort((a, b) => (tab === "upcoming" ? a.checkInDate.localeCompare(b.checkInDate) : b.checkInDate.localeCompare(a.checkInDate)));

  return (
    <Screen title="Chuyến đi của tôi" refreshing={queries.some((q) => q.isRefetching)} onRefresh={() => queries.forEach((q) => void q.refetch())}>
      <RequireAuth message="Đăng nhập để xem các chuyến đi đã đặt">
        <View className="gap-4">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "upcoming", label: "Sắp tới" },
              { value: "completed", label: "Đã hoàn thành" },
              { value: "cancelled", label: "Đã hủy" },
            ]}
          />
          {loading ? (
            <StateView kind="loading" />
          ) : failed ? (
            <StateView kind="error" error={failed.error} onRetry={() => void failed.refetch()} />
          ) : rows.length === 0 ? (
            <StateView kind="empty" icon="airplane-outline" message="Bạn chưa có chuyến đi nào" action={{ label: "Khám phá ngay", onPress: () => router.navigate("/") }} />
          ) : (
            <View className="gap-3 lg:flex-row lg:flex-wrap">
              {rows.map((booking) => (
                <View key={booking.id} className="lg:w-[49%]">
                  <BookingCard
                    booking={booking}
                    onPress={() => router.push(`/bookings/${booking.id}`)}
                    footer={
                      booking.status === "COMPLETED" && !booking.review ? (
                        <Button title="Đánh giá" size="sm" variant="secondary" icon="star-outline" onPress={() => router.push(`/reviews/new?bookingId=${booking.id}`)} />
                      ) : null
                    }
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </RequireAuth>
    </Screen>
  );
}
