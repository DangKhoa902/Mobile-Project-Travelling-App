import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      REQUEST_LOG: "false",
      JWT_SECRET: "test-secret-that-is-long-enough-for-validation",
      // Các test hiện tại không truy vấn DB; giá trị này chỉ để qua bước kiểm tra env.
      DATABASE_URL: process.env.DATABASE_URL ?? "mysql://test:test@localhost:3306/travelling_app_test",
    },
  },
});
