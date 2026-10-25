import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import type { DestinationSummary } from "@/types/api";
import { formatVnd } from "@/utils/format";

type DestinationCardProps = {
  destination: DestinationSummary;
  compact?: boolean; // băng chuyền ngang ở T1
  favorite?: { active: boolean; onToggle: () => void };
};

// Thẻ địa điểm dùng lại ở T1, T2, D1: ảnh, danh mục · khu vực, tên, sao, "Từ ...đ".
export function DestinationCard({ destination, compact, favorite }: DestinationCardProps) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/destinations/[slug]", params: { slug: destination.slug } })}
      className={`overflow-hidden rounded-2xl border border-line bg-surface-card active:opacity-90 ${compact ? "w-64" : "w-full"}`}>
      <View>
        <Image
          source={destination.imageUrl ?? undefined}
          style={{ width: "100%", aspectRatio: compact ? 4 / 3 : 16 / 9, backgroundColor: Colors.brandSoft }}
          contentFit="cover"
          transition={200}
          accessibilityIgnoresInvertColors
        />
        {destination.isFeatured ? (
          <View className="absolute left-3 top-3 rounded-full bg-accent px-2 py-1">
            <Text className="text-xs font-bold text-white">Nổi bật</Text>
          </View>
        ) : null}
        {favorite ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              favorite.onToggle();
            }}
            accessibilityLabel={favorite.active ? "Bỏ yêu thích" : "Yêu thích"}
            className="absolute right-3 top-3 h-10 w-10 items-center justify-center rounded-full bg-white/90">
            <Ionicons name={favorite.active ? "heart" : "heart-outline"} size={20} color={favorite.active ? Colors.danger : Colors.brand} />
          </Pressable>
        ) : null}
      </View>
      <View className="gap-1 p-3">
        <Text className="text-xs font-semibold uppercase text-brand-light" numberOfLines={1}>
          {`${destination.category?.name ?? "Điểm đến"} · ${destination.location}`}
        </Text>
        <Text className="text-base font-bold text-brand" numberOfLines={1}>
          {destination.name}
        </Text>
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-1">
            <Ionicons name="star" size={14} color={Colors.accent} />
            <Text className="text-sm text-muted">
              {destination.reviewCount > 0 ? `${destination.averageRating.toFixed(1)} (${destination.reviewCount})` : "Chưa có đánh giá"}
            </Text>
          </View>
          {destination.minPrice > 0 ? <Text className="text-sm font-semibold text-brand">{`Từ ${formatVnd(destination.minPrice)}`}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}
