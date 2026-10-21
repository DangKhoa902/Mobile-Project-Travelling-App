import { apiClient } from "@/services/api/client";
import type {
  AppNotification,
  AuthResult,
  BookingSummary,
  Category,
  DestinationDetail,
  DestinationSummary,
  Paginated,
  User,
} from "@/types/api";

export type DestinationFilters = {
  q?: string;
  categoryId?: number;
  featured?: boolean;
  sort?: "newest" | "popular" | "rating" | "price_asc" | "price_desc";
  page?: number;
  limit?: number;
};

export const authService = {
  login: (email: string, password: string) =>
    apiClient.post<{ data: AuthResult }>("/auth/login", { email, password }).then((r) => r.data.data),
  register: (input: { name: string; email: string; password: string; phone?: string }) =>
    apiClient.post<{ data: AuthResult }>("/auth/register", input).then((r) => r.data.data),
  me: () => apiClient.get<{ data: User }>("/auth/me").then((r) => r.data.data),
};

export const destinationService = {
  list: (filters: DestinationFilters = {}) =>
    apiClient.get<Paginated<DestinationSummary>>("/destinations", { params: filters }).then((r) => r.data),
  detail: (idOrSlug: number | string) =>
    apiClient.get<{ data: DestinationDetail }>(`/destinations/${idOrSlug}`).then((r) => r.data.data),
  categories: () => apiClient.get<{ data: Category[] }>("/categories").then((r) => r.data.data),
};

export const favoriteService = {
  list: () => apiClient.get<Paginated<DestinationSummary>>("/favorites").then((r) => r.data),
  toggle: (destinationId: number) =>
    apiClient
      .post<{ data: { destinationId: number; isFavorite: boolean } }>(`/favorites/${destinationId}/toggle`)
      .then((r) => r.data.data),
};

export const bookingService = {
  list: () => apiClient.get<Paginated<BookingSummary>>("/bookings").then((r) => r.data),
};

export const notificationService = {
  list: () => apiClient.get<Paginated<AppNotification>>("/notifications").then((r) => r.data),
  markAllRead: () => apiClient.patch("/notifications/read-all"),
};
