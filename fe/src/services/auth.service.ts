import * as Device from "expo-device";
import { Platform } from "react-native";

import { apiClient } from "@/services/api/client";
import type { LoginSession, Session, User } from "@/types/api";

// Hiện ở trang P5 "Thiết bị đang đăng nhập".
export const deviceName = Platform.OS === "web" ? "Trình duyệt" : (Device.modelName ?? Platform.OS);

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  dateOfBirth?: string;
  acceptTerms: true;
};

export type ProfileInput = Partial<{ name: string; phone: string | null; dateOfBirth: string | null; avatarUrl: string | null }>;

export const authService = {
  async login(email: string, password: string) {
    const { data } = await apiClient.post<{ data: Session }>("/auth/login", { email, password, deviceName });
    return data.data;
  },
  // Đăng nhập / đăng ký bằng Google (ID token lấy từ expo-auth-session).
  async google(idToken: string) {
    const { data } = await apiClient.post<{ data: Session & { isNewUser: boolean } }>("/auth/google", { idToken, deviceName, acceptTerms: true });
    return data.data;
  },
  async register(input: RegisterInput) {
    const { data } = await apiClient.post<{ data: Session }>("/auth/register", input);
    return data.data;
  },
  async refresh(refreshToken: string) {
    const { data } = await apiClient.post<{ data: Session }>("/auth/refresh", { refreshToken, deviceName });
    return data.data;
  },
  async logout(refreshToken: string) {
    await apiClient.post("/auth/logout", { refreshToken });
  },
  async logoutAll() {
    await apiClient.post("/auth/logout-all");
  },
  async me() {
    const { data } = await apiClient.get<{ data: User }>("/auth/me");
    return data.data;
  },
  async updateMe(input: ProfileInput) {
    const { data } = await apiClient.patch<{ data: User }>("/auth/me", input);
    return data.data;
  },
  async changePassword(currentPassword: string, newPassword: string) {
    const { data } = await apiClient.patch<{ data: Session }>("/auth/me/password", { currentPassword, newPassword });
    return data.data;
  },
  async forgotPassword(email: string) {
    const { data } = await apiClient.post<{ data: { message?: string; devResetToken?: string } }>("/auth/forgot-password", { email });
    return data.data ?? {};
  },
  async resetPassword(token: string, newPassword: string) {
    await apiClient.post("/auth/reset-password", { token, newPassword });
  },
  async verifyEmail(token: string) {
    await apiClient.post("/auth/verify-email", { token });
  },
  async resendVerification() {
    const { data } = await apiClient.post<{ data: { devVerificationToken?: string } }>("/auth/resend-verification");
    return data.data ?? {};
  },
  async sessions() {
    const { data } = await apiClient.get<{ data: LoginSession[] }>("/auth/sessions");
    return data.data;
  },
  async revokeSession(id: number) {
    await apiClient.delete(`/auth/sessions/${id}`);
  },
};
