import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/services/api/client";
import type { Conversation, Message, Paginated } from "@/types/api";

type ConversationHandler = "AI" | "STAFF";

export const supportService = {
  async list(status?: "OPEN" | "CLOSED", page = 1, handler?: ConversationHandler) {
    const { data } = await apiClient.get<Paginated<Conversation>>("/conversations", {
      params: { page, limit: 50, ...(status ? { status } : {}), ...(handler ? { handler } : {}) },
    });
    return data;
  },
  async create(input: { subject: string; content: string; bookingId?: number }) {
    const { data } = await apiClient.post<{ data: Conversation }>("/conversations", input);
    return data.data;
  },
  async messages(id: number, after?: number) {
    const { data } = await apiClient.get<{ data: Message[] }>(`/conversations/${id}/messages`, { params: after ? { after } : {} });
    return data.data;
  },
  async send(id: number, content: string) {
    const { data } = await apiClient.post<{ data: Message }>(`/conversations/${id}/messages`, { content });
    return data.data;
  },
  async handoff(id: number, reason?: string) {
    const { data } = await apiClient.post<{ data: Conversation }>(`/conversations/${id}/handoff`, reason ? { reason } : {});
    return data.data;
  },
  async aiStatus() {
    const { data } = await apiClient.get<{ data: { enabled: boolean } }>("/ai/status");
    return data.data;
  },
  async suggestReply(id: number) {
    const { data } = await apiClient.post<{ data: { suggestion: string } }>(`/conversations/${id}/ai/suggest`);
    return data.data.suggestion;
  },
  async summarize(id: number) {
    const { data } = await apiClient.post<{ data: { summary: string } }>(`/conversations/${id}/ai/summary`);
    return data.data.summary;
  },
  async update(id: number, input: { status?: "OPEN" | "CLOSED"; staffId?: number | null }) {
    const { data } = await apiClient.patch<{ data: Conversation }>(`/conversations/${id}`, input);
    return data.data;
  },
};

export function useConversations(status?: "OPEN" | "CLOSED", enabled = true, handler?: ConversationHandler) {
  return useQuery({ queryKey: ["conversations", status ?? "all", handler ?? "all"], queryFn: () => supportService.list(status, 1, handler), enabled });
}

// Khách bấm "Gặp nhân viên". ALREADY_WITH_STAFF (409) do màn hình xử lý: chỉ cần làm mới.
export function useHandoff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => supportService.handoff(id, reason),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

// AI bật/tắt: lỗi mạng coi như tắt để không hiện nút AI sai.
export function useAiStatus() {
  const query = useQuery({
    queryKey: ["ai-status"],
    queryFn: () => supportService.aiStatus().catch(() => ({ enabled: false })),
    staleTime: 10 * 60 * 1000,
  });
  return { ...query, enabled: query.data?.enabled === true };
}

// Backend không có GET /conversations/:id: lấy từ danh sách (đã sắp theo tin mới nhất).
export function useConversation(id: number) {
  const query = useConversations();
  return { ...query, data: query.data?.data.find((conversation) => conversation.id === id) };
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: supportService.create,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useUpdateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: number; status?: "OPEN" | "CLOSED"; staffId?: number | null }) => supportService.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["pending-counts"] });
    },
  });
}

// NV/Admin: AI gợi ý câu trả lời (chỉ trả văn bản, không tự gửi).
export function useSuggestReply() {
  return useMutation({ mutationFn: (id: number) => supportService.suggestReply(id) });
}

// NV/Admin: AI tóm tắt hội thoại; server lưu vào aiSummary nên làm mới danh sách.
export function useSummarize() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => supportService.summarize(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
}
