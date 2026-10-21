import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import type { DestinationSummary } from "@/types/api";
import { formatVnd } from "@/utils/format";

type DestinationCardProps = {
  destination: DestinationSummary;
  onPress?: () => void;
};

export function DestinationCard({ destination, onPress }: DestinationCardProps) {
  return (
    <Pressable onPress={onPress} className="overflow-hidden rounded-2xl bg-surface-card active:opacity-90">
      <Image
        source={destination.imageUrl ?? undefined}
        style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: "#DDEDE3" }}
        contentFit="cover"
        transition={200}
        accessibilityIgnoresInvertColors
      />
      <View className="gap-1 p-4">
        <Text className="text-xs font-semibold uppercase text-brand-light">
          {destination.category?.name ?? "Điểm đến"} · {destination.location}
        </Text>
        <Text className="text-lg font-bold text-brand" numberOfLines={1}>
          {destination.name}
        </Text>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1">
            <Ionicons name="star" size={14} color="#E9A23B" />
            <Text className="text-sm text-muted">
              {destination.reviewCount > 0
                ? `${destination.averageRating.toFixed(1)} (${destination.reviewCount} đánh giá)`
                : "Chưa có đánh giá"}
            </Text>
          </View>
          {destination.minPrice > 0 ? (
            <Text className="text-sm font-semibold text-brand">Từ {formatVnd(destination.minPrice)}</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
