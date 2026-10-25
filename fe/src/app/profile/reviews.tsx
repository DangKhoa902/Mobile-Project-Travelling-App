import { Image } from "expo-image";
import { router } from "expo-router";
import { Text, View } from "react-native";

import { ReviewBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stars } from "@/components/ui/choice";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { Colors } from "@/constants/theme";
import { useMyReviews } from "@/services/review.service";
import { formatDateTime } from "@/utils/format";

// P3 – Đánh giá của tôi kèm trạng thái: Chờ duyệt / Đã hiển thị / Bị từ chối + lý do.
export default function MyReviewsScreen() {
  const reviews = useMyReviews();
  return (
    <Screen back backHref="/profile" title="Đánh giá của tôi" maxWidth={760} refreshing={reviews.isRefetching} onRefresh={() => void reviews.refetch()}>
      <QueryState
        query={reviews}
        empty={(data) => (data.data.length === 0 ? { message: "Bạn chưa viết đánh giá nào", icon: "star-outline", action: { label: "Xem chuyến đi", onPress: () => router.navigate("/bookings") } } : null)}>
        {(data) => (
          <View className="gap-3">
            {data.data.map((review) => (
              <Card key={review.id} className="gap-2">
                <View className="flex-row items-center gap-3">
                  <Image source={review.destination.imageUrl ?? undefined} style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: Colors.brandSoft }} />
                  <View className="flex-1">
                    <Text className="font-bold text-brand" numberOfLines={1}>
                      {review.destination.name}
                    </Text>
                    <Text className="text-xs text-muted">{formatDateTime(review.createdAt)}</Text>
                  </View>
                  <ReviewBadge status={review.status} />
                </View>
                <Stars value={review.rating} />
                {review.comment ? <Text className="text-brand">{review.comment}</Text> : null}
                {review.images.length ? <Text className="text-xs text-muted">{`${review.images.length} ảnh`}</Text> : null}
                {review.status === "REJECTED" && review.rejectReason ? <Text className="text-sm text-danger">{`Lý do từ chối: ${review.rejectReason}`}</Text> : null}
                <View className="flex-row justify-end">
                  <Button title="Sửa" size="sm" variant="outline" icon="create-outline" onPress={() => router.push(`/reviews/new?reviewId=${review.id}`)} />
                </View>
              </Card>
            ))}
          </View>
        )}
      </QueryState>
    </Screen>
  );
}
