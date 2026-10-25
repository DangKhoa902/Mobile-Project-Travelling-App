import * as Sentry from "@sentry/node";
import { env } from "../config/env.js";

export type ErrorContext = {
  requestId?: string;
  method?: string;
  route?: string;
  userId?: number;
  job?: string;
};

let enabled = false;

// Không có SENTRY_DSN thì mọi hàm ở đây là no-op: dev và test không gửi gì ra ngoài.
export function initMonitoring() {
  if (!env.SENTRY_DSN || enabled) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    release: env.SENTRY_RELEASE,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    // Không gửi dữ liệu cá nhân: không cookie, không body, không query, không thông tin user tự động.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpBodies: [],
      urlQueryParams: false,
      httpHeaders: { request: { deny: ["authorization", "cookie", "x-refresh-token"] }, response: false },
    },
    beforeSend(event) {
      // Lớp chặn thứ hai, phòng khi một integration tự thêm dữ liệu request.
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        delete event.request.query_string;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }
      return event;
    },
  });
  enabled = true;
}

export function captureError(error: unknown, context: ErrorContext = {}) {
  if (!enabled) return undefined;
  return Sentry.withScope((scope) => {
    if (context.requestId) scope.setTag("request_id", context.requestId);
    if (context.method) scope.setTag("http.method", context.method);
    if (context.route) scope.setTag("route", context.route);
    if (context.job) scope.setTag("job", context.job);
    // Chỉ gửi id người dùng, không gửi email/tên.
    if (context.userId) scope.setUser({ id: String(context.userId) });
    return Sentry.captureException(error);
  });
}

// Gửi nốt sự kiện còn trong hàng đợi trước khi tắt tiến trình.
export async function flushMonitoring(timeoutMs = 2000) {
  if (enabled) await Sentry.flush(timeoutMs);
}
