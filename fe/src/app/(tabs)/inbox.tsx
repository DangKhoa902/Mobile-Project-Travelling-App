import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlatList, Pressable, Text, View } from "react-native";

import { RequireAuth } from "@/components/require-auth";
import { Screen } from "@/components/screen";
import { StateView } from "@/components/state-view";
import { notificationService } from "@/services/travel.service";

export default function InboxScreen() {
  return (
    <Screen title="Hộp thư">
      <RequireAuth message="Đăng nhập để nhận thông báo đặt chỗ và trò chuyện với CSKH.">
        <NotificationList />
      </RequireAuth>
    </Screen>
  );
}

function NotificationList() {
  const queryClient = useQueryClient();
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: notificationService.list });
  const markAllRead = useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (notifications.isPending) return <StateView kind="loading" />;
  if (notifications.isError) {
    return <StateView kind="error" message={notifications.error.message} onRetry={() => void notifications.refetch()} />;
  }

  const hasUnread = notifications.data.data.some((item) => !item.isRead);
  return (
    <FlatList
      data={notifications.data.data}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        hasUnread ? (
          <Pressable onPress={() => markAllRead.mutate()} className="mb-3 self-end active:opacity-70">
            <Text className="text-sm font-semibold text-brand-light">Đánh dấu tất cả đã đọc</Text>
          </Pressable>
        ) : null
      }
      renderItem={({ item }) => (
        <View className={`gap-1 rounded-2xl p-4 ${item.isRead ? "bg-surface-card" : "bg-brand-soft"}`}>
          <Text className="text-base font-bold text-brand">{item.title}</Text>
          <Text className="text-sm text-muted">{item.body}</Text>
          <Text className="text-xs text-muted">{new Date(item.createdAt).toLocaleString("vi-VN")}</Text>
        </View>
      )}
      ItemSeparatorComponent={() => <View className="h-3" />}
      contentContainerClassName="pb-28"
      refreshing={notifications.isRefetching}
      onRefresh={() => void notifications.refetch()}
      ListEmptyComponent={<StateView kind="empty" icon="mail-open-outline" message="Chưa có thông báo nào." />}
    />
  );
}
