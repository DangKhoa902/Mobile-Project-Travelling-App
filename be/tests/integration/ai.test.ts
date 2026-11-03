import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";

// Không chạm DB: AI mặc định tắt khi test, route hội thoại bị chặn ở bước xác thực.
describe("AI API", () => {
  it("GET /api/ai/status công khai, trả enabled = false khi AI_ENABLED chưa bật", async () => {
    const response = await request(app).get("/api/ai/status");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { enabled: false } });
  });

  it("POST /api/conversations/:id/handoff yêu cầu đăng nhập", async () => {
    const response = await request(app).post("/api/conversations/1/handoff").send({ reason: "Cần gặp người" });
    expect(response.status).toBe(401);
  });
});
