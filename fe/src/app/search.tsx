import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DestinationCard } from "@/components/explore/destination-card";
import { Button, IconButton } from "@/components/ui/button";
import { Checkbox, Chip, ChipRow } from "@/components/ui/choice";
import { Input, toInt } from "@/components/ui/input";
import { goBack } from "@/components/ui/screen";
import { StateView } from "@/components/ui/state-view";
import { Colors } from "@/constants/theme";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { useDebounce } from "@/hooks/use-debounce";
import { useCategories, useFacilities, useInfiniteDestinations, type DestinationFilters } from "@/services/destination.service";

type Sort = NonNullable<DestinationFilters["sort"]>;
type Filters = Omit<DestinationFilters, "q" | "sort" | "limit">;

const SORTS: { value: Sort; label: string }[] = [
  { value: "popular", label: "Phổ biến" },
  { value: "rating", label: "Đánh giá cao" },
  { value: "price_asc", label: "Giá thấp" },
  { value: "price_desc", label: "Giá cao" },
  { value: "newest", label: "Mới nhất" },
];

// D1 – Tìm kiếm + lọc: gõ xong 400 ms mới gọi API, cuộn vô hạn, bộ lọc là sheet (mobile) / cột trái (web).
export default function SearchScreen() {
  const params = useLocalSearchParams<{ categoryId?: string; sort?: Sort; q?: string }>();
  const [q, setQ] = useState(params.q ?? "");
  const [sort, setSort] = useState<Sort>(params.sort ?? "popular");
  const [filters, setFilters] = useState<Filters>({ categoryId: params.categoryId ? Number(params.categoryId) : undefined });
  const [sheet, setSheet] = useState(false);
  const { isLg, isMd } = useBreakpoint();
  const debounced = useDebounce(q.trim(), 400);

  const query = useInfiniteDestinations({ ...filters, q: debounced || undefined, sort });
  const items = query.data?.pages.flatMap((page) => page.data) ?? [];
  const total = query.data?.pages[0]?.meta.total ?? 0;
  const activeCount = [filters.categoryId, filters.location, filters.minPrice, filters.maxPrice, filters.minRating, filters.facilityIds?.length].filter(Boolean).length;
  const columns = isLg ? 2 : isMd ? 2 : 1;

  const clear = () => {
    setFilters({});
    setQ("");
  };

  const header = (
    <View className="gap-3 pb-3">
      <View className="flex-row items-center gap-2">
        <IconButton icon="arrow-back" label="Quay lại" onPress={() => goBack("/")} />
        <View className="flex-1">
          <Input value={q} onChangeText={setQ} placeholder="Tìm địa điểm, khu vực..." left="search" autoFocus returnKeyType="search" autoCorrect={false} />
        </View>
        {!isLg ? (
          <Pressable onPress={() => setSheet(true)} accessibilityLabel="Bộ lọc" className="h-12 flex-row items-center gap-1 rounded-xl border border-line bg-surface-card px-3">
            <Ionicons name="options-outline" size={20} color={Colors.brand} />
            {activeCount ? (
              <View className="rounded-full bg-brand px-1.5">
                <Text className="text-xs font-bold text-white">{activeCount}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>
      <ChipRow>
        {SORTS.map((option) => (
          <Chip key={option.value} label={option.label} active={sort === option.value} onPress={() => setSort(option.value)} />
        ))}
      </ChipRow>
      <Text className="text-sm text-muted">{query.isPending ? "Đang tìm…" : `${total} kết quả`}</Text>
    </View>
  );

  const list = (
    <FlatList
      key={columns}
      data={items}
      numColumns={columns}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={header}
      columnWrapperStyle={columns > 1 ? { gap: 12 } : undefined}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      renderItem={({ item }) => (
        <View style={{ flex: 1 / columns }}>
          <DestinationCard destination={item} />
        </View>
      )}
      onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && void query.fetchNextPage()}
      onEndReachedThreshold={0.4}
      ListFooterComponent={query.isFetchingNextPage ? <StateView kind="loading" compact /> : null}
      ListEmptyComponent={
        query.isPending ? (
          <StateView kind="loading" />
        ) : query.isError ? (
          <StateView kind="error" error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <StateView kind="empty" icon="search-outline" message="Không tìm thấy địa điểm phù hợp" action={{ label: "Xóa bộ lọc", onPress: clear }} />
        )
      }
      keyboardShouldPersistTaps="handled"
    />
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      {isLg ? (
        <View className="w-full max-w-[1200px] flex-1 flex-row self-center">
          <ScrollView className="w-72 flex-none border-r border-line" contentContainerClassName="p-4">
            <FilterPanel value={filters} onChange={setFilters} onClear={clear} />
          </ScrollView>
          <View className="flex-1">{list}</View>
        </View>
      ) : (
        list
      )}

      <Modal visible={sheet} animationType="slide" transparent statusBarTranslucent navigationBarTranslucent onRequestClose={() => setSheet(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <SafeAreaView edges={["bottom"]} className="max-h-[85%] rounded-t-3xl bg-surface">
            <View className="flex-row items-center justify-between px-4 pt-3">
              <Text className="text-lg font-bold text-brand">Bộ lọc</Text>
              <IconButton icon="close" label="Đóng" onPress={() => setSheet(false)} />
            </View>
            <ScrollView contentContainerClassName="p-4" keyboardShouldPersistTaps="handled">
              <FilterPanel value={filters} onChange={setFilters} onClear={clear} />
            </ScrollView>
            <View className="px-4 pb-3">
              <Button title={`Xem ${total} kết quả`} full onPress={() => setSheet(false)} />
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function FilterPanel({ value, onChange, onClear }: { value: Filters; onChange: (filters: Filters) => void; onClear: () => void }) {
  const categories = useCategories();
  const facilities = useFacilities();
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch });

  return (
    <View className="gap-5">
      <FilterGroup title="Danh mục">
        <View className="flex-row flex-wrap gap-2">
          <Chip label="Tất cả" active={!value.categoryId} onPress={() => set({ categoryId: undefined })} />
          {categories.data?.map((category) => (
            <Chip key={category.id} label={category.name} active={value.categoryId === category.id} onPress={() => set({ categoryId: category.id })} />
          ))}
        </View>
      </FilterGroup>
      <FilterGroup title="Khu vực">
        <Input value={value.location ?? ""} onChangeText={(text) => set({ location: text || undefined })} placeholder="Ví dụ: Đà Lạt" />
      </FilterGroup>
      <FilterGroup title="Khoảng giá (VNĐ)">
        <View className="flex-row gap-2">
          <Input className="flex-1" keyboardType="numeric" placeholder="Từ" value={value.minPrice ? String(value.minPrice) : ""} onChangeText={(text) => set({ minPrice: toInt(text) })} />
          <Input className="flex-1" keyboardType="numeric" placeholder="Đến" value={value.maxPrice ? String(value.maxPrice) : ""} onChangeText={(text) => set({ maxPrice: toInt(text) })} />
        </View>
      </FilterGroup>
      <FilterGroup title="Đánh giá">
        <View className="flex-row flex-wrap gap-2">
          {[undefined, 3, 4, 4.5].map((rating) => (
            <Chip key={String(rating)} label={rating ? `${rating}+ sao` : "Tất cả"} icon={rating ? "star" : undefined} active={value.minRating === rating} onPress={() => set({ minRating: rating })} />
          ))}
        </View>
      </FilterGroup>
      <FilterGroup title="Tiện ích">
        {facilities.data?.map((facility) => {
          const checked = value.facilityIds?.includes(facility.id) ?? false;
          return (
            <Checkbox
              key={facility.id}
              label={facility.name}
              checked={checked}
              onChange={(next) => {
                const ids = new Set(value.facilityIds ?? []);
                if (next) ids.add(facility.id);
                else ids.delete(facility.id);
                set({ facilityIds: [...ids] });
              }}
            />
          );
        })}
      </FilterGroup>
      <Button title="Xóa bộ lọc" variant="outline" onPress={onClear} />
    </View>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-bold uppercase text-muted">{title}</Text>
      {children}
    </View>
  );
}
