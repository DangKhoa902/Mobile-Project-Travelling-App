import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/services/api/client";
import type {
  AddonService,
  Category,
  DestinationDetail,
  Facility,
  ListingStatus,
  ManagedDestination,
  ManagedDestinationDetail,
  Paginated,
  PricingUnit,
  RoomRate,
  RoomType,
  TravelPackage,
  Voucher,
} from "@/types/api";

export type DestinationInput = Partial<{
  name: string;
  description: string | null;
  location: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  images: string[];
  contactPhone: string | null;
  contactEmail: string | null;
  policy: string | null;
  categoryId: number | null;
  facilityIds: number[];
  isActive: boolean;
  isFeatured: boolean;
  ownerId: number | null;
}>;

export type PackageInput = {
  destinationId: number;
  name: string;
  description?: string | null;
  inclusions?: string[];
  durationDays: number;
  durationNights: number;
  price: number;
  freeCancellationHours?: number;
  isActive?: boolean;
};

export type RoomTypeInput = {
  destinationId: number;
  name: string;
  description?: string | null;
  capacity: number;
  pricePerNight: number;
  totalRooms: number;
  isActive?: boolean;
};

export type AddonInput = { destinationId: number; name: string; description?: string | null; price: number; pricingUnit?: PricingUnit; isActive?: boolean };
export type RateInput = { name: string; startDate: string; endDate: string; pricePerNight: number };
export type VoucherInput = Omit<Voucher, "id" | "usedCount">;

export type ManageListParams = { listingStatus?: ListingStatus; ownerId?: number; q?: string; page?: number };

const clean = (params: object) => Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ""));

export const manageService = {
  async list(params: ManageListParams) {
    const { data } = await apiClient.get<Paginated<ManagedDestination>>("/manage/destinations", { params: clean(params) });
    return data;
  },
  async detail(id: number) {
    const { data } = await apiClient.get<{ data: ManagedDestinationDetail }>(`/manage/destinations/${id}`);
    return data.data;
  },
  async createDestination(input: DestinationInput) {
    const { data } = await apiClient.post<{ data: DestinationDetail }>("/destinations", input);
    return data.data;
  },
  async updateDestination(id: number, input: DestinationInput) {
    const { data } = await apiClient.patch<{ data: DestinationDetail }>(`/destinations/${id}`, input);
    return data.data;
  },
  async submit(id: number) {
    const { data } = await apiClient.post(`/destinations/${id}/submit`);
    return data;
  },
  async reviewListing(id: number, status: "APPROVED" | "REJECTED", rejectReason?: string) {
    const { data } = await apiClient.patch(`/destinations/${id}/review`, { status, ...(rejectReason ? { rejectReason } : {}) });
    return data;
  },
  async removeDestination(id: number) {
    await apiClient.delete(`/destinations/${id}`);
  },
  async savePackage(id: number | null, input: PackageInput) {
    const { data } = id
      ? await apiClient.patch<{ data: TravelPackage }>(`/packages/${id}`, { ...input, destinationId: undefined })
      : await apiClient.post<{ data: TravelPackage }>("/packages", input);
    return data.data;
  },
  async saveRoomType(id: number | null, input: RoomTypeInput) {
    const { data } = id
      ? await apiClient.patch<{ data: RoomType }>(`/room-types/${id}`, { ...input, destinationId: undefined })
      : await apiClient.post<{ data: RoomType }>("/room-types", input);
    return data.data;
  },
  async saveAddon(id: number | null, input: AddonInput) {
    const { data } = id
      ? await apiClient.patch<{ data: AddonService }>(`/addon-services/${id}`, { ...input, destinationId: undefined })
      : await apiClient.post<{ data: AddonService }>("/addon-services", input);
    return data.data;
  },
  async rates(roomTypeId: number) {
    const { data } = await apiClient.get<{ data: RoomRate[] }>(`/room-types/${roomTypeId}/rates`);
    return data.data;
  },
  async saveRate(roomTypeId: number, rateId: number | null, input: RateInput) {
    const { data } = rateId
      ? await apiClient.patch<{ data: RoomRate }>(`/room-types/${roomTypeId}/rates/${rateId}`, input)
      : await apiClient.post<{ data: RoomRate }>(`/room-types/${roomTypeId}/rates`, input);
    return data.data;
  },
  async removeRate(roomTypeId: number, rateId: number) {
    await apiClient.delete(`/room-types/${roomTypeId}/rates/${rateId}`);
  },
  // ---------- Danh mục, tiện ích, voucher (ADMIN) ----------
  async saveCategory(id: number | null, input: { name: string; slug?: string; iconName?: string | null }) {
    const { data } = id ? await apiClient.patch<{ data: Category }>(`/categories/${id}`, input) : await apiClient.post<{ data: Category }>("/categories", input);
    return data.data;
  },
  async removeCategory(id: number) {
    await apiClient.delete(`/categories/${id}`);
  },
  async saveFacility(id: number | null, input: { name: string; iconName?: string | null }) {
    const { data } = id ? await apiClient.patch<{ data: Facility }>(`/facilities/${id}`, input) : await apiClient.post<{ data: Facility }>("/facilities", input);
    return data.data;
  },
  async removeFacility(id: number) {
    await apiClient.delete(`/facilities/${id}`);
  },
  async vouchers(page = 1) {
    const { data } = await apiClient.get<Paginated<Voucher>>("/vouchers", { params: { page } });
    return data;
  },
  async saveVoucher(id: number | null, input: Partial<VoucherInput>) {
    const body = id ? { ...input, code: undefined } : input;
    const { data } = id ? await apiClient.patch<{ data: Voucher }>(`/vouchers/${id}`, body) : await apiClient.post<{ data: Voucher }>("/vouchers", body);
    return data.data;
  },
};

export function useManagedDestinations(params: ManageListParams) {
  return useQuery({ queryKey: ["manage", "destinations", params], queryFn: () => manageService.list(params), placeholderData: keepPreviousData });
}

export function useManagedDestination(id: number | null) {
  return useQuery({ queryKey: ["manage", "destination", id], queryFn: () => manageService.detail(id!), enabled: Boolean(id) });
}

export function useRoomRates(roomTypeId: number) {
  return useQuery({ queryKey: ["manage", "rates", roomTypeId], queryFn: () => manageService.rates(roomTypeId) });
}

// Mọi thao tác ghi ở khu quản lý đều làm mới cùng một nhóm query.
export function useInvalidateManage() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["manage"] });
    void queryClient.invalidateQueries({ queryKey: ["destinations"] });
    void queryClient.invalidateQueries({ queryKey: ["destination"] });
    void queryClient.invalidateQueries({ queryKey: ["stats"] });
    void queryClient.invalidateQueries({ queryKey: ["categories"] });
    void queryClient.invalidateQueries({ queryKey: ["facilities"] });
  };
}

export function useManageMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const invalidate = useInvalidateManage();
  return useMutation({ mutationFn: fn, onSuccess: invalidate });
}

export function useVouchers(page: number) {
  return useQuery({ queryKey: ["manage", "vouchers", page], queryFn: () => manageService.vouchers(page) });
}
