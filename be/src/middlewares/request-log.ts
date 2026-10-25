import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

// Mã do proxy / client gửi lên chỉ được nhận nếu ngắn và an toàn, để không chèn được ký tự lạ vào log.
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/;

// Không log health check: uptime monitor gọi mỗi phút sẽ làm ngập log.
const SKIP_PATHS = new Set(["/health"]);

// Gắn mã request (trả về ở header X-Request-Id) và ghi một dòng JSON khi request kết thúc:
// {"t":"...","level":"info","id":"...","method":"GET","route":"/api/destinations/:idOrSlug","status":200,"ms":12,"userId":3}
// Không ghi query string, body hay header Authorization vì có thể chứa token, mật khẩu, thông tin cá nhân.
export function requestLog(request: Request, response: Response, next: NextFunction) {
  const incoming = request.get("x-request-id");
  request.requestId = incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  response.setHeader("X-Request-Id", request.requestId);

  if (!env.REQUEST_LOG || SKIP_PATHS.has(request.path)) {
    next();
    return;
  }

  const started = process.hrtime.bigint();
  response.on("finish", () => {
    const ms = Math.round(Number(process.hrtime.bigint() - started) / 1e6);
    const level = response.statusCode >= 500 ? "error" : ms >= env.SLOW_REQUEST_MS ? "warn" : "info";
    console.log(
      JSON.stringify({
        t: new Date().toISOString(),
        level,
        id: request.requestId,
        method: request.method,
        // /api/bookings/12/pay → /api/bookings/:id/pay để gom được thống kê theo API.
        route: routeKey(request),
        status: response.statusCode,
        ms,
        userId: request.user?.id,
      }),
    );
  });
  next();
}

// Bỏ query string, thay đoạn số bằng :id. Không dùng request.route vì Express đã khôi phục baseUrl khi request kết thúc.
export function routeKey(request: Request) {
  return request.originalUrl.split("?")[0].replace(/\/\d+(?=\/|$)/g, "/:id");
}
