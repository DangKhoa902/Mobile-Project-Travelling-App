import { Image } from "expo-image";
import { useState } from "react";
import { Text, View } from "react-native";

import { Pager } from "@/components/layout/data-table";
import { ReviewBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented, Stars } from "@/components/ui/choice";
import { Dialog, useDialog } from "@/components/ui/dialog";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { Colors } from "@/constants/theme";
import { errorMessage } from "@/services/api/client";
import { useModerateReview, useModerationReviews } from "@/services/review.service";
import { toast } from "@/store/toast-store";
import type { ModerationReview, ReviewStatus } from "@/types/api";
import { formatDateTime } from "@/utils/format";

const REASONS = ["Spam", "Quảng cáo", "Ngôn từ không phù hợp", "Không liên quan"];

// M4 – Kiểm duyệt đánh giá: duyệt / từ chối (bắt buộc lý do). Backend tính lại rating và báo cho khách.
export default function ModerationScreen() {
  const [status, setStatus] = useState<ReviewStatus>("PENDING");
  const [page, setPage] = useState(1);
  const reviews = useModerationReviews(status, page);
  const moderate = useModerateReview();
  const reject = useDialog<ModerationReview>();

  function approve(review: ModerationReview) {
    moderate.mutate({ id: review.id, status: "APPROVED" }, { onSuccess: () => toast.success("Đã duyệt đánh giá"), onError: (error) => toast.error(errorMessage(error)) });
  }

  return (
    <Screen title="Kiểm duyệt đánh giá" maxWidth={900}>
      <View className="gap-4">
        <Segmented
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={[
            { value: "PENDING", label: "Chờ duyệt" },
            { value: "APPROVED", label: "Đã duyệt" },
            { value: "REJECTED", label: "Đã từ chối" },
          ]}
        />
        <QueryState query={reviews} empty={(data) => (data.data.length === 0 ? { message: "Không có đánh giá nào", icon: "star-outline" } : null)}>
          {(data) => (
            <View className="gap-3">
              {data.data.map((review) => (
                <Card key={review.id} className="gap-2">
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-1">
                      <Text className="font-bold text-brand">{review.destination.name}</Text>
                      <Text className="text-xs text-muted">{`${review.user.name} · ${review.user.email} · ${formatDateTime(review.createdAt)}`}</Text>
                    </View>
                    <ReviewBadge status={review.status} />
                  </View>
                  <Stars value={review.rating} />
                  {review.comment ? <Text className="text-brand">{review.comment}</Text> : <Text className="italic text-muted">Không có nhận xét</Text>}
                  {review.images.length ? (
                    <View className="flex-row flex-wrap gap-2">
                      {review.images.map((image) => (
                        <Image key={image.id} source={image.url} style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: Colors.brandSoft }} />
                      ))}
                    </View>
                  ) : null}
                  {review.rejectReason ? <Text className="text-sm text-danger">{`Lý do từ chối: ${review.rejectReason}`}</Text> : null}
                  <View className="flex-row justify-end gap-2">
                    {review.status !== "REJECTED" ? <Button title="Từ chối" size="sm" variant="outline" onPress={() => reject.open(review)} /> : null}
                    {review.status !== "APPROVED" ? <Button title="Duyệt" size="sm" loading={moderate.isPending && moderate.variables?.id === review.id} onPress={() => approve(review)} /> : null}
                  </View>
                </Card>
              ))}
              <Pager meta={data.meta} onChange={setPage} />
            </View>
          )}
        </QueryState>
      </View>
      <Dialog
        open={reject.isOpen}
        onClose={reject.close}
        title="Từ chối đánh giá?"
        message="Khách sẽ nhận thông báo kèm lý do."
        input={{ label: "Lý do từ chối", required: true, minLength: 3, suggestions: REASONS }}
        confirmLabel="Từ chối"
        destructive
        onConfirm={async (reason) => {
          const target = reject.target;
          if (!target) return;
          await moderate.mutateAsync({ id: target.id, status: "REJECTED", rejectReason: reason });
          toast.success("Đã từ chối đánh giá");
        }}
      />
    </Screen>
  );
}
