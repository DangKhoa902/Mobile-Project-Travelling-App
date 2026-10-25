import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { BarChart, defaultRange, RangePicker, StatCard, TodoCard } from "@/components/dashboard/widgets";
import { ShortcutGrid } from "@/components/layout/manage-shell";
import { ListingBadge } from "@/components/ui/badge";
import { Card, SectionTitle } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { Colors } from "@/constants/theme";
import { useStats } from "@/services/stats.service";
import type { ListingStatus } from "@/types/api";
import { formatShortVnd, formatVnd } from "@/utils/format";
import { OWNER_NAV } from "@/components/layout/nav";

// O1 – Dashboard của chủ (/api/stats/overview, scope OWNER).
export default function OwnerDashboard() {
  const [range, setRange] = useState(defaultRange(30));
  const stats = useStats(range.from, range.to);

  return (
    <Screen title="Tổng quan" subtitle="Doanh thu tính trên booking đã xác nhận / hoàn thành, theo ngày đặt" refreshing={stats.isRefetching} onRefresh={() => void stats.refetch()}>
      <View className="gap-5">
        <ShortcutGrid items={OWNER_NAV} />
        <RangePicker value={range} onChange={setRange} />
        <QueryState
          query={stats}
          empty={(data) =>
            data.listings && Object.values(data.listings).every((count) => count === 0)
              ? { message: "Bạn chưa có tin đăng nào", icon: "home-outline", action: { label: "Đăng địa điểm đầu tiên", onPress: () => router.push("/owner/destinations/new") } }
              : null
          }>
          {(data) => (
            <View className="gap-5">
              <View className="flex-row flex-wrap gap-3">
                <StatCard label="Doanh thu của tôi" value={formatShortVnd(data.summary.ownerRevenue)} hint={formatVnd(data.summary.ownerRevenue)} icon="wallet-outline" />
                <StatCard label="Tổng giá trị booking" value={formatShortVnd(data.summary.grossBookingValue)} icon="trending-up-outline" />
                <StatCard label="Hoa hồng sàn" value={formatShortVnd(data.summary.platformRevenue)} icon="pie-chart-outline" />
                <StatCard label="Booking đã chốt" value={`${data.summary.confirmedBookings}/${data.summary.totalBookings}`} icon="checkmark-done-outline" />
                <StatCard label="Tỷ lệ hủy" value={`${data.summary.cancellationRate}%`} icon="close-circle-outline" tone={data.summary.cancellationRate > 30 ? "danger" : "brand"} />
                <StatCard label="Đêm phòng đã bán" value={String(data.summary.roomNightsSold)} icon="bed-outline" />
                <StatCard label="Điểm đánh giá TB" value={data.rating?.reviews ? data.rating.average.toFixed(1) : "—"} hint={`${data.rating?.reviews ?? 0} đánh giá`} icon="star-outline" tone="accent" />
              </View>

              <SectionTitle title="Việc cần làm" />
              <View className="flex-row flex-wrap gap-3">
                <TodoCard label="Booking chờ xác nhận" count={data.pending.bookingsToConfirm} icon="hourglass-outline" onPress={() => router.push("/owner/bookings?status=PENDING")} />
                <TodoCard label="Lượt nhận phòng trong 7 ngày" count={data.pending.upcomingCheckIns ?? 0} icon="log-in-outline" onPress={() => router.push("/owner/bookings?status=CONFIRMED")} />
                {data.payouts ? (
                  <>
                    <TodoCard label={`Chưa đối soát: ${formatVnd(data.payouts.unsettledAmount)}`} count={data.payouts.unsettledBookings} icon="receipt-outline" onPress={() => router.push("/owner/payouts")} />
                    <TodoCard label={`Chờ sàn chuyển: ${formatVnd(data.payouts.pendingPayoutAmount)}`} count={data.payouts.pendingPayouts} icon="cash-outline" onPress={() => router.push("/owner/payouts")} />
                  </>
                ) : null}
              </View>

              <Card className="gap-3">
                <SectionTitle title="Doanh thu theo ngày" />
                <BarChart data={data.revenueByDay} series={[{ key: "ownerRevenue", label: "Doanh thu của tôi", color: Colors.brandLight }]} />
              </Card>

              <View className="gap-5 lg:flex-row">
                {data.listings ? (
                  <Card className="flex-1 gap-2">
                    <SectionTitle title="Tin đăng" />
                    {(Object.entries(data.listings) as [ListingStatus, number][]).map(([status, count]) => (
                      <Pressable key={status} onPress={() => router.push("/owner/destinations")} className="flex-row items-center justify-between py-1">
                        <ListingBadge status={status} />
                        <Text className={`text-base font-bold ${status === "REJECTED" && count ? "text-danger" : "text-brand"}`}>{count}</Text>
                      </Pressable>
                    ))}
                  </Card>
                ) : null}
                <Card className="flex-1 gap-2">
                  <SectionTitle title="Top địa điểm" />
                  {data.topDestinations.length === 0 ? <Text className="text-muted">Chưa có booking trong kỳ.</Text> : null}
                  {data.topDestinations.map((item, index) => (
                    <View key={item.id} className="flex-row items-center gap-3 py-1">
                      <Text className="w-5 font-bold text-muted">{index + 1}</Text>
                      <View className="flex-1">
                        <Text className="font-semibold text-brand" numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text className="text-xs text-muted">{`${item.bookings} booking`}</Text>
                      </View>
                      <Text className="font-bold text-brand">{formatShortVnd(item.grossBookingValue - item.commission)}</Text>
                    </View>
                  ))}
                </Card>
              </View>
            </View>
          )}
        </QueryState>
      </View>
    </Screen>
  );
}
