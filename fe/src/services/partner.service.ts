import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError, apiClient } from "@/services/api/client";
import { useAuthStore } from "@/store/auth-store";
import type { AdminPartner, Paginated, PartnerInput, PartnerProfile, PartnerStatus } from "@/types/api";

export const partnerService = {
  // 404 = chưa nộp hồ sơ → trả null thay vì lỗi.
  async me() {
    try {
      const { data } = await apiClient.get<{ data: PartnerProfile }>("/partners/me");
      return data.data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },
  async apply(input: PartnerInput) {
    const { data } = await apiClient.post<{ data: PartnerProfile }>("/partners/apply", { ...input, acceptPartnerTerms: true });
    return data.data;
  },
  async updateMe(input: Partial<PartnerInput>) {
    const { data } = await apiClient.patch<{ data: PartnerProfile }>("/partners/me", input);
    return data.data;
  },
  async list(params: { status?: PartnerStatus; q?: string; page?: number }) {
    const clean = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ""));
    const { data } = await apiClient.get<Paginated<AdminPartner>>("/partners", { params: clean });
    return data;
  },
  async review(id: number, input: { status: "APPROVED" | "REJECTED"; commissionRate?: number; rejectReason?: string }) {
    const { data } = await apiClient.patch(`/partners/${id}/review`, input);
    return data;
  },
  async setStatus(id: number, status: "SUSPENDED" | "APPROVED", reason?: string) {
    const { data } = await apiClient.patch(`/partners/${id}/status`, { status, ...(reason ? { reason } : {}) });
    return data;
  },
  async setCommission(id: number, commissionRate: number) {
    const { data } = await apiClient.patch(`/partners/${id}/commission`, { commissionRate });
    return data;
  },
};

export function useMyPartner() {
  const status = useAuthStore((state) => state.status);
  return useQuery({ queryKey: ["partner", "me"], queryFn: partnerService.me, enabled: status === "authenticated" });
}

export function useApplyPartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: partnerService.apply,
    onSuccess: (profile) => queryClient.setQueryData(["partner", "me"], profile),
  });
}

export function useUpdateMyPartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: partnerService.updateMe,
    onSuccess: (profile) => queryClient.setQueryData(["partner", "me"], profile),
  });
}

export function usePartners(params: { status?: PartnerStatus; q?: string; page?: number }) {
  return useQuery({ queryKey: ["partners", params], queryFn: () => partnerService.list(params) });
}

export function usePartnerActions() {
  const queryClient = useQueryClient();
  const onSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: ["partners"] });
    void queryClient.invalidateQueries({ queryKey: ["stats"] });
  };
  return {
    review: useMutation({
      mutationFn: ({ id, ...input }: { id: number; status: "APPROVED" | "REJECTED"; commissionRate?: number; rejectReason?: string }) =>
        partnerService.review(id, input),
      onSuccess,
    }),
    setStatus: useMutation({
      mutationFn: ({ id, status, reason }: { id: number; status: "SUSPENDED" | "APPROVED"; reason?: string }) => partnerService.setStatus(id, status, reason),
      onSuccess,
    }),
    setCommission: useMutation({
      mutationFn: ({ id, commissionRate }: { id: number; commissionRate: number }) => partnerService.setCommission(id, commissionRate),
      onSuccess,
    }),
  };
}
