import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { ReviewItem } from "@/components/explore/review-item";
import { Button } from "@/components/ui/button";
import { Stars } from "@/components/ui/choice";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { useDestination, useDestinationReviews } from "@/services/destination.service";

// D3 – Tất cả đánh giá (chỉ đánh giá đã duyệt).
export default function DestinationReviewsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const destination = useDestination(slug);
  const reviews = useDestinationReviews(destination.data?.id);

  return (
    <Screen back backHref={`/destinations/${slug}`} title="Đánh giá" subtitle={destination.data?.name} maxWidth={760}>
      <QueryState query={destination}>
        {(data) => (
          <View className="gap-4">
            <View className="flex-row items-center gap-4 rounded-2xl bg-brand p-5">
              <Text className="text-5xl font-bold text-white">{data.averageRating.toFixed(1)}</Text>
              <View className="gap-1">
                <Stars value={data.averageRating} size={18} />
                <Text className="text-brand-soft">{`${data.reviewCount} đánh giá`}</Text>
              </View>
            </View>
            <QueryState
              query={{ ...reviews, data: reviews.data?.pages.flatMap((page) => page.data) }}
              empty={(items) => (items.length === 0 ? { message: "Chưa có đánh giá nào", icon: "star-outline" } : null)}>
              {(items) => (
                <View className="gap-3">
                  {items.map((review) => (
                    <ReviewItem key={review.id} review={review} />
                  ))}
                  {reviews.hasNextPage ? (
                    <Button title="Xem thêm" variant="outline" loading={reviews.isFetchingNextPage} onPress={() => void reviews.fetchNextPage()} />
                  ) : null}
                </View>
              )}
            </QueryState>
          </View>
        )}
      </QueryState>
    </Screen>
  );
}
