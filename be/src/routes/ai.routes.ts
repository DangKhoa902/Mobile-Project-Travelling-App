import { Router } from "express";
import { env } from "../config/env.js";

// API Trợ lý AI (docs/02-thiet-ke/ai-cskh.md mục 5.2). Giai đoạn 1 chỉ có trạng thái bật/tắt.
export const aiRouter = Router();

// Công khai: giao diện ẩn các nút AI khi tắt.
aiRouter.get("/status", (_request, response) => {
  response.json({ data: { enabled: env.AI_ENABLED } });
});
