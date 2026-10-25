import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import { API_URL } from "@/config/env";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: { path: string; message: string }[],
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// eslint-disable-next-line import/no-named-as-default-member -- cách dùng chuẩn trong tài liệu axios
export const apiClient = axios.create({ baseURL: API_URL, timeout: 15000 });

// Endpoint xác thực không cần access token: không chờ cổng, không tự làm mới khi 401.
const PUBLIC_AUTH = /^\/auth\/(login|register|refresh|logout|forgot-password|reset-password|verify-email)$/;

// Store đăng ký token và hàm làm mới vào đây để tránh import vòng client <-> store.
let accessToken: string | null = null;
let refreshHandler: (() => Promise<string | null>) | null = null;
let refreshing: Promise<string | null> | null = null;

// Lúc mở app, request (trừ PUBLIC_AUTH) chờ khôi phục phiên xong rồi mới gửi; nếu không, request
// mang access token cũ sẽ 401 và gọi /auth/refresh song song với lần làm mới của hydrate.
let markReady: () => void = () => {};
const authReady = new Promise<void>((resolve) => {
  markReady = resolve;
});

export function markAuthReady() {
  markReady();
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setRefreshHandler(handler: () => Promise<string | null>) {
  refreshHandler = handler;
}

// Chỉ làm mới một lần cùng lúc: các request 401 đồng thời cùng chờ một promise,
// nếu không refresh token xoay vòng sẽ bị coi là dùng lại và cả phiên bị thu hồi.
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshHandler) return Promise.resolve(null);
  refreshing ??= refreshHandler().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

apiClient.interceptors.request.use(async (config) => {
  if (!PUBLIC_AUTH.test(config.url ?? "")) await authReady;
  if (accessToken && !config.headers.Authorization) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };
type ErrorBody = { code?: string; message?: string; details?: { path: string; message: string }[]; requestId?: string };

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ErrorBody>) => {
    if (!error.response) {
      return Promise.reject(new ApiError("Không kết nối được máy chủ. Kiểm tra mạng và thử lại.", 0, "NETWORK_ERROR"));
    }
    const { status, data } = error.response;
    const config = error.config as RetriableConfig | undefined;

    // Access token hết hạn (15 phút): làm mới rồi gửi lại request ban đầu đúng một lần.
    if (status === 401 && config && !config._retried && !PUBLIC_AUTH.test(config.url ?? "") && accessToken) {
      config._retried = true;
      const token = await refreshAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        return apiClient(config);
      }
    }

    return Promise.reject(
      new ApiError(
        data?.message ?? "Đã có lỗi xảy ra",
        status,
        data?.code ?? "ERROR",
        data?.details,
        data?.requestId ?? (error.response.headers["x-request-id"] as string | undefined),
      ),
    );
  },
);

// Lỗi validation theo ô: { email: "Email đã được sử dụng" }.
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.details) return {};
  const result: Record<string, string> = {};
  for (const issue of error.details) {
    const key = String(issue.path).split(".")[0];
    result[key] ??= issue.message;
  }
  return result;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status >= 500 && error.requestId) return `${error.message} (Mã lỗi: ${error.requestId.slice(0, 8)})`;
    return error.message;
  }
  return error instanceof Error ? error.message : "Đã có lỗi xảy ra";
}
