import { Router } from "express";
import rateLimit, { type Options } from "express-rate-limit";
import { env } from "../config/env.js";
import { optionalAuth } from "../middlewares/auth.js";
import { aiDisabled, askAssistant, assistantSchema } from "../services/ai-assistant.service.js";

// API Trợ lý AI (docs/02-thiet-ke/ai-cskh.md mục 5.2).
export const aiRouter = Router();

// Trợ lý công khai gọi Gemini (tốn hạn mức): tối đa AI_PUBLIC_RATE_LIMIT lượt mỗi 10 phút cho một IP.
// Tách hàm tạo để test được giới hạn (limiter thật bỏ qua khi NODE_ENV=test như các limiter khác).
export function createAssistantLimiter(overrides: Partial<Options> = {}) {
  return rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: env.AI_PUBLIC_RATE_LIMIT,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => env.NODE_ENV === "test",
    message: { code: "TOO_MANY_REQUESTS", message: "Bạn hỏi trợ lý quá nhiều lần, vui lòng thử lại sau ít phút" },
    ...overrides,
  });
}

// Công khai: giao diện ẩn các nút AI khi tắt.
aiRouter.get("/status", (_request, response) => {
  response.json({ data: { enabled: env.AI_ENABLED } });
});

// Trợ lý tư vấn du lịch (giai đoạn 2). Body { messages: [{ role: "user" | "model", text }] }, không lưu DB.
aiRouter.post("/assistant", createAssistantLimiter(), optionalAuth, async (request, response) => {
  const input = assistantSchema.parse(request.body);
  if (!env.AI_ENABLED) throw aiDisabled();
  response.json({ data: await askAssistant(input, { userId: request.user?.id ?? null }) });
});
