import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/services/api/client";
import { useAuthStore } from "@/store/auth-store";
import type { Availability, Category, DestinationDetail, DestinationSummary, Facility, Paginated, PublicReview, RoomRate } from "@/types/api";

export type DestinationFilters = {
  q?: string;
  categoryId?: number;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  facilityIds?: number[];
  featured?: boolean;
  sort?: "newest" | "popular" | "rating" | "price_asc" | "price_desc" | "name";
  limit?: number;
};

function toParams(filters: DestinationFilters, page = 1) {
  const { facilityIds, ...rest } = filters;
  return {
    ...Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== undefined && value !== "")),
    ...(facilityIds?.length ? { facilityIds: facilityIds.join(",") } : {}),
    page,
  };
}

export const destinationService = {
  async categories() {
    const { data } = await apiClient.get<{ data: Category[] }>("/categories");
    return data.data;
  },
  async facilities() {
    const { data } = await apiClient.get<{ data: Facility[] }>("/facilities");
    return data.data;
  },
  async list(filters: DestinationFilters, page = 1) {
    const { data } = await apiClient.get<Paginated<DestinationSummary>>("/destinations", { params: toParams(filters, page) });
    return data;
  },
  async detail(idOrSlug: string | number) {
    const { data } = await apiClient.get<{ data: DestinationDetail }>(`/destinations/${idOrSlug}`);
    return data.data;
  },
  async reviews(id: number, page = 1) {
    const { data } = await apiClient.get<Paginated<PublicReview>>(`/destinations/${id}/reviews`, { params: { page, limit: 10 } });
    return data;
  },
  async availability(id: number, roomTypeId: number, checkInDate: string, checkOutDate: string) {
    const { data } = await apiClient.get<{ data: Availability }>(`/destinations/${id}/availability`, {
      params: { roomTypeId, checkInDate, checkOutDate },
    });
    return data.data;
  },
  async roomRates(roomTypeId: number) {
    const { data } = await apiClient.get<{ data: RoomRate[] }>(`/room-types/${roomTypeId}/rates`);
    return data.data;
  },
  async favorites() {
    const { data } = await apiClient.get<Paginated<DestinationSummary>>("/favorites", { params: { limit: 100 } });
    return data;
  },
  async toggleFavorite(destinationId: number) {
    const { data } = await apiClient.post<{ data: { isFavorite: boolean } }>(`/favorites/${destinationId}/toggle`);
    return data.data;
  },
};

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: destinationService.categories, staleTime: 5 * 60_000 });
}

export function useFacilities() {
  return useQuery({ queryKey: ["facilities"], queryFn: destinationService.facilities, staleTime: 5 * 60_000 });
}

export function useDestinations(filters: DestinationFilters) {
  return useQuery({ queryKey: ["destinations", filters], queryFn: () => destinationService.list(filters) });
}

export function useInfiniteDestinations(filters: DestinationFilters) {
  return useInfiniteQuery({
    queryKey: ["destinations", "infinite", filters],
    queryFn: ({ pageParam }) => destinationService.list({ limit: 20, ...filters }, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
}

export function useDestination(idOrSlug: string | number | undefined) {
  // Gửi kèm token để có isFavorite đúng; đổi người dùng thì tải lại.
  const userId = useAuthStore((state) => state.user?.id ?? null);
  return useQuery({
    queryKey: ["destination", String(idOrSlug), userId],
    queryFn: () => destinationService.detail(idOrSlug!),
    enabled: idOrSlug !== undefined && idOrSlug !== "",
  });
}

export function useDestinationReviews(id: number | undefined) {
  return useInfiniteQuery({
    queryKey: ["destination-reviews", id],
    queryFn: ({ pageParam }) => destinationService.reviews(id!, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    enabled: Boolean(id),
  });
}

export function useAvailability(destinationId: number, roomTypeId: number, checkInDate: string | null, checkOutDate: string | null) {
  return useQuery({
    queryKey: ["availability", destinationId, roomTypeId, checkInDate, checkOutDate],
    queryFn: () => destinationService.availability(destinationId, roomTypeId, checkInDate!, checkOutDate!),
    enabled: Boolean(checkInDate && checkOutDate && checkInDate < checkOutDate),
    staleTime: 15_000,
  });
}

export function useFavorites() {
  const status = useAuthStore((state) => state.status);
  return useQuery({ queryKey: ["favorites"], queryFn: destinationService.favorites, enabled: status === "authenticated" });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: destinationService.toggleFavorite,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["favorites"] });
      void queryClient.invalidateQueries({ queryKey: ["destination"] });
    },
  });
}
