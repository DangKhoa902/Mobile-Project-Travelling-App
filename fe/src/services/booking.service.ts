import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/services/api/client";
import type { Booking, BookingDetail, BookingStatus, CreateBookingInput, Paginated, PaymentChannel, Quote, QuoteInput } from "@/types/api";

export type BookingListParams = {
  scope?: "mine" | "managed";
  status?: BookingStatus;
  code?: string;
  page?: number;
  limit?: number;
};

export const bookingService = {
  async quote(input: QuoteInput) {
    const { data } = await apiClient.post<{ data: Quote }>("/bookings/quote", input);
    return data.data;
  },
  async create(input: CreateBookingInput) {
    const { data } = await apiClient.post<{ data: BookingDetail }>("/bookings", input);
    return data.data;
  },
  async list(params: BookingListParams) {
    const clean = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ""));
    const { data } = await apiClient.get<Paginated<Booking>>("/bookings", { params: clean });
    return data;
  },
  async detail(id: number) {
    const { data } = await apiClient.get<{ data: BookingDetail }>(`/bookings/${id}`);
    return data.data;
  },
  async pay(id: number, channel: PaymentChannel, simulateFailure = false) {
    const { data } = await apiClient.post<{ data: BookingDetail }>(`/bookings/${id}/pay`, { channel, simulateFailure });
    return data.data;
  },
  async cancel(id: number, reason?: string) {
    const { data } = await apiClient.post<{ data: BookingDetail }>(`/bookings/${id}/cancel`, reason ? { reason } : {});
    return data.data;
  },
  async updateStatus(id: number, status: "CONFIRMED" | "COMPLETED") {
    const { data } = await apiClient.patch<{ data: BookingDetail }>(`/bookings/${id}/status`, { status });
    return data.data;
  },
};

export function useQuote(input: QuoteInput | null) {
  return useQuery({
    queryKey: ["quote", input],
    queryFn: () => bookingService.quote(input!),
    enabled: input !== null,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    retry: false,
  });
}

export function useBookings(params: BookingListParams, enabled = true) {
  return useQuery({
    queryKey: ["bookings", params],
    queryFn: () => bookingService.list(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useBooking(id: number | undefined) {
  return useQuery({ queryKey: ["booking", id], queryFn: () => bookingService.detail(id!), enabled: Boolean(id) });
}

// Sau mỗi thao tác ghi: làm mới chi tiết, danh sách, thông báo và số liệu dashboard.
function useInvalidateBooking() {
  const queryClient = useQueryClient();
  return (booking: BookingDetail) => {
    queryClient.setQueryData(["booking", booking.id], booking);
    void queryClient.invalidateQueries({ queryKey: ["booking", booking.id] });
    void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    void queryClient.invalidateQueries({ queryKey: ["stats"] });
  };
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bookingService.create,
    onSuccess: (booking) => {
      queryClient.setQueryData(["booking", booking.id], booking);
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function usePayBooking() {
  const invalidate = useInvalidateBooking();
  return useMutation({
    mutationFn: ({ id, channel, simulateFailure }: { id: number; channel: PaymentChannel; simulateFailure?: boolean }) =>
      bookingService.pay(id, channel, simulateFailure),
    onSuccess: invalidate,
  });
}

export function useCancelBooking() {
  const invalidate = useInvalidateBooking();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => bookingService.cancel(id, reason),
    onSuccess: invalidate,
  });
}

export function useUpdateBookingStatus() {
  const invalidate = useInvalidateBooking();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: "CONFIRMED" | "COMPLETED" }) => bookingService.updateStatus(id, status),
    onSuccess: invalidate,
  });
}
