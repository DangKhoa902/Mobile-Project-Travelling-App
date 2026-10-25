import Ionicons from "@expo/vector-icons/Ionicons";
import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";

import { StateView } from "@/components/ui/state-view";
import { Colors } from "@/constants/theme";
import { ApiError, errorMessage } from "@/services/api/client";
import { supportService } from "@/services/support.service";
import { useAuthStore } from "@/store/auth-store";
import type { Message } from "@/types/api";
import { formatDateTime } from "@/utils/format";

const POLL_MS = 5000;

// C2 / M6 – Chat: tải tin, poll tin mới mỗi 5 giây khi màn hình đang mở (?after=id tin cuối), dừng khi rời trang.
export function ChatView({ conversationId, closed }: { conversationId: number; closed: boolean }) {
  const me = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  // Đóng từ server (closed) hoặc API trả CONVERSATION_CLOSED khi gửi.
  const [closedByApi, setClosedByApi] = useState(false);
  const locked = closed || closedByApi;
  const listRef = useRef<FlatList<Message>>(null);
  const lastId = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const fresh = await supportService.messages(conversationId, lastId.current);
      if (fresh.length) {
        // Tin mới từ phía kia (lần poll sau lần đầu): làm mới danh sách để cập nhật người phụ trách / trạng thái.
        if (lastId.current && fresh.some((message) => message.senderId !== me?.id)) {
          void queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
        lastId.current = fresh[fresh.length - 1].id;
        setMessages((current) => {
          const known = new Set((current ?? []).map((message) => message.id));
          return [...(current ?? []), ...fresh.filter((message) => !known.has(message.id))];
        });
      } else {
        setMessages((current) => current ?? []);
      }
      setError(null);
    } catch (caught) {
      setError(caught);
    }
  }, [conversationId, me?.id, queryClient]);

  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(() => void load(), POLL_MS);
      return () => clearInterval(timer);
    }, [load]),
  );

  async function send() {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    try {
      await supportService.send(conversationId, content);
      setText("");
      await load();
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "CONVERSATION_CLOSED") setClosedByApi(true);
      else setError(caught);
    } finally {
      setSending(false);
    }
  }

  if (messages === null) return error ? <StateView kind="error" error={error} onRetry={load} /> : <StateView kind="loading" />;

  return (
    <View className="flex-1">
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerClassName="gap-2 p-4"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const mine = item.senderId === me?.id;
          return (
            <View className={`max-w-[80%] gap-0.5 ${mine ? "self-end items-end" : "self-start"}`}>
              {!mine && item.sender ? <Text className="text-xs font-semibold text-muted">{item.sender.name}</Text> : null}
              <View className={`rounded-2xl px-3 py-2 ${mine ? "rounded-br-sm bg-brand" : "rounded-bl-sm border border-line bg-surface-card"}`}>
                <Text className={`text-base ${mine ? "text-white" : "text-brand"}`}>{item.content}</Text>
              </View>
              <Text className="text-[10px] text-muted">{formatDateTime(item.createdAt)}</Text>
            </View>
          );
        }}
        ListEmptyComponent={<StateView kind="empty" icon="chatbubbles-outline" message="Chưa có tin nhắn" compact />}
      />
      {error ? <Text className="px-4 text-xs text-danger">{errorMessage(error)}</Text> : null}
      {locked ? (
        <View className="items-center border-t border-line bg-surface-card p-4">
          <Text className="text-muted">Cuộc trò chuyện đã kết thúc</Text>
        </View>
      ) : (
        <View className="flex-row items-end gap-2 border-t border-line bg-surface-card p-3">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Nhập tin nhắn…"
            placeholderTextColor={Colors.muted}
            multiline
            maxLength={2000}
            className="max-h-32 min-h-11 flex-1 rounded-2xl border border-line bg-surface px-3 py-2 text-base text-brand"
            accessibilityLabel="Nội dung tin nhắn"
          />
          <Pressable
            onPress={send}
            disabled={sending || !text.trim()}
            accessibilityLabel="Gửi"
            className={`h-11 w-11 items-center justify-center rounded-full bg-brand ${sending || !text.trim() ? "opacity-40" : "active:opacity-80"}`}>
            {sending ? <ActivityIndicator color={Colors.white} /> : <Ionicons name="send" size={18} color={Colors.white} />}
          </Pressable>
        </View>
      )}
    </View>
  );
}
