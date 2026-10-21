export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string = "ERROR",
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const badRequest = (message: string, code = "BAD_REQUEST", details?: unknown) =>
  new HttpError(400, message, code, details);
export const unauthorized = (message = "Vui lòng đăng nhập") => new HttpError(401, message, "UNAUTHORIZED");
export const forbidden = (message = "Bạn không có quyền thực hiện thao tác này") =>
  new HttpError(403, message, "FORBIDDEN");
export const notFound = (resource: string) => new HttpError(404, `Không tìm thấy ${resource}`, "NOT_FOUND");
export const conflict = (message: string, code = "CONFLICT") => new HttpError(409, message, code);
