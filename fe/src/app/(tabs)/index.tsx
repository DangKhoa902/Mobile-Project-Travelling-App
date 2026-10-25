import Ionicons from "@expo/vector-icons/Ionicons";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { DestinationCard } from "@/components/explore/destination-card";
import { IconButton } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/card";
import { Chip, ChipRow } from "@/components/ui/choice";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { Colors } from "@/constants/theme";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { useCategories, useDestinations, type DestinationFilters } from "@/services/destination.service";
import { useUnreadCount } from "@/services/notification.service";
import { useAuthStore } from "@/store/auth-store";

// T1 – Khám phá: lời chào, ô tìm kiếm, danh mục, Nổi bật, Phổ biến, Mới. Mỗi khối tải / lỗi riêng.
export default function ExploreScreen() {
  const user = useAuthStore((state) => state.user);
  const unread = useUnreadCount();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    await queryClient.refetchQueries({ queryKey: ["destinations"] });
    await queryClient.refetchQueries({ queryKey: ["categories"] });
    setRefreshing(false);
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View className="gap-6 pt-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-sm text-muted">{user ? `Xin chào, ${user.name.split(" ").at(-1)}` : "Xin chào"}</Text>
            <Text className="text-2xl font-bold text-brand">Hôm nay bạn muốn đi đâu?</Text>
          </View>
          {user ? (
            <View>
              <IconButton icon="notifications-outline" label="Thông báo" onPress={() => router.navigate("/inbox")} />
              {unread.data ? (
                <View className="absolute right-1 top-1 min-w-5 items-center rounded-full bg-danger px-1">
                  <Text className="text-xs font-bold text-white">{unread.data > 99 ? "99+" : unread.data}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <Pressable
          onPress={() => router.push("/search")}
          accessibilityRole="search"
          className="min-h-12 flex-row items-center gap-2 rounded-2xl border border-line bg-surface-card px-4 active:opacity-80">
          <Ionicons name="search" size={20} color={Colors.muted} />
          <Text className="text-base text-muted">Tìm địa điểm, khu vực (ví dụ “da lat”)</Text>
        </Pressable>

        <CategoriesBlock />
        <CarouselBlock title="Nổi bật" filters={{ featured: true, sort: "rating", limit: 10 }} />
        <GridBlock title="Phổ biến" filters={{ sort: "popular", limit: 6 }} sort="popular" />
        <GridBlock title="Mới trên Travelling App" filters={{ sort: "newest", limit: 6 }} sort="newest" />
      </View>
    </Screen>
  );
}

function CategoriesBlock() {
  const categories = useCategories();
  return (
    <QueryState query={categories} compact>
      {(data) => (
        <ChipRow>
          {data.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              onPress={() => router.push({ pathname: "/search", params: { categoryId: String(category.id) } })}
            />
          ))}
        </ChipRow>
      )}
    </QueryState>
  );
}

function CarouselBlock({ title, filters }: { title: string; filters: DestinationFilters }) {
  const query = useDestinations(filters);
  return (
    <View className="gap-3">
      <SectionTitle title={title} />
      <QueryState query={query} compact empty={(data) => (data.data.length === 0 ? { message: "Chưa có địa điểm nổi bật" } : null)}>
        {(data) => (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
            {data.data.map((destination) => (
              <DestinationCard key={destination.id} destination={destination} compact />
            ))}
          </ScrollView>
        )}
      </QueryState>
    </View>
  );
}

function GridBlock({ title, filters, sort }: { title: string; filters: DestinationFilters; sort: string }) {
  const query = useDestinations(filters);
  const { isMd, isLg } = useBreakpoint();
  const columns = isLg ? 3 : isMd ? 2 : 1;
  return (
    <View className="gap-3">
      <SectionTitle
        title={title}
        action={
          <Pressable onPress={() => router.push({ pathname: "/search", params: { sort } })} hitSlop={8}>
            <Text className="font-semibold text-brand-light">Xem tất cả</Text>
          </Pressable>
        }
      />
      <QueryState query={query} compact empty={(data) => (data.data.length === 0 ? { message: "Chưa có địa điểm" } : null)}>
        {(data) => (
          <View className="flex-row flex-wrap" style={{ marginHorizontal: -6 }}>
            {data.data.map((destination) => (
              <View key={destination.id} style={{ width: `${100 / columns}%`, padding: 6 }}>
                <DestinationCard destination={destination} />
              </View>
            ))}
          </View>
        )}
      </QueryState>
    </View>
  );
}
