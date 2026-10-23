import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine((value) => value.startsWith("mysql://"), 'DATABASE_URL must use the "mysql://" protocol for MariaDB'),
  DATABASE_CONNECTION_LIMIT: z.coerce.number().int().min(1).default(5),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  // Danh sách origin được phép, phân tách bằng dấu phẩy. "*" cho phép tất cả (chỉ nên dùng khi dev).
  CORS_ORIGINS: z.string().default("*"),
  // Thuế/phí áp dụng trên (tạm tính - giảm giá). 0.08 = 8%.
  BOOKING_TAX_RATE: z.coerce.number().min(0).max(1).default(0.08),
  // Số phút khách phải thanh toán online sau khi đặt; quá hạn booking tự hủy và trả phòng.
  PAYMENT_TIMEOUT_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  // Số lượng proxy đứng trước app (Nginx, Render, Railway...) để đọc đúng IP client.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n");
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;

export const corsOrigins =
  env.CORS_ORIGINS.trim() === "*"
    ? "*"
    : env.CORS_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
