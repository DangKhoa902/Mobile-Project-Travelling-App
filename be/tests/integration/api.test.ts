import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";

// Các case dưới đây bị chặn trước khi chạm DB nên chạy được cả khi không có MariaDB.
describe("API guards", () => {
  it("GET / trả trạng thái API", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("route không tồn tại trả 404 JSON", async () => {
    const response = await request(app).get("/api/khong-ton-tai");
    expect(response.status).toBe(404);
    expect(response.body.code).toBe("ROUTE_NOT_FOUND");
  });

  it("đăng nhập với body sai trả 400 và chi tiết lỗi", async () => {
    const response = await request(app).post("/api/auth/login").send({ email: "not-an-email" });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(response.body.details.map((issue: { path: string }) => issue.path)).toEqual(
      expect.arrayContaining(["email", "password"]),
    );
  });

  it("JSON sai cú pháp trả 400", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email":');
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_JSON");
  });

  it.each(["/api/bookings", "/api/favorites", "/api/notifications", "/api/users", "/api/auth/me", "/api/partners/me", "/api/manage/destinations", "/api/stats/overview", "/api/payouts", "/api/audit-logs", "/api/devices", "/api/auth/sessions"])(
    "%s yêu cầu đăng nhập",
    async (path) => {
      const response = await request(app).get(path);
      expect(response.status).toBe(401);
    },
  );

  it("đăng ký thiếu đồng ý điều khoản trả 400", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ name: "Khách", email: "a@example.com", password: "Secret123" });
    expect(response.status).toBe(400);
    expect(response.body.details.map((issue: { path: string }) => issue.path)).toContain("acceptTerms");
  });

  it("tải ảnh khi chưa đăng nhập trả 401", async () => {
    const response = await request(app).post("/api/uploads").attach("file", Buffer.from([0xff, 0xd8, 0xff]), "a.jpg");
    expect(response.status).toBe(401);
  });

  it("refresh token sai định dạng trả 400", async () => {
    const response = await request(app).post("/api/auth/refresh").send({ refreshToken: "ngan" });
    expect(response.status).toBe(400);
  });

  it("token giả bị từ chối", async () => {
    const response = await request(app).get("/api/bookings").set("Authorization", "Bearer abc.def.ghi");
    expect(response.status).toBe(401);
  });

  it("báo giá với ngày sai định dạng trả 400", async () => {
    const response = await request(app)
      .post("/api/bookings/quote")
      .send({ packageId: 1, roomTypeId: 1, checkInDate: "01/12/2026", checkOutDate: "2026-12-03", guests: 2, roomsCount: 1 });
    expect(response.status).toBe(400);
  });
});

describe("Mã request (X-Request-Id)", () => {
  it("mọi response có X-Request-Id", async () => {
    const response = await request(app).get("/api/khong-ton-tai");
    expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("giữ mã hợp lệ do proxy / client gửi lên", async () => {
    const response = await request(app).get("/").set("X-Request-Id", "caddy-abc12345");
    expect(response.headers["x-request-id"]).toBe("caddy-abc12345");
  });

  it("thay mã chứa ký tự lạ bằng mã mới", async () => {
    const response = await request(app).get("/").set("X-Request-Id", 'bad id <INJECT> "x"');
    expect(response.headers["x-request-id"]).not.toContain("INJECT");
  });
});
