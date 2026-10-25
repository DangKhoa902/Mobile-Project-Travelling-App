import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/card";
import { Chip } from "@/components/ui/choice";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { errorMessage, fieldErrors } from "@/services/api/client";
import { useBookings } from "@/services/booking.service";
import { useCreateConversation } from "@/services/support.service";

const SUBJECTS = ["Thay đổi booking", "Thanh toán", "Hoàn tiền", "Khác"];

// C1 – Tạo yêu cầu hỗ trợ (gắn booking nếu có) → mở C2.
export default function NewConversationScreen() {
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const bookings = useBookings({ scope: "mine", limit: 10 });
  const create = useCreateConversation();
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [bookingId, setBookingId] = useState<number | undefined>(params.bookingId ? Number(params.bookingId) : undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setErrors({});
    try {
      const conversation = await create.mutateAsync({ subject: subject.trim(), content: content.trim(), ...(bookingId ? { bookingId } : {}) });
      router.replace(`/conversations/${conversation.id}`);
    } catch (caught) {
      const byField = fieldErrors(caught);
      if (Object.keys(byField).length) setErrors(byField);
      else setError(errorMessage(caught));
    }
  }

  return (
    <Screen back backHref="/inbox" title="Yêu cầu hỗ trợ" maxWidth={640} footer={<Button title="Gửi yêu cầu" full loading={create.isPending} disabled={subject.trim().length < 2 || !content.trim()} onPress={submit} />}>
      <View className="gap-5">
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <View className="gap-2">
          <Text className="text-sm font-medium text-brand">Chủ đề gợi ý</Text>
          <View className="flex-row flex-wrap gap-2">
            {SUBJECTS.map((item) => (
              <Chip key={item} label={item} active={subject === item} onPress={() => setSubject(item)} />
            ))}
          </View>
          <Input label="Chủ đề" required value={subject} onChangeText={setSubject} error={errors.subject} />
        </View>
        <View className="gap-2">
          <Text className="text-sm font-medium text-brand">Booking liên quan (tùy chọn)</Text>
          <View className="flex-row flex-wrap gap-2">
            <Chip label="Không" active={!bookingId} onPress={() => setBookingId(undefined)} />
            {bookings.data?.data.map((booking) => (
              <Chip key={booking.id} label={`${booking.code} · ${booking.destination.name}`} active={bookingId === booking.id} onPress={() => setBookingId(booking.id)} />
            ))}
          </View>
        </View>
        <Input label="Nội dung" required multiline maxLength={2000} counter={2000} value={content} onChangeText={setContent} error={errors.content} placeholder="Mô tả vấn đề bạn cần hỗ trợ" />
      </View>
    </Screen>
  );
}
