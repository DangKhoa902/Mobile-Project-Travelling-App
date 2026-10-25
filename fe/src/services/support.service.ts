import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/services/api/client";
import type { Conversation, Message, Paginated } from "@/types/api";

export const supportService = {
  async list(status?: "OPEN" | "CLOSED", page = 1) {
    const { data } = await apiClient.get<Paginated<Conversation>>("/conversations", {
      params: { page, limit: 50, ...(status ? { status } : {}) },
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
  async update(id: number, input: { status?: "OPEN" | "CLOSED"; staffId?: number | null }) {
    const { data } = await apiClient.patch<{ data: Conversation }>(`/conversations/${id}`, input);
    return data.data;
  },
};

export function useConversations(status?: "OPEN" | "CLOSED", enabled = true) {
  return useQuery({ queryKey: ["conversations", status ?? "all"], queryFn: () => supportService.list(status), enabled });
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
