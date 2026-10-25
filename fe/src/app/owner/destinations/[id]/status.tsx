import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { ReviewItem } from "@/components/explore/review-item";
import { ListingBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Banner, Card, SectionTitle } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { Colors } from "@/constants/theme";
import { useDestinationReviews } from "@/services/destination.service";
import { useManagedDestination } from "@/services/manage.service";
import { formatDateTime } from "@/utils/format";

// O4 – Trạng thái duyệt (tạo → gửi duyệt → duyệt / từ chối), link trang công khai, đánh giá của khách.
export default function ListingStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const destination = useManagedDestination(Number(id));
  const reviews = useDestinationReviews(Number(id));

  return (
    <Screen back backHref="/owner/destinations" title="Trạng thái tin" subtitle={destination.data?.name} maxWidth={860}>
      <QueryState query={destination}>
        {(data) => {
          const steps = [
            { label: "Tạo tin", at: data.createdAt, done: true },
            { label: "Gửi duyệt", at: data.submittedAt, done: Boolean(data.submittedAt) || data.listingStatus !== "DRAFT" },
            data.listingStatus === "REJECTED"
              ? { label: "Bị từ chối", at: null, done: true, danger: true }
              : { label: "Đã duyệt", at: data.approvedAt, done: data.listingStatus === "APPROVED" },
          ];
          return (
            <View className="gap-4">
              <Card className="gap-3">
                <View className="flex-row items-center justify-between">
                  <ListingBadge status={data.listingStatus} />
                  <View className="flex-row gap-2">
                    <Button title="Sửa tin" size="sm" variant="outline" icon="create-outline" onPress={() => router.push(`/owner/destinations/${data.id}`)} />
                    <Button title="Trang công khai" size="sm" variant="secondary" icon="open-outline" onPress={() => router.push(`/destinations/${data.slug}`)} />
                  </View>
                </View>
                {steps.map((step) => (
                  <View key={step.label} className="flex-row items-center gap-3">
                    <Ionicons
                      name={"danger" in step && step.danger ? "close-circle" : step.done ? "checkmark-circle" : "ellipse-outline"}
                      size={22}
                      color={"danger" in step && step.danger ? Colors.danger : step.done ? Colors.brandLight : Colors.muted}
                    />
                    <Text className="flex-1 text-brand">{step.label}</Text>
                    <Text className="text-xs text-muted">{step.at ? formatDateTime(step.at) : ""}</Text>
                  </View>
                ))}
                {data.listingRejectReason && data.listingStatus === "REJECTED" ? <Banner tone="danger" title="Lý do từ chối">{data.listingRejectReason}</Banner> : null}
              </Card>
              <SectionTitle title={`Đánh giá của khách (${data.reviewCount})`} />
              <QueryState
                query={{ ...reviews, data: reviews.data?.pages.flatMap((page) => page.data) }}
                empty={(items) => (items.length === 0 ? { message: "Chưa có đánh giá", icon: "star-outline" } : null)}>
                {(items) => (
                  <View className="gap-3">
                    {items.map((review) => (
                      <ReviewItem key={review.id} review={review} />
                    ))}
                  </View>
                )}
              </QueryState>
            </View>
          );
        }}
      </QueryState>
    </Screen>
  );
}
