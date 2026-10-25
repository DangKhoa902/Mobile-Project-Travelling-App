import { Image } from "expo-image";
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/button";
import { Stars } from "@/components/ui/choice";
import { Colors } from "@/constants/theme";
import type { PublicReview } from "@/types/api";
import { formatDateTime } from "@/utils/format";

// Một đánh giá: avatar, tên, sao, ngày, nội dung, ảnh thu nhỏ (chạm để xem lớn).
export function ReviewItem({ review }: { review: PublicReview }) {
  const [viewing, setViewing] = useState<string | null>(null);
  return (
    <View className="gap-2 rounded-2xl border border-line bg-surface-card p-4">
      <View className="flex-row items-center gap-3">
        <Avatar name={review.user.name} url={review.user.avatarUrl} size={36} />
        <View className="flex-1">
          <Text className="font-semibold text-brand">{review.user.name}</Text>
          <Text className="text-xs text-muted">{formatDateTime(review.createdAt).slice(6)}</Text>
        </View>
        <Stars value={review.rating} />
      </View>
      {review.comment ? <Text className="text-base leading-6 text-brand">{review.comment}</Text> : null}
      {review.images.length ? (
        <View className="flex-row flex-wrap gap-2">
          {review.images.map((image) => (
            <Pressable key={image.id} onPress={() => setViewing(image.url)} accessibilityLabel="Xem ảnh lớn">
              <Image source={image.url} style={{ width: 72, height: 72, borderRadius: 10, backgroundColor: Colors.brandSoft }} contentFit="cover" />
            </Pressable>
          ))}
        </View>
      ) : null}
      <Modal visible={viewing !== null} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <Pressable className="flex-1 items-center justify-center bg-black/90" onPress={() => setViewing(null)}>
          {viewing ? <Image source={viewing} style={{ width: "100%", height: "80%" }} contentFit="contain" /> : null}
          <View className="absolute right-4 top-10">
            <IconButton icon="close" label="Đóng" color={Colors.white} onPress={() => setViewing(null)} />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
