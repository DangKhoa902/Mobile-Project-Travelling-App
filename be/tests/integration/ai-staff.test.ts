import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";

// Không chạm DB: bị chặn ở bước xác thực.
describe("AI cho nhân viên CSKH", () => {
  it("POST /api/conversations/:id/ai/suggest yêu cầu đăng nhập", async () => {
    expect((await request(app).post("/api/conversations/1/ai/suggest")).status).toBe(401);
  });
  it("POST /api/conversations/:id/ai/summary yêu cầu đăng nhập", async () => {
    expect((await request(app).post("/api/conversations/1/ai/summary")).status).toBe(401);
  });
});
