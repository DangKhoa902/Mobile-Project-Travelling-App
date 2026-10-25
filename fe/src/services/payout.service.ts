import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/services/api/client";
import type { Paginated, Payout, PayoutDetail, PayoutPreviewRow, PayoutStatus, Unsettled } from "@/types/api";

export const payoutService = {
  async list(params: { status?: PayoutStatus; page?: number }) {
    const clean = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined));
    const { data } = await apiClient.get<Paginated<Payout>>("/payouts", { params: clean });
    return data;
  },
  async detail(id: number) {
    const { data } = await apiClient.get<{ data: PayoutDetail }>(`/payouts/${id}`);
    return data.data;
  },
  async unsettled() {
    const { data } = await apiClient.get<{ data: Unsettled }>("/payouts/unsettled");
    return data.data;
  },
  async preview(periodStart: string, periodEnd: string) {
    const { data } = await apiClient.get<{ data: PayoutPreviewRow[] }>("/payouts/preview", { params: { periodStart, periodEnd } });
    return data.data;
  },
  async create(input: { ownerId: number; periodStart: string; periodEnd: string; note?: string }) {
    const { data } = await apiClient.post<{ data: Payout }>("/payouts", input);
    return data.data;
  },
  async pay(id: number, transferRef: string) {
    const { data } = await apiClient.patch<{ data: Payout }>(`/payouts/${id}/pay`, { transferRef });
    return data.data;
  },
  async cancel(id: number, reason?: string) {
    const { data } = await apiClient.patch<{ data: Payout }>(`/payouts/${id}/cancel`, reason ? { reason } : {});
    return data.data;
  },
};

export function usePayouts(params: { status?: PayoutStatus; page?: number }) {
  return useQuery({ queryKey: ["payouts", "list", params], queryFn: () => payoutService.list(params) });
}

export function usePayout(id: number | null) {
  return useQuery({ queryKey: ["payouts", "detail", id], queryFn: () => payoutService.detail(id!), enabled: Boolean(id) });
}

export function useUnsettled() {
  return useQuery({ queryKey: ["payouts", "unsettled"], queryFn: payoutService.unsettled });
}

export function usePayoutPreview(periodStart: string, periodEnd: string, enabled: boolean) {
  return useQuery({ queryKey: ["payouts", "preview", periodStart, periodEnd], queryFn: () => payoutService.preview(periodStart, periodEnd), enabled, retry: false });
}

export function usePayoutActions() {
  const queryClient = useQueryClient();
  const onSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: ["payouts"] });
    void queryClient.invalidateQueries({ queryKey: ["stats"] });
  };
  return {
    create: useMutation({ mutationFn: payoutService.create, onSuccess }),
    pay: useMutation({ mutationFn: ({ id, transferRef }: { id: number; transferRef: string }) => payoutService.pay(id, transferRef), onSuccess }),
    cancel: useMutation({ mutationFn: ({ id, reason }: { id: number; reason?: string }) => payoutService.cancel(id, reason), onSuccess }),
  };
}
