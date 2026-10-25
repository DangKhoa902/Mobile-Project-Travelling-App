import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { apiClient } from "@/services/api/client";
import type { StatsOverview } from "@/types/api";

export const statsService = {
  async overview(from: string, to: string) {
    const { data } = await apiClient.get<{ data: StatsOverview }>("/stats/overview", { params: { from, to } });
    return data.data;
  },
  // Staff không gọi được /stats/overview: đếm việc cần xử lý bằng meta.total của các danh sách.
  async staffPending() {
    const [bookings, reviews, conversations] = await Promise.all([
      apiClient.get("/bookings", { params: { status: "PENDING", limit: 1 } }),
      apiClient.get("/reviews/moderation", { params: { status: "PENDING", limit: 1 } }),
      apiClient.get("/conversations", { params: { status: "OPEN", limit: 1 } }),
    ]);
    return {
      bookingsToConfirm: bookings.data.meta.total as number,
      reviewsToModerate: reviews.data.meta?.total ?? reviews.data.data.length,
      openConversations: conversations.data.meta.total as number,
    };
  },
};

export function useStats(from: string, to: string) {
  return useQuery({ queryKey: ["stats", from, to], queryFn: () => statsService.overview(from, to), placeholderData: keepPreviousData });
}

export function useStaffPending(enabled: boolean) {
  return useQuery({ queryKey: ["pending-counts"], queryFn: statsService.staffPending, enabled });
}
