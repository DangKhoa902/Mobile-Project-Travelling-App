import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/services/api/client";
import { useAuthStore } from "@/store/auth-store";
import type { AppNotification, Paginated } from "@/types/api";

export const notificationService = {
  async list(page = 1) {
    const { data } = await apiClient.get<Paginated<AppNotification>>("/notifications", { params: { page } });
    return data;
  },
  async unreadCount() {
    const { data } = await apiClient.get<{ data: { count: number } }>("/notifications/unread-count");
    return data.data.count;
  },
  async markRead(id: number) {
    await apiClient.patch(`/notifications/${id}/read`, { isRead: true });
  },
  async readAll() {
    await apiClient.patch("/notifications/read-all");
  },
};

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: ["notifications", "list"],
    queryFn: ({ pageParam }) => notificationService.list(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
  });
}

// Badge trên tab Hộp thư; tự cập nhật mỗi phút khi app đang mở.
export function useUnreadCount() {
  const status = useAuthStore((state) => state.status);
  return useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: notificationService.unreadCount,
    enabled: status === "authenticated",
    refetchInterval: 60_000,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationService.markRead,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useReadAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationService.readAll,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
