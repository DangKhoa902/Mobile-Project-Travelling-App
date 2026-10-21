import axios, { AxiosError } from "axios";

import { API_URL } from "@/config/env";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiClient = axios.create({ baseURL: API_URL, timeout: 10000 });

// Token và handler được store đăng ký vào đây để tránh import vòng client <-> store.
let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

apiClient.interceptors.request.use((config) => {
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ code?: string; message?: string; details?: unknown }>) => {
    if (!error.response) {
      return Promise.reject(new ApiError("Không kết nối được máy chủ. Kiểm tra mạng và thử lại.", 0, "NETWORK_ERROR"));
    }
    const { status, data } = error.response;
    if (status === 401 && authToken) onUnauthorized?.();
    return Promise.reject(
      new ApiError(data?.message ?? "Đã có lỗi xảy ra", status, data?.code ?? "ERROR", data?.details),
    );
  },
);
