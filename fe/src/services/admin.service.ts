import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/services/api/client";
import type { AuditLog, Booking, Paginated, Role, User, UserStatus } from "@/types/api";

export type UserListParams = { q?: string; role?: Role; status?: UserStatus; page?: number };
export type AuditParams = { actorId?: number; entity?: string; entityId?: string; action?: string; from?: string; to?: string; page?: number };

const clean = (params: object) => Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ""));

export const adminService = {
  async users(params: UserListParams) {
    const { data } = await apiClient.get<Paginated<User>>("/users", { params: clean(params) });
    return data;
  },
  async userBookings(id: number) {
    const { data } = await apiClient.get<Paginated<Booking>>(`/users/${id}/bookings`, { params: { limit: 10 } });
    return data;
  },
  async setUserStatus(id: number, status: UserStatus) {
    const { data } = await apiClient.patch(`/users/${id}/status`, { status });
    return data;
  },
  async setUserRole(id: number, role: Exclude<Role, "OWNER">) {
    const { data } = await apiClient.patch(`/users/${id}/role`, { role });
    return data;
  },
  async auditLogs(params: AuditParams) {
    const { data } = await apiClient.get<Paginated<AuditLog>>("/audit-logs", { params: clean(params) });
    return data;
  },
};

export function useUsers(params: UserListParams) {
  return useQuery({ queryKey: ["users", params], queryFn: () => adminService.users(params), placeholderData: keepPreviousData });
}

export function useUserBookings(id: number | null) {
  return useQuery({ queryKey: ["users", "bookings", id], queryFn: () => adminService.userBookings(id!), enabled: Boolean(id) });
}

export function useUserActions() {
  const queryClient = useQueryClient();
  const onSuccess = () => void queryClient.invalidateQueries({ queryKey: ["users"] });
  return {
    setStatus: useMutation({ mutationFn: ({ id, status }: { id: number; status: UserStatus }) => adminService.setUserStatus(id, status), onSuccess }),
    setRole: useMutation({ mutationFn: ({ id, role }: { id: number; role: Exclude<Role, "OWNER"> }) => adminService.setUserRole(id, role), onSuccess }),
  };
}

export function useAuditLogs(params: AuditParams) {
  return useQuery({ queryKey: ["audit-logs", params], queryFn: () => adminService.auditLogs(params), placeholderData: keepPreviousData });
}
