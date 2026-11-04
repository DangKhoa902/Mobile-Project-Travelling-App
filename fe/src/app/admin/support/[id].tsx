import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ChatView } from "@/components/support/chat-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, InfoRow, SectionTitle } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { Colors } from "@/constants/theme";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { ApiError, errorMessage } from "@/services/api/client";
import { useAiStatus, useConversation, useSuggestReply, useSummarize, useUpdateConversation } from "@/services/support.service";
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
  const [summaryOpen, setSummaryOpen] = useState(true);
  const ai = useAiStatus();
  const suggest = useSuggestReply();
  const summarize = useSummarize();
  const [draft, setDraft] = useState<{ text: string; nonce: number } | undefined>();
  const [aiDisabled, setAiDisabled] = useState(false);
  const aiError = suggest.error ?? summarize.error;
  const data = conversation.data;

  const run = (input: { status?: "OPEN" | "CLOSED"; staffId?: number | null }, message: string) =>
    update.mutate({ id: Number(id), ...input }, { onSuccess: () => toast.success(message), onError: (error) => toast.error(errorMessage(error)) });

  const onAiError = (error: unknown) => {
    if (error instanceof ApiError && error.code === "AI_DISABLED") setAiDisabled(true);
  };
  const askSuggest = () => {
    suggest.mutate(Number(id), {
      onSuccess: (text) => setDraft((current) => ({ text, nonce: (current?.nonce ?? 0) + 1 })),
      onError: onAiError,
    });
  };
  const askSummary = () => {
    summarize.mutate(Number(id), { onSuccess: () => setSummaryOpen(true), onError: onAiError });
  };

  const toolbar =
    ai.enabled && !aiDisabled && data?.status === "OPEN" ? (
      <>
        <Button title="Gợi ý trả lời" size="sm" variant="outline" loading={suggest.isPending} disabled={summarize.isPending} onPress={askSuggest} icon="sparkles" />
        <Button title="Tóm tắt" size="sm" variant="outline" loading={summarize.isPending} disabled={suggest.isPending} onPress={askSummary} icon="document-text-outline" />
        {aiError ? <Text className="w-full text-xs text-danger">{errorMessage(aiError)}</Text> : null}
      </>
    ) : null;

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

  const summary = data?.aiSummary ? (
    <View className="mx-4 mb-2 rounded-xl border border-info/30 bg-info-soft">
      <Pressable onPress={() => setSummaryOpen((value) => !value)} accessibilityRole="button" accessibilityLabel="Tóm tắt từ AI" accessibilityState={{ expanded: summaryOpen }} className="flex-row items-center gap-2 px-3 py-2">
        <Ionicons name="sparkles" size={14} color={Colors.info} />
        <Text className="flex-1 text-sm font-semibold text-brand">Tóm tắt từ AI</Text>
        <Ionicons name={summaryOpen ? "chevron-up" : "chevron-down"} size={16} color={Colors.brand} />
      </Pressable>
      {summaryOpen ? <Text className="px-3 pb-3 text-sm text-brand">{data.aiSummary}</Text> : null}
    </View>
  ) : null;

  return (
    <Screen back backHref="/admin/support" title={data?.subject ?? "Hội thoại"} subtitle={data?.customer.name} scroll={false} padded={false}>
      {isLg ? (
        <View className="flex-1 flex-row gap-4 px-4 pb-4">
          <View className="flex-1 overflow-hidden rounded-2xl border border-line bg-surface">
            {summary}
            <ChatView conversationId={Number(id)} closed={data?.status === "CLOSED"} aiPending={data?.aiPending ?? false} draft={draft} toolbar={toolbar} />
          </View>
          <View className="w-80">{panel}</View>
        </View>
      ) : (
        <View className="min-h-0 flex-1">
          {/* Thông tin + tóm tắt cuộn riêng, tối đa 45% màn hình, để khung chat luôn còn chỗ. */}
          <ScrollView className="max-h-[45%] grow-0" contentContainerClassName="pb-2">
            <View className="px-4 pb-2">{panel}</View>
            {summary}
          </ScrollView>
          <ChatView conversationId={Number(id)} closed={data?.status === "CLOSED"} aiPending={data?.aiPending ?? false} draft={draft} toolbar={toolbar} />
        </View>
      )}
    </Screen>
  );
}
