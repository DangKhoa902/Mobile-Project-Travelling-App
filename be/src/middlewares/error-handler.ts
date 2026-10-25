import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { Prisma } from "../generated/prisma/client.js";
import { HttpError } from "../lib/http-error.js";
import { captureError } from "../lib/monitoring.js";
import { routeKey } from "./request-log.js";

export function notFoundHandler(_request: Request, response: Response) {
  response.status(404).json({ code: "ROUTE_NOT_FOUND", message: "Không tìm thấy API" });
}

export function errorHandler(error: unknown, request: Request, response: Response, _next: NextFunction) {
  if (error instanceof HttpError) {
    response.status(error.status).json({ code: error.code, message: error.message, details: error.details });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Dữ liệu không hợp lệ",
      details: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      response.status(409).json({ code: "DUPLICATE", message: "Dữ liệu đã tồn tại" });
      return;
    }
    if (error.code === "P2025") {
      response.status(404).json({ code: "NOT_FOUND", message: "Không tìm thấy dữ liệu" });
      return;
    }
    if (error.code === "P2003") {
      response.status(409).json({ code: "REFERENCE_CONFLICT", message: "Dữ liệu đang được sử dụng ở nơi khác, không thể xóa" });
      return;
    }
  }

  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === "LIMIT_FILE_SIZE";
    response.status(tooLarge ? 413 : 400).json({
      code: tooLarge ? "FILE_TOO_LARGE" : "INVALID_UPLOAD",
      message: tooLarge ? `Ảnh tối đa ${env.UPLOAD_MAX_MB} MB` : "File tải lên không hợp lệ",
    });
    return;
  }

  // JSON body sai cú pháp do express.json() ném ra.
  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    response.status(400).json({ code: "INVALID_JSON", message: "JSON không hợp lệ" });
    return;
  }

  // Lỗi không lường trước: ghi log kèm mã request và gửi Sentry (nếu bật).
  console.error(JSON.stringify({ t: new Date().toISOString(), level: "error", id: request.requestId, route: routeKey(request), error: String(error) }));
  console.error(error);
  captureError(error, { requestId: request.requestId, method: request.method, route: routeKey(request), userId: request.user?.id });
  response.status(500).json({
    code: "INTERNAL_ERROR",
    message: env.NODE_ENV === "production" ? "Lỗi hệ thống, vui lòng thử lại sau" : String(error),
    // Người dùng gửi mã này cho CSKH để tìm đúng dòng log / sự kiện Sentry.
    requestId: request.requestId,
  });
}
