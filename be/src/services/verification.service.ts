import { env } from "../config/env.js";
import type { VerificationTokenType } from "../generated/prisma/enums.js";
import { randomToken, sha256 } from "../lib/crypto.js";
import { badRequest } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { sendMail } from "./mail.service.js";

const TTL_MS: Record<VerificationTokenType, number> = {
  EMAIL_VERIFY: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 30 * 60 * 1000,
};

// Mỗi lần tạo mới thì token cũ cùng loại hết hiệu lực: chỉ link mới nhất dùng được.
async function createToken(userId: number, type: VerificationTokenType) {
  const token = randomToken(32);
  await prisma.$transaction([
    prisma.verificationToken.updateMany({ where: { userId, type, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.verificationToken.create({
      data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + TTL_MS[type]) },
    }),
  ]);
  return token;
}

// Dùng một lần; trả về userId nếu hợp lệ.
export async function consumeToken(token: string, type: VerificationTokenType) {
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.type !== type || record.usedAt || record.expiresAt <= new Date()) {
    throw badRequest("Link không hợp lệ hoặc đã hết hạn", "INVALID_TOKEN");
  }
  const result = await prisma.verificationToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (result.count === 0) throw badRequest("Link không hợp lệ hoặc đã hết hạn", "INVALID_TOKEN");
  return record.userId;
}

export async function sendVerificationEmail(user: { id: number; email: string; name: string }) {
  const token = await createToken(user.id, "EMAIL_VERIFY");
  const link = `${env.APP_URL}/verify-email?token=${token}`;
  await sendMail({
    to: user.email,
    subject: "Xác thực email Travelling App",
    text: `Chào ${user.name},\n\nBấm vào link sau để xác thực email (hiệu lực 24 giờ):\n${link}\n\nNếu bạn không đăng ký, hãy bỏ qua email này.`,
  });
  return token;
}

export async function sendPasswordResetEmail(user: { id: number; email: string; name: string }) {
  const token = await createToken(user.id, "PASSWORD_RESET");
  const link = `${env.APP_URL}/reset-password?token=${token}`;
  await sendMail({
    to: user.email,
    subject: "Đặt lại mật khẩu Travelling App",
    text: `Chào ${user.name},\n\nBấm vào link sau để đặt mật khẩu mới (hiệu lực 30 phút):\n${link}\n\nNếu bạn không yêu cầu, hãy bỏ qua email này; mật khẩu hiện tại vẫn giữ nguyên.`,
  });
  return token;
}
