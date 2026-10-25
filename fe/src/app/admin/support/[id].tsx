import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { ChatView } from "@/components/support/chat-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, InfoRow, SectionTitle } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { errorMessage } from "@/services/api/client";
import { useConversation, useUpdateConversation } from "@/services/support.service";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "@/store/toast-store";
import { formatDateTime } from "@/utils/format";

// M6 – Trả lời khách: giao diện chat C2 + thông tin khách / booking, Nhận xử lý, Đóng hội thoại.
export default function SupportConversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversation = useConversation(Number(id));
  const update = useUpdateConversation();
  const me = useAuthStore((state) => state.user);
  const { isLg } = useBreakpoint();
  const data = conversation.data;

  const run = (input: { status?: "OPEN" | "CLOSED"; staffId?: number | null }, message: string) =>
    update.mutate({ id: Number(id), ...input }, { onSuccess: () => toast.success(message), onError: (error) => toast.error(errorMessage(error)) });

  const panel = data ? (
    <Card className="gap-2">
      <SectionTitle title="Thông tin" />
      <InfoRow label="Khách" value={data.customer.name} />
      <InfoRow label="Mở lúc" value={formatDateTime(data.createdAt)} />
      <InfoRow label="Trạng thái" value={<Badge label={data.status === "OPEN" ? "Đang mở" : "Đã đóng"} tone={data.status === "OPEN" ? "green" : "gray"} />} />
      <InfoRow label="Phụ trách" value={data.staff?.name ?? "Chưa có"} />
      {data.bookingId ? <Button title={`Xem booking #${data.bookingId}`} size="sm" variant="outline" onPress={() => router.push(`/admin/bookings/${data.bookingId}`)} /> : null}
      {data.staffId !== me?.id && data.status === "OPEN" ? <Button title="Nhận xử lý" size="sm" onPress={() => me && run({ staffId: me.id }, "Bạn đã nhận xử lý hội thoại")} /> : null}
      {data.status === "OPEN" ? (
        <Button title="Đóng hội thoại" size="sm" variant="danger" onPress={() => run({ status: "CLOSED" }, "Đã đóng hội thoại")} />
      ) : (
        <Button title="Mở lại" size="sm" variant="secondary" onPress={() => run({ status: "OPEN" }, "Đã mở lại hội thoại")} />
      )}
      <Text className="text-xs text-muted">Nhân viên trả lời đầu tiên được tự gán phụ trách.</Text>
    </Card>
  ) : null;

  return (
    <Screen back backHref="/admin/support" title={data?.subject ?? "Hội thoại"} subtitle={data?.customer.name} scroll={false} padded={false}>
      {isLg ? (
        <View className="flex-1 flex-row gap-4 px-4 pb-4">
          <View className="flex-1 overflow-hidden rounded-2xl border border-line bg-surface">
            <ChatView conversationId={Number(id)} closed={data?.status === "CLOSED"} />
          </View>
          <View className="w-80">{panel}</View>
        </View>
      ) : (
        <View className="flex-1">
          <View className="px-4 pb-2">{panel}</View>
          <ChatView conversationId={Number(id)} closed={data?.status === "CLOSED"} />
        </View>
      )}
    </Screen>
  );
}
