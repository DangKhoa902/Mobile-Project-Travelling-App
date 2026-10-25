import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Banner, Card } from "@/components/ui/card";
import { Stars } from "@/components/ui/choice";
import { Dialog } from "@/components/ui/dialog";
import { ImageUploader } from "@/components/ui/image-uploader";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { StateView } from "@/components/ui/state-view";
import { Colors } from "@/constants/theme";
import { ApiError, errorMessage } from "@/services/api/client";
import { useBooking } from "@/services/booking.service";
import { useDeleteReview, useMyReviews, useSaveReview } from "@/services/review.service";
import { toast } from "@/store/toast-store";
import { formatDate } from "@/utils/format";

// R1 – Viết / sửa đánh giá: 1–5 sao, nhận xét ≤ 2000 ký tự, tối đa 5 ảnh. Hiển thị sau khi được duyệt.
export default function ReviewFormScreen() {
  const params = useLocalSearchParams<{ bookingId?: string; reviewId?: string }>();
  const mine = useMyReviews();
  const bookingIdParam = params.bookingId ? Number(params.bookingId) : undefined;
  const booking = useBooking(bookingIdParam);
  const existing = mine.data?.data.find((review) =>
    params.reviewId ? review.id === Number(params.reviewId) : bookingIdParam ? review.bookingId === bookingIdParam : false,
  );
  const reviewId = existing?.id;

  const save = useSaveReview();
  const remove = useDeleteReview();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Có đánh giá cũ (chế độ sửa): điền sẵn một lần khi dữ liệu về.
  const [filledFor, setFilledFor] = useState<number | null>(null);
  if (existing && filledFor !== existing.id) {
    setFilledFor(existing.id);
    setRating(existing.rating);
    setComment(existing.comment ?? "");
    setImages(existing.images.map((image) => image.url));
  }

  if (mine.isPending || (bookingIdParam && booking.isPending)) return <Screen back title="Đánh giá"><StateView kind="loading" /></Screen>;
  if (params.reviewId && !existing) return <Screen back title="Đánh giá"><StateView kind="empty" message="Không tìm thấy đánh giá" /></Screen>;

  const destinationName = existing?.destination.name ?? booking.data?.destination.name ?? "";
  const stayDate = booking.data ? `${formatDate(booking.data.checkInDate)} → ${formatDate(booking.data.checkOutDate)}` : null;

  async function submit() {
    setError(null);
    try {
      await save.mutateAsync({
        reviewId,
        bookingId: bookingIdParam ?? existing?.bookingId,
        input: { rating, comment: comment.trim() || undefined, imageUrls: images },
      });
      setDone(true);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "BOOKING_NOT_COMPLETED") setError("Chỉ đánh giá được sau khi hoàn thành chuyến đi");
      else if (caught instanceof ApiError && caught.code === "ALREADY_REVIEWED") {
        await mine.refetch();
        setError("Bạn đã đánh giá chuyến đi này – đã chuyển sang chế độ sửa.");
      } else setError(errorMessage(caught));
    }
  }

  if (done) {
    return (
      <Screen title="Đánh giá" maxWidth={560}>
        <View className="items-center gap-3 py-12">
          <Ionicons name="heart-circle" size={72} color={Colors.brandLight} />
          <Text className="text-center text-xl font-bold text-brand">Cảm ơn bạn!</Text>
          <Text className="text-center text-muted">Đánh giá sẽ hiển thị sau khi được duyệt.</Text>
          <Button title="Đánh giá của tôi" onPress={() => router.replace("/profile/reviews")} />
          <Button title="Về trang chủ" variant="outline" onPress={() => router.replace("/")} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      back
      backHref="/bookings"
      title={reviewId ? "Sửa đánh giá" : "Viết đánh giá"}
      maxWidth={640}
      footer={<Button title="Gửi" full disabled={rating === 0} loading={save.isPending} onPress={submit} />}>
      <View className="gap-5">
        <Card className="gap-1">
          <Text className="text-lg font-bold text-brand">{destinationName}</Text>
          {stayDate ? <Text className="text-sm text-muted">{stayDate}</Text> : null}
        </Card>
        {reviewId ? <Banner tone="info">Sửa đánh giá sẽ đưa đánh giá về trạng thái chờ duyệt lại.</Banner> : null}
        {existing?.status === "REJECTED" && existing.rejectReason ? <Banner tone="danger" title="Bị từ chối">{existing.rejectReason}</Banner> : null}

        <View className="items-center gap-1">
          <Text className="text-sm font-medium text-brand">
            Chất lượng chuyến đi<Text className="text-danger"> *</Text>
          </Text>
          <Stars value={rating} size={36} onChange={setRating} />
          <Text className="text-sm text-muted">{["Chọn số sao", "Tệ", "Chưa tốt", "Bình thường", "Tốt", "Tuyệt vời"][rating]}</Text>
        </View>

        <Input label="Nhận xét" multiline maxLength={2000} counter={2000} value={comment} onChangeText={setComment} placeholder="Chia sẻ trải nghiệm của bạn về phòng, dịch vụ, vị trí..." />
        <ImageUploader label="Ảnh" value={images} onChange={setImages} purpose="review" max={5} />
        {error ? <Banner tone="danger">{error}</Banner> : null}
        {reviewId ? <Button title="Xóa đánh giá" variant="ghost" icon="trash-outline" onPress={() => setConfirmDelete(true)} /> : null}
      </View>
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Xóa đánh giá?"
        message="Đánh giá sẽ bị xóa vĩnh viễn."
        confirmLabel="Xóa"
        destructive
        onConfirm={async () => {
          if (!reviewId) return;
          await remove.mutateAsync(reviewId);
          toast.success("Đã xóa đánh giá");
          router.replace("/profile/reviews");
        }}
      />
    </Screen>
  );
}
