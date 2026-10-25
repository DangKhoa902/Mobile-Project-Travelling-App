import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/services/api/client";
import type { ModerationReview, MyReview, Paginated, ReviewStatus } from "@/types/api";

export type ReviewInput = { rating: number; comment?: string; imageUrls?: string[] };

export const reviewService = {
  async create(input: ReviewInput & { bookingId: number }) {
    const { data } = await apiClient.post<{ data: MyReview }>("/reviews", input);
    return data.data;
  },
  async mine() {
    const { data } = await apiClient.get<Paginated<MyReview>>("/reviews/mine", { params: { limit: 100 } });
    return data;
  },
  async update(id: number, input: ReviewInput) {
    const { data } = await apiClient.patch<{ data: MyReview }>(`/reviews/${id}`, input);
    return data.data;
  },
  async remove(id: number) {
    await apiClient.delete(`/reviews/${id}`);
  },
  async moderation(status: ReviewStatus, page = 1) {
    const { data } = await apiClient.get<Paginated<ModerationReview>>("/reviews/moderation", { params: { status, page } });
    return data;
  },
  async moderate(id: number, status: "APPROVED" | "REJECTED", rejectReason?: string) {
    const { data } = await apiClient.patch(`/reviews/${id}/moderation`, { status, ...(rejectReason ? { rejectReason } : {}) });
    return data;
  },
};

export function useMyReviews() {
  return useQuery({ queryKey: ["reviews", "mine"], queryFn: reviewService.mine });
}

function useInvalidateReviews() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["reviews"] });
    void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    void queryClient.invalidateQueries({ queryKey: ["booking"] });
    void queryClient.invalidateQueries({ queryKey: ["destination"] });
    void queryClient.invalidateQueries({ queryKey: ["destination-reviews"] });
  };
}

export function useSaveReview() {
  const invalidate = useInvalidateReviews();
  return useMutation({
    mutationFn: ({ reviewId, bookingId, input }: { reviewId?: number; bookingId?: number; input: ReviewInput }) =>
      reviewId ? reviewService.update(reviewId, input) : reviewService.create({ ...input, bookingId: bookingId! }),
    onSuccess: invalidate,
  });
}

export function useDeleteReview() {
  const invalidate = useInvalidateReviews();
  return useMutation({ mutationFn: reviewService.remove, onSuccess: invalidate });
}

export function useModerationReviews(status: ReviewStatus, page: number) {
  return useQuery({ queryKey: ["reviews", "moderation", status, page], queryFn: () => reviewService.moderation(status, page) });
}

export function useModerateReview() {
  const invalidate = useInvalidateReviews();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, rejectReason }: { id: number; status: "APPROVED" | "REJECTED"; rejectReason?: string }) =>
      reviewService.moderate(id, status, rejectReason),
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
      void queryClient.invalidateQueries({ queryKey: ["pending-counts"] });
    },
  });
}
