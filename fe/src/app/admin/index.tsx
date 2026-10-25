import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { BarChart, defaultRange, HBars, RangePicker, StatCard, TodoCard } from "@/components/dashboard/widgets";
import { DataTable } from "@/components/layout/data-table";
import { ShortcutGrid } from "@/components/layout/manage-shell";
import { ADMIN_NAV } from "@/components/layout/nav";
import { Card, SectionTitle } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { Colors } from "@/constants/theme";
import { useStaffPending, useStats } from "@/services/stats.service";
import { useAuthStore } from "@/store/auth-store";
import type { BookingStatus } from "@/types/api";
import { BOOKING_STATUS_LABEL, formatShortVnd, formatVnd, PAYMENT_METHOD_LABEL } from "@/utils/format";

const STATUS_COLOR: Record<BookingStatus, string> = { PENDING: Colors.accent, CONFIRMED: Colors.brandLight, COMPLETED: Colors.info, CANCELLED: Colors.muted };

// M1 – Tổng quan toàn sàn (ADMIN). Staff không gọi được /stats/overview: chỉ thấy "Việc cần xử lý".
export default function AdminDashboard() {
  const role = useAuthStore((state) => state.user?.role);
  return (
    <Screen title="Tổng quan" subtitle={role === "ADMIN" ? "Doanh thu chỉ tính booking đã xác nhận / hoàn thành, theo ngày đặt" : "Việc cần xử lý của CSKH"}>
      <View className="gap-5">
        <ShortcutGrid items={ADMIN_NAV} />
        {role === "ADMIN" ? <PlatformStats /> : <StaffTodo />}
      </View>
    </Screen>
  );
}

function StaffTodo() {
  const pending = useStaffPending(true);
  return (
    <QueryState query={pending}>
      {(data) => (
        <View className="flex-row flex-wrap gap-3">
          <TodoCard label="Booking chờ xác nhận" count={data.bookingsToConfirm} icon="hourglass-outline" onPress={() => router.push("/admin/bookings?status=PENDING")} />
          <TodoCard label="Đánh giá chờ duyệt" count={data.reviewsToModerate} icon="star-outline" onPress={() => router.push("/admin/reviews")} />
          <TodoCard label="Hội thoại đang mở" count={data.openConversations} icon="chatbubbles-outline" onPress={() => router.push("/admin/support")} />
        </View>
      )}
    </QueryState>
  );
}

function PlatformStats() {
  const [range, setRange] = useState(defaultRange(30));
  const stats = useStats(range.from, range.to);
  return (
    <View className="gap-5">
      <RangePicker value={range} onChange={setRange} />
      <QueryState query={stats}>
        {(data) => (
          <View className="gap-5">
            <View className="flex-row flex-wrap gap-3">
              <StatCard label="Tổng giá trị booking (GBV)" value={formatShortVnd(data.summary.grossBookingValue)} hint={formatVnd(data.summary.grossBookingValue)} icon="trending-up-outline" />
              <StatCard label="Doanh thu sàn (hoa hồng)" value={formatShortVnd(data.summary.platformRevenue)} icon="wallet-outline" />
              <StatCard label="Doanh thu trả đối tác" value={formatShortVnd(data.summary.ownerRevenue)} icon="business-outline" />
              <StatCard label="Booking đã chốt" value={`${data.summary.confirmedBookings}/${data.summary.totalBookings}`} icon="checkmark-done-outline" />
              <StatCard label="Tỷ lệ hủy" value={`${data.summary.cancellationRate}%`} icon="close-circle-outline" tone={data.summary.cancellationRate > 30 ? "danger" : "brand"} />
              <StatCard label="Giá trị TB / booking" value={formatShortVnd(data.summary.averageBookingValue)} icon="calculator-outline" />
              <StatCard label="Người dùng mới" value={String(data.users?.newUsers ?? 0)} hint={`Tổng ${data.users?.totalUsers ?? 0}`} icon="person-add-outline" />
              <StatCard label="Đối tác đang hoạt động" value={String(data.users?.activeOwners ?? 0)} icon="briefcase-outline" />
            </View>

            <SectionTitle title="Việc cần xử lý" />
            <View className="flex-row flex-wrap gap-3">
              <TodoCard label="Hồ sơ đối tác chờ duyệt" count={data.pending.partnerApplications ?? 0} icon="briefcase-outline" onPress={() => router.push("/admin/partners")} />
              <TodoCard label="Tin đăng chờ duyệt" count={data.pending.listingsToReview ?? 0} icon="home-outline" onPress={() => router.push("/admin/listings")} />
              <TodoCard label="Đánh giá chờ duyệt" count={data.pending.reviewsToModerate ?? 0} icon="star-outline" onPress={() => router.push("/admin/reviews")} />
              <TodoCard label="Booking chờ xác nhận" count={data.pending.bookingsToConfirm} icon="hourglass-outline" onPress={() => router.push("/admin/bookings?status=PENDING")} />
              <TodoCard label="Hội thoại đang mở" count={data.pending.openConversations ?? 0} icon="chatbubbles-outline" onPress={() => router.push("/admin/support")} />
            </View>

            <View className="gap-5 lg:flex-row">
              <Card className="gap-3 lg:flex-[2]">
                <SectionTitle title="Doanh thu theo ngày" />
                <BarChart
                  data={data.revenueByDay}
                  series={[
                    { key: "commission", label: "Hoa hồng sàn", color: Colors.accent },
                    { key: "ownerRevenue", label: "Doanh thu đối tác", color: Colors.brandLight },
                  ]}
                />
              </Card>
              <View className="gap-5 lg:flex-1">
                <Card className="gap-3">
                  <SectionTitle title="Booking theo trạng thái" />
                  <HBars items={(Object.entries(data.bookingsByStatus) as [BookingStatus, number][]).map(([status, value]) => ({ label: BOOKING_STATUS_LABEL[status], value, color: STATUS_COLOR[status] }))} />
                </Card>
                <Card className="gap-3">
                  <SectionTitle title="Phương thức thanh toán" />
                  <HBars items={data.paymentMethods.map((item) => ({ label: `${PAYMENT_METHOD_LABEL[item.method]} (${item.count})`, value: item.amount, display: formatShortVnd(item.amount) }))} />
                </Card>
              </View>
            </View>

            <SectionTitle title="Top địa điểm" />
            <DataTable
              rows={data.topDestinations.slice(0, 5)}
              keyOf={(row) => row.id}
              renderCard={(row) => (
                <Card className="flex-row items-center justify-between gap-2">
                  <View className="flex-1">
                    <Text className="font-bold text-brand" numberOfLines={1}>
                      {row.name}
                    </Text>
                    <Text className="text-xs text-muted">{`${row.location ?? ""} · ${row.bookings} booking`}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="font-bold text-brand">{formatShortVnd(row.grossBookingValue)}</Text>
                    <Text className="text-xs text-muted">{`HH ${formatShortVnd(row.commission)}`}</Text>
                  </View>
                </Card>
              )}
              columns={[
                { key: "name", title: "Địa điểm", render: (row) => row.name },
                { key: "location", title: "Khu vực", width: 130, render: (row) => row.location ?? "—" },
                { key: "bookings", title: "Booking", width: 90, align: "right", render: (row) => String(row.bookings) },
                { key: "gbv", title: "GBV", width: 130, align: "right", render: (row) => formatVnd(row.grossBookingValue) },
                { key: "commission", title: "Hoa hồng", width: 120, align: "right", render: (row) => formatVnd(row.commission) },
                { key: "rating", title: "Đánh giá", width: 90, align: "right", render: (row) => (row.reviewCount ? `★ ${row.averageRating?.toFixed(1)}` : "—") },
              ]}
            />
          </View>
        )}
      </QueryState>
    </View>
  );
}
