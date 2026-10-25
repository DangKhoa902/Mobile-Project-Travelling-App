import { useLocalSearchParams } from "expo-router";

import { ChatView } from "@/components/support/chat-view";
import { Screen } from "@/components/ui/screen";
import { useConversation } from "@/services/support.service";

// C2 – Chat với CSKH.
export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversation = useConversation(Number(id));
  const subtitle = conversation.data ? (conversation.data.status === "OPEN" ? (conversation.data.staff ? `CSKH: ${conversation.data.staff.name}` : "Đang chờ CSKH") : "Đã đóng") : undefined;
  return (
    <Screen back backHref="/inbox" title={conversation.data?.subject ?? "Hỗ trợ"} subtitle={subtitle} scroll={false} padded={false} maxWidth={760}>
      <ChatView conversationId={Number(id)} closed={conversation.data?.status === "CLOSED"} />
    </Screen>
  );
}
