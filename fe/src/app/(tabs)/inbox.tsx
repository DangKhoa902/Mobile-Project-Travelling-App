import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { RequireAuth } from "@/components/layout/require-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/choice";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { Colors } from "@/constants/theme";
import { useMarkRead, useNotifications, useReadAll, useUnreadCount } from "@/services/notification.service";
import { useConversations } from "@/services/support.service";
import { useAuthStore } from "@/store/auth-store";
import type { AppNotification, NotificationType } from "@/types/api";
import { notificationHref } from "@/utils/notification-link";
import { relativeTime } from "@/utils/format";

const TYPE_ICON: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  BOOKING: "calendar-outline",
  PAYMENT: "card-outline",
  SUPPORT: "chatbubbles-outline",
  REVIEW: "star-outline",
  SYSTEM: "information-circle-outline",
  PARTNER: "briefcase-outline",
  LISTING: "home-outline",
  PAYOUT: "cash-outline",
};

// T4 – Hộp thư: Thông báo + Hỗ trợ (chat CSKH).
export default function InboxScreen() {
  const [tab, setTab] = useState<"notifications" | "support">("notifications");
  const unread = useUnreadCount();

  return (
    <Screen title="Hộp thư">
      <RequireAuth message="Đăng nhập để xem thông báo và trò chuyện với CSKH">
        <View className="gap-4">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "notifications", label: "Thông báo", count: unread.data },
              { value: "support", label: "Hỗ trợ" },
            ]}
          />
          {tab === "notifications" ? <NotificationList /> : <SupportList />}
        </View>
      </RequireAuth>
    </Screen>
  );
}

function NotificationList() {
  const notifications = useNotifications();
  const markRead = useMarkRead();
  const readAll = useReadAll();
  const role = useAuthStore((state) => state.user?.role);
  const unread = useUnreadCount();

  function open(item: AppNotification) {
    if (!item.isRead) markRead.mutate(item.id);
    const href = notificationHref(item.data, role);
    if (href) router.push(href);
  }

  return (
    <View className="gap-3">
      {unread.data ? (
        <View className="items-end">
          <Button title="Đánh dấu tất cả đã đọc" size="sm" variant="ghost" icon="checkmark-done" loading={readAll.isPending} onPress={() => readAll.mutate()} />
        </View>
      ) : null}
      <QueryState
        query={{ ...notifications, data: notifications.data?.pages.flatMap((page) => page.data) }}
        empty={(items) => (items.length === 0 ? { message: "Chưa có thông báo nào", icon: "notifications-outline" } : null)}>
        {(items) => (
          <View className="gap-2">
            {items.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => open(item)}
                className={`flex-row gap-3 rounded-2xl border p-3 active:opacity-80 ${item.isRead ? "border-line bg-surface-card" : "border-brand-light bg-brand-soft"}`}>
                <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-card">
                  <Ionicons name={TYPE_ICON[item.type] ?? "notifications-outline"} size={20} color={Colors.brandLight} />
                </View>
                <View className="flex-1 gap-0.5">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className={`flex-1 text-base text-brand ${item.isRead ? "font-medium" : "font-bold"}`} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text className="text-xs text-muted">{relativeTime(item.createdAt)}</Text>
                  </View>
                  <Text className="text-sm text-muted">{item.body}</Text>
                </View>
              </Pressable>
            ))}
            {notifications.hasNextPage ? (
              <Button title="Xem thêm" variant="outline" loading={notifications.isFetchingNextPage} onPress={() => void notifications.fetchNextPage()} />
            ) : null}
          </View>
        )}
      </QueryState>
    </View>
  );
}

function SupportList() {
  const conversations = useConversations();
  return (
    <View className="gap-3">
      <Button title="Yêu cầu hỗ trợ" icon="add" onPress={() => router.push("/conversations/new")} />
      <QueryState
        query={conversations}
        empty={(data) => (data.data.length === 0 ? { message: "Bạn chưa gửi yêu cầu hỗ trợ nào", icon: "chatbubbles-outline" } : null)}>
        {(data) => (
          <View className="gap-2">
            {data.data.map((conversation) => (
              <Card key={conversation.id} onPress={() => router.push(`/conversations/${conversation.id}`)} className="gap-1">
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="flex-1 text-base font-bold text-brand" numberOfLines={1}>
                    {conversation.subject}
                  </Text>
                  <Badge label={conversation.status === "OPEN" ? "Đang mở" : "Đã đóng"} tone={conversation.status === "OPEN" ? "green" : "gray"} />
                </View>
                <Text className="text-sm text-muted" numberOfLines={1}>
                  {conversation.messages[0]?.content ?? ""}
                </Text>
                <Text className="text-xs text-muted">{relativeTime(conversation.lastMessageAt)}</Text>
              </Card>
            ))}
          </View>
        )}
      </QueryState>
    </View>
  );
}
