import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { authenticate, currentUser } from "../middlewares/auth.js";
import * as authService from "../services/auth.service.js";
import { changePasswordSchema, loginSchema, registerSchema, updateProfileSchema } from "../validators/auth.schema.js";

export const authRouter = Router();

// Chống dò mật khẩu: tối đa 20 lần đăng nhập/đăng ký mỗi 15 phút cho một IP.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  message: { code: "TOO_MANY_REQUESTS", message: "Bạn thử quá nhiều lần, vui lòng thử lại sau" },
});

authRouter.post("/register", credentialLimiter, async (request, response) => {
  const result = await authService.register(registerSchema.parse(request.body));
  response.status(201).json({ data: result });
});

authRouter.post("/login", credentialLimiter, async (request, response) => {
  const result = await authService.login(loginSchema.parse(request.body));
  response.json({ data: result });
});

authRouter.get("/me", authenticate, async (request, response) => {
  response.json({ data: await authService.getProfile(currentUser(request).id) });
});

authRouter.patch("/me", authenticate, async (request, response) => {
  const input = updateProfileSchema.parse(request.body);
  response.json({ data: await authService.updateProfile(currentUser(request).id, input) });
});

authRouter.patch("/me/password", authenticate, async (request, response) => {
  await authService.changePassword(currentUser(request).id, changePasswordSchema.parse(request.body));
  response.status(204).end();
});
