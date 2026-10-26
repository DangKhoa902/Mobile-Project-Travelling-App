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
  // Access token ngắn hạn; app dùng refresh token để lấy access token mới.
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  // Địa chỉ giao diện web, dùng để tạo link trong email (xác thực, đặt lại mật khẩu).
  APP_URL: z.string().url().default("http://localhost:8081"),
  // Client ID OAuth của Google (web, Android, iOS), phân tách bằng dấu phẩy. Trống = tắt đăng nhập Google.
  GOOGLE_CLIENT_IDS: z.string().optional(),
  // console: in email ra log (dev); smtp: gửi thật qua SMTP_*.
  EMAIL_TRANSPORT: z.enum(["console", "smtp"]).default("console"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default("Travelling App <no-reply@travelling.app>"),
  // Bật gửi push qua Expo Push API (cần mạng ra ngoài). Tắt khi dev để không gọi dịch vụ ngoài.
  PUSH_ENABLED: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  EXPO_ACCESS_TOKEN: z.string().optional(),
  // local: lưu file trong UPLOAD_DIR và phục vụ ở /uploads; s3: S3/Cloudflare R2/MinIO.
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  UPLOAD_DIR: z.string().default("uploads"),
  // URL công khai của API, dùng để tạo link ảnh khi lưu local.
  PUBLIC_BASE_URL: z.string().url().default("http://localhost:3000"),
  UPLOAD_MAX_MB: z.coerce.number().min(1).max(20).default(5),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  // Domain công khai của bucket, ví dụ https://cdn.example.com
  S3_PUBLIC_URL: z.string().url().optional(),
  // Danh sách origin được phép, phân tách bằng dấu phẩy. "*" cho phép tất cả (chỉ nên dùng khi dev).
  CORS_ORIGINS: z.string().default("*"),
  // Thuế/phí áp dụng trên (tạm tính - giảm giá). 0.08 = 8%.
  BOOKING_TAX_RATE: z.coerce.number().min(0).max(1).default(0.08),
  // Số phút khách phải thanh toán online sau khi đặt; quá hạn booking tự hủy và trả phòng.
  PAYMENT_TIMEOUT_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  // Ghi một dòng JSON cho mỗi request (route, status, thời gian xử lý). Tắt khi chạy test.
  REQUEST_LOG: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  // Request chậm hơn ngưỡng này được ghi level "warn".
  SLOW_REQUEST_MS: z.coerce.number().int().min(1).default(1000),
  // Sentry: để trống SENTRY_DSN = không gửi lỗi ra ngoài.
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  // Nên đặt bằng tag phát hành, ví dụ v1.1.0, để biết lỗi thuộc bản nào.
  SENTRY_RELEASE: z.string().optional(),
  // 0 = chỉ thu lỗi; 0.1 = thêm đo hiệu năng cho 10% request.
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
  // Số lượng proxy đứng trước app (Nginx, Render, Railway...) để đọc đúng IP client.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

// Biến khai báo nhưng để trống (S3_ENDPOINT=) được coi như chưa đặt.
const rawEnv = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ""));
const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n");
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;

if (env.EMAIL_TRANSPORT === "smtp" && !env.SMTP_HOST) {
  throw new Error("Invalid environment variables:\n  - SMTP_HOST: required when EMAIL_TRANSPORT=smtp");
}
if (env.STORAGE_DRIVER === "s3" && (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY || !env.S3_PUBLIC_URL)) {
  throw new Error(
    "Invalid environment variables:\n  - S3_*: S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_URL are required when STORAGE_DRIVER=s3",
  );
}

export const corsOrigins =
  env.CORS_ORIGINS.trim() === "*"
    ? "*"
    : env.CORS_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
