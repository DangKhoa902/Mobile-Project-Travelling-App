import { env } from "../config/env.js";
import type { Role } from "../generated/prisma/enums.js";
import { randomToken, sha256 } from "../lib/crypto.js";
import { forbidden, HttpError, notFound } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { signAccessToken } from "../middlewares/auth.js";

export type SessionMeta = { deviceName?: string; userAgent?: string; ip?: string | null };

const DAY_MS = 24 * 60 * 60 * 1000;
// Hai request làm mới cùng lúc (app vừa mở lại): request thua nhận 401 thay vì bị coi là đánh cắp token.
const ROTATION_GRACE_MS = 30_000;

const refreshError = (message: string, code: string) => new HttpError(401, message, code);

// Một phiên = một refresh token trên một thiết bị.
export async function issueSession(user: { id: number; role: Role }, meta: SessionMeta = {}) {
  const refreshToken = randomToken(48);
  const session = await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(refreshToken),
      deviceName: meta.deviceName?.slice(0, 100),
      userAgent: meta.userAgent?.slice(0, 255),
      ip: meta.ip ?? undefined,
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS),
    },
  });
  const accessToken = signAccessToken(user);
  return {
    accessToken,
    // Giữ tên cũ để client cũ vẫn chạy.
    token: accessToken,
    refreshToken,
    refreshTokenExpiresAt: session.expiresAt,
    sessionId: session.id,
  };
}

// Xoay vòng: token cũ bị thu hồi, trả cặp token mới. Token đã thu hồi bị dùng lại = có thể bị đánh cắp
// → thu hồi toàn bộ phiên của tài khoản đó.
export async function refreshSession(refreshToken: string, meta: SessionMeta = {}) {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(refreshToken) },
    include: { user: { select: { id: true, role: true, status: true } } },
  });
  if (!record) throw refreshError("Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại", "INVALID_REFRESH_TOKEN");

  const now = new Date();
  if (record.revokedAt) {
    if (now.getTime() - record.revokedAt.getTime() < ROTATION_GRACE_MS && record.replacedById) {
      throw refreshError("Phiên vừa được làm mới, hãy dùng token mới", "REFRESH_TOKEN_ROTATED");
    }
    await revokeAllSessions(record.userId);
    throw refreshError("Phát hiện phiên đăng nhập bất thường, vui lòng đăng nhập lại", "REFRESH_TOKEN_REUSED");
  }
  if (record.expiresAt <= now) throw refreshError("Phiên đăng nhập đã hết hạn", "REFRESH_TOKEN_EXPIRED");
  if (record.user.status === "LOCKED") throw forbidden("Tài khoản đã bị khóa");

  const next = await issueSession(record.user, {
    deviceName: meta.deviceName ?? record.deviceName ?? undefined,
    userAgent: meta.userAgent ?? record.userAgent ?? undefined,
    ip: meta.ip,
  });
  // Điều kiện revokedAt = null: chỉ một request được xoay token này.
  const result = await prisma.refreshToken.updateMany({
    where: { id: record.id, revokedAt: null },
    data: { revokedAt: now, lastUsedAt: now, replacedById: next.sessionId },
  });
  if (result.count === 0) {
    await prisma.refreshToken.update({ where: { id: next.sessionId }, data: { revokedAt: now } });
    throw refreshError("Phiên vừa được làm mới, hãy dùng token mới", "REFRESH_TOKEN_ROTATED");
  }
  return next;
}

export async function revokeSessionByToken(refreshToken: string) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function revokeAllSessions(userId: number) {
  return prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export function listSessions(userId: number) {
  return prisma.refreshToken.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, deviceName: true, userAgent: true, ip: true, createdAt: true, lastUsedAt: true, expiresAt: true },
  });
}

export async function revokeSession(userId: number, sessionId: number) {
  const result = await prisma.refreshToken.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (result.count === 0) throw notFound("phiên đăng nhập");
}
