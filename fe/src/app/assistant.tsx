import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MessageBubble, type ChatItem } from "@/components/assistant/message-bubble";
import { Button, IconButton } from "@/components/ui/button";
import { goBack } from "@/components/ui/screen";
import { StateView } from "@/components/ui/state-view";
import { Colors, MaxContentWidth } from "@/constants/theme";
import { useAiStatus, useAskAssistant } from "@/services/ai.service";
import { ApiError, errorMessage } from "@/services/api/client";

const EXAMPLES = ["Đi Đà Lạt 2 người cuối tuần, ngân sách 3 triệu", "Resort biển có hồ bơi ở Đà Nẵng", "Chính sách hủy phòng thế nào?"];
const MAX_TURNS = 20;

function failureMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 429) return "Bạn hỏi hơi nhanh, thử lại sau ít phút";
  return errorMessage(error);
}

// AI1 – Trợ lý tư vấn: lịch sử giữ trong state của màn hình, mỗi lần gửi kèm tối đa 19 lượt trước.
export default function AssistantScreen() {
  const status = useAiStatus();
  const ask = useAskAssistant();
  const [items, setItems] = useState<ChatItem[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [disabled, setDisabled] = useState(false);
  const nextId = useRef(1);
  const scrollRef = useRef<ScrollView>(null);
  const { mutate } = ask;

  // Gửi `history` (kết thúc bằng lượt user). Lỗi thì lượt user vẫn là tin cuối để "Thử lại".
  const submit = useCallback(
    (history: ChatItem[]) => {
      setError(null);
      const payload = history.slice(-MAX_TURNS).map(({ role, text: turn }) => ({ role, text: turn }));
      while (payload.length > 0 && payload[0].role !== "user") payload.shift();
      mutate(payload, {
        onSuccess: (data) => {
          setItems((current) => [...current, { id: nextId.current++, role: "model", text: data.reply, destinations: data.destinations }]);
        },
        onError: (caught) => {
          if (caught instanceof ApiError && caught.code === "AI_DISABLED") setDisabled(true);
          else setError(caught);
        },
      });
    },
    [mutate],
  );

  function send(content: string) {
    const value = content.trim();
    if (!value || ask.isPending) return;
    // Lượt user cuối còn dang dở (lần gửi trước lỗi): gộp để không có hai lượt user liên tiếp.
    const last = items[items.length - 1];
    const history: ChatItem[] =
      last && last.role === "user"
        ? [...items.slice(0, -1), { ...last, text: `${last.text}\n${value}`.slice(0, 2000) }]
        : [...items, { id: nextId.current++, role: "user", text: value }];
    setItems(history);
    setText("");
    submit(history);
  }

  function reset() {
    ask.reset();
    setItems([]);
    setError(null);
    setText("");
  }

  const off = disabled || (!status.isLoading && !status.enabled);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "web" ? undefined : "padding"}>
        <View className="w-full flex-row items-center gap-1 self-center px-2 pb-2 pt-2" style={{ maxWidth: MaxContentWidth }}>
          <IconButton icon="arrow-back" label="Quay lại" onPress={() => goBack("/")} />
          <Text className="flex-1 text-xl font-bold text-brand" numberOfLines={1} accessibilityRole="header">
            Trợ lý AI tư vấn
          </Text>
          {items.length > 0 && !off ? <IconButton icon="refresh" label="Cuộc trò chuyện mới" onPress={reset} /> : null}
        </View>

        {status.isLoading && !disabled ? (
          <StateView kind="loading" />
        ) : off ? (
          <StateView kind="empty" icon="sparkles-outline" message="Trợ lý AI đang tạm tắt" action={{ label: "Tìm địa điểm", onPress: () => router.replace("/search") }} />
        ) : (
          <>
            <ScrollView
              ref={scrollRef}
              className="flex-1"
              keyboardShouldPersistTaps="handled"
              contentContainerClassName="w-full gap-3 self-center p-4"
              contentContainerStyle={{ maxWidth: MaxContentWidth }}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
              {items.length === 0 ? (
                <View className="gap-3">
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="sparkles" size={14} color={Colors.info} />
                    <Text className="text-sm font-semibold text-info">Trợ lý AI</Text>
                  </View>
                  <Text className="text-base text-brand">
                    Mô tả chuyến đi bạn muốn (địa điểm, số người, ngân sách, thời gian), tôi sẽ gợi ý các nơi phù hợp trên Travelling App.
                  </Text>
                  <View className="gap-2">
                    {EXAMPLES.map((example) => (
                      <Pressable
                        key={example}
                        onPress={() => send(example)}
                        accessibilityRole="button"
                        accessibilityLabel={`Hỏi: ${example}`}
                        className="min-h-11 justify-center self-start rounded-2xl border border-info/30 bg-info-soft px-3 py-2 active:opacity-80">
                        <Text className="text-base text-info">{example}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : (
                items.map((item) => <MessageBubble key={item.id} item={item} />)
              )}
              {ask.isPending ? (
                <View className="flex-row items-center gap-2" accessibilityLiveRegion="polite">
                  <ActivityIndicator size="small" color={Colors.info} />
                  <Text className="text-sm text-muted">Trợ lý AI đang trả lời…</Text>
                </View>
              ) : null}
              {error ? (
                <View className="flex-row flex-wrap items-center gap-2" accessibilityLiveRegion="polite">
                  <Text className="text-sm text-danger">{failureMessage(error)}</Text>
                  <Button title="Thử lại" size="sm" variant="outline" onPress={() => submit(items)} />
                </View>
              ) : null}
            </ScrollView>

            <SafeAreaView edges={["bottom"]} className="border-t border-line bg-surface-card">
              <View className="w-full gap-1 self-center p-3" style={{ maxWidth: MaxContentWidth }}>
                <View className="flex-row items-end gap-2">
                  <TextInput
                    value={text}
                    onChangeText={setText}
                    placeholder="Hỏi về chuyến đi của bạn…"
                    placeholderTextColor={Colors.muted}
                    multiline
                    maxLength={2000}
                    className="max-h-32 min-h-11 flex-1 rounded-2xl border border-line bg-surface px-3 py-2 text-base text-brand"
                    accessibilityLabel="Câu hỏi cho trợ lý AI"
                  />
                  <Pressable
                    onPress={() => send(text)}
                    disabled={ask.isPending || !text.trim()}
                    accessibilityRole="button"
                    accessibilityLabel="Gửi"
                    className={`h-11 w-11 items-center justify-center rounded-full bg-brand ${ask.isPending || !text.trim() ? "opacity-40" : "active:opacity-80"}`}>
                    <Ionicons name="send" size={18} color={Colors.white} />
                  </Pressable>
                </View>
                <Text className="text-xs text-muted">Trợ lý AI có thể sai, hãy kiểm tra lại giá ở bước đặt chỗ.</Text>
                {items.length > 0 ? (
                  <Pressable onPress={reset} accessibilityRole="button" accessibilityLabel="Cuộc trò chuyện mới" hitSlop={8} className="self-start">
                    <Text className="text-xs font-semibold text-brand-light">Cuộc trò chuyện mới</Text>
                  </Pressable>
                ) : null}
              </View>
            </SafeAreaView>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
