import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { DestinationCard } from "@/components/destination-card";
import { Screen } from "@/components/screen";
import { StateView } from "@/components/state-view";
import { destinationService } from "@/services/travel.service";
import { useAuthStore } from "@/store/auth-store";

export default function HomeScreen() {
  const userName = useAuthStore((state) => state.user?.name);
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();

  const categories = useQuery({ queryKey: ["categories"], queryFn: destinationService.categories, staleTime: 10 * 60_000 });
  const destinations = useQuery({
    queryKey: ["destinations", { query, categoryId }],
    queryFn: () =>
      destinationService.list({
        q: query || undefined,
        categoryId,
        // Chưa tìm kiếm/lọc thì hiển thị địa điểm nổi bật trước.
        sort: query || categoryId ? "rating" : "popular",
      }),
  });

  const header = (
    <View className="gap-4 pb-4">
      <View>
        <Text className="text-base text-muted">Xin chào{userName ? `, ${userName}` : ""} 👋</Text>
        <Text className="text-2xl font-bold text-brand">Bạn muốn đi đâu?</Text>
      </View>

      <View className="flex-row items-center gap-2 rounded-2xl bg-surface-card px-4 py-3">
        <Ionicons name="search-outline" size={20} color="#71827A" />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={() => setQuery(searchText.trim())}
          placeholder="Tìm Đà Lạt, Phú Quốc, resort..."
          placeholderTextColor="#71827A"
          returnKeyType="search"
          className="flex-1 text-base text-brand"
          accessibilityLabel="Tìm kiếm địa điểm"
        />
        {query ? (
          <Pressable
            onPress={() => {
              setSearchText("");
              setQuery("");
            }}
            accessibilityLabel="Xóa tìm kiếm">
            <Ionicons name="close-circle" size={20} color="#71827A" />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        <CategoryChip label="Tất cả" active={!categoryId} onPress={() => setCategoryId(undefined)} />
        {categories.data?.map((category) => (
          <CategoryChip
            key={category.id}
            label={category.name}
            active={categoryId === category.id}
            onPress={() => setCategoryId(category.id === categoryId ? undefined : category.id)}
          />
        ))}
      </ScrollView>

      <Text className="text-lg font-bold text-brand">
        {query ? `Kết quả cho "${query}"` : categoryId ? "Theo danh mục" : "Điểm đến phổ biến"}
      </Text>
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={destinations.data?.data ?? []}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={header}
        renderItem={({ item }) => <DestinationCard destination={item} />}
        ItemSeparatorComponent={() => <View className="h-4" />}
        contentContainerClassName="pb-28"
        showsVerticalScrollIndicator={false}
        refreshing={destinations.isRefetching}
        onRefresh={() => void destinations.refetch()}
        ListEmptyComponent={
          destinations.isPending ? (
            <StateView kind="loading" />
          ) : destinations.isError ? (
            <StateView kind="error" message={destinations.error.message} onRetry={() => void destinations.refetch()} />
          ) : (
            <StateView kind="empty" icon="map-outline" message="Không tìm thấy địa điểm phù hợp." />
          )
        }
      />
    </Screen>
  );
}

function CategoryChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-4 py-2 active:opacity-80 ${active ? "bg-brand" : "bg-surface-card"}`}
      accessibilityState={{ selected: active }}>
      <Text className={`text-sm font-medium ${active ? "text-white" : "text-brand"}`}>{label}</Text>
    </Pressable>
  );
}
