import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { ChatView } from "@/components/support/chat-view";
import { Button } from "@/components/ui/button";
import { Dialog, useDialog } from "@/components/ui/dialog";
import { Screen } from "@/components/ui/screen";
import { ApiError } from "@/services/api/client";
import { useConversation, useHandoff } from "@/services/support.service";

// C2 – Chat với CSKH (AI trả lời trước, khách có thể chuyển nhân viên bất cứ lúc nào).
export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversation = useConversation(Number(id));
  const handoff = useHandoff();
  const dialog = useDialog();
  const data = conversation.data;
  const subtitle = data ? (data.status === "OPEN" ? (data.staff ? `CSKH: ${data.staff.name}` : data.handler === "AI" ? "Trợ lý AI" : "Đang chờ CSKH") : "Đã đóng") : undefined;

  async function requestHandoff() {
    try {
      await handoff.mutateAsync({ id: Number(id) });
    } catch (caught) {
      // Đã có nhân viên phụ trách: chỉ cần làm mới (useHandoff đã invalidate).
      if (!(caught instanceof ApiError && caught.code === "ALREADY_WITH_STAFF")) throw caught;
    }
  }

  return (
    <Screen back backHref="/inbox" title={data?.subject ?? "Hỗ trợ"} subtitle={subtitle} scroll={false} padded={false} maxWidth={760}>
      {data?.status === "OPEN" && data.handler === "AI" ? (
        <View className="flex-row items-center justify-between gap-3 border-b border-line bg-surface-card px-4 py-2">
          <Text className="flex-1 text-sm text-muted">Bạn đang trò chuyện với Trợ lý AI</Text>
          <Button title="Gặp nhân viên" size="sm" variant="outline" onPress={() => dialog.open(true)} />
        </View>
      ) : null}
      {data?.handler === "STAFF" && data.handoffAt ? (
        <View className="border-b border-line bg-brand-soft px-4 py-2" accessibilityRole="alert">
          <Text className="text-sm text-brand">Đã chuyển nhân viên CSKH – nhân viên sẽ trả lời sớm</Text>
        </View>
      ) : null}
      <ChatView conversationId={Number(id)} closed={data?.status === "CLOSED"} aiPending={data?.aiPending ?? false} />
      <Dialog
        open={dialog.isOpen}
        onClose={dialog.close}
        title="Gặp nhân viên CSKH?"
        message="Hội thoại sẽ được chuyển cho nhân viên CSKH và nhân viên sẽ trả lời bạn sớm."
        confirmLabel="Chuyển nhân viên"
        onConfirm={requestHandoff}
      />
    </Screen>
  );
}
