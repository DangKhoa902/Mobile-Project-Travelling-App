import { type Request, Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { idParamSchema } from "../lib/pagination.js";
import { authenticate, currentUser } from "../middlewares/auth.js";
import * as authService from "../services/auth.service.js";
import * as sessionService from "../services/session.service.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  tokenSchema,
  updateProfileSchema,
} from "../validators/auth.schema.js";

export const authRouter = Router();

// Chống dò mật khẩu / spam email: tối đa 20 lần mỗi 15 phút cho một IP.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  message: { code: "TOO_MANY_REQUESTS", message: "Bạn thử quá nhiều lần, vui lòng thử lại sau" },
});

const sessionMeta = (request: Request) => ({
  userAgent: request.get("user-agent") ?? undefined,
  ip: request.ip ?? null,
});

authRouter.post("/register", credentialLimiter, async (request, response) => {
  const result = await authService.register(registerSchema.parse(request.body), sessionMeta(request));
  response.status(201).json({ data: result });
});

authRouter.post("/login", credentialLimiter, async (request, response) => {
  const result = await authService.login(loginSchema.parse(request.body), sessionMeta(request));
  response.json({ data: result });
});

// Đổi refresh token lấy cặp token mới (access token hết hạn sau JWT_EXPIRES_IN, mặc định 15 phút).
authRouter.post("/refresh", async (request, response) => {
  const { refreshToken, deviceName } = refreshSchema.parse(request.body);
  response.json({ data: await sessionService.refreshSession(refreshToken, { ...sessionMeta(request), deviceName }) });
});

authRouter.post("/logout", async (request, response) => {
  const { refreshToken } = refreshSchema.pick({ refreshToken: true }).parse(request.body);
  await sessionService.revokeSessionByToken(refreshToken);
  response.status(204).end();
});

authRouter.post("/logout-all", authenticate, async (request, response) => {
  await sessionService.revokeAllSessions(currentUser(request).id);
  response.status(204).end();
});

authRouter.get("/sessions", authenticate, async (request, response) => {
  response.json({ data: await sessionService.listSessions(currentUser(request).id) });
});

authRouter.delete("/sessions/:id", authenticate, async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  await sessionService.revokeSession(currentUser(request).id, id);
  response.status(204).end();
});

authRouter.post("/verify-email", async (request, response) => {
  const { token } = tokenSchema.parse(request.body);
  response.json({ data: await authService.verifyEmail(token) });
});

authRouter.post("/resend-verification", credentialLimiter, authenticate, async (request, response) => {
  response.json({ data: await authService.resendVerification(currentUser(request).id) });
});

authRouter.post("/forgot-password", credentialLimiter, async (request, response) => {
  const { email } = forgotPasswordSchema.parse(request.body);
  response.json({ data: await authService.forgotPassword(email) });
});

authRouter.post("/reset-password", credentialLimiter, async (request, response) => {
  await authService.resetPassword(resetPasswordSchema.parse(request.body));
  response.status(204).end();
});

authRouter.get("/me", authenticate, async (request, response) => {
  response.json({ data: await authService.getProfile(currentUser(request).id) });
});

authRouter.patch("/me", authenticate, async (request, response) => {
  const input = updateProfileSchema.parse(request.body);
  response.json({ data: await authService.updateProfile(currentUser(request).id, input) });
});

// Trả phiên mới vì mọi phiên cũ (kể cả thiết bị này) đã bị thu hồi.
authRouter.patch("/me/password", authenticate, async (request, response) => {
  const input = changePasswordSchema.parse(request.body);
  response.json({ data: await authService.changePassword(currentUser(request).id, input, sessionMeta(request)) });
});
