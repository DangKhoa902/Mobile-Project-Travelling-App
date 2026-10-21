import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "../generated/prisma/enums.js";
import { forbidden, unauthorized } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";

export type AuthUser = { id: number; role: Role; email: string; name: string };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

type TokenPayload = { sub: string; role: Role };

export function signAccessToken(user: { id: number; role: Role }): string {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: String(user.id),
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

function readBearerToken(request: Request): string | undefined {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return undefined;
  return header.slice("Bearer ".length).trim() || undefined;
}

async function resolveUser(token: string): Promise<AuthUser> {
  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch {
    throw unauthorized("Phiên đăng nhập không hợp lệ hoặc đã hết hạn");
  }

  // Đọc lại từ DB để tài khoản bị khóa hoặc đổi role có hiệu lực ngay, không đợi token hết hạn.
  const user = await prisma.user.findUnique({
    where: { id: Number(payload.sub) },
    select: { id: true, role: true, email: true, name: true, status: true },
  });
  if (!user) throw unauthorized("Phiên đăng nhập không hợp lệ hoặc đã hết hạn");
  if (user.status === "LOCKED") throw forbidden("Tài khoản đã bị khóa");

  return { id: user.id, role: user.role, email: user.email, name: user.name };
}

export async function authenticate(request: Request, _response: Response, next: NextFunction) {
  const token = readBearerToken(request);
  if (!token) throw unauthorized();
  request.user = await resolveUser(token);
  next();
}

// Dùng cho API công khai nhưng trả thêm dữ liệu cá nhân khi đã đăng nhập (ví dụ isFavorite).
export async function optionalAuth(request: Request, _response: Response, next: NextFunction) {
  const token = readBearerToken(request);
  if (token) {
    try {
      request.user = await resolveUser(token);
    } catch {
      request.user = undefined;
    }
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.user) throw unauthorized();
    if (!roles.includes(request.user.role)) throw forbidden();
    next();
  };
}

export function currentUser(request: Request): AuthUser {
  if (!request.user) throw unauthorized();
  return request.user;
}

export const isStaff = (user: AuthUser) => user.role === "STAFF" || user.role === "ADMIN";
