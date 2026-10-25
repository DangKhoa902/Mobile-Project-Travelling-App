# Cài đặt và cấu hình

## 1. Chạy ở máy cá nhân (dev)

Yêu cầu: Node.js ≥ 20.19 (dự án dùng 24), MariaDB 11 (hoặc Docker), Git. Android Studio nếu chạy emulator.

```bash
# Backend
cd be
npm install
cp .env.example .env          # sửa DATABASE_URL, JWT_SECRET
npm run db:deploy             # tạo bảng
npm run db:seed               # dữ liệu demo
npm run db:backfill           # một lần, nếu DB có dữ liệu từ trước migration platform_extensions
npm run dev                   # http://localhost:3000
```

```bash
# Frontend
cd fe
npm install
npm run web                   # trình duyệt
npm run android               # emulator / điện thoại (Expo Go)
```

Tài khoản demo (mật khẩu `Password123`): xem [../02-thiet-ke/giao-dien.md](../02-thiet-ke/giao-dien.md) cuối trang.

## 2. Biến môi trường backend (`be/.env`)

| Biến | Bắt buộc | Mặc định | Ý nghĩa |
|---|---|---|---|
| `DATABASE_URL` | ✓ | | `mysql://user:pass@host:3306/travelling_app` (URL-encode ký tự đặc biệt trong mật khẩu) |
| `JWT_SECRET` | ✓ | | ≥ 32 ký tự ngẫu nhiên: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `NODE_ENV` | | `development` | `production` ẩn chi tiết lỗi 500 |
| `PORT` | | `3000` | |
| `JWT_EXPIRES_IN` | | `15m` | Thời hạn access token |
| `REFRESH_TOKEN_TTL_DAYS` | | `30` | Thời hạn refresh token |
| `APP_URL` | | `http://localhost:8081` | Địa chỉ giao diện web, dùng tạo link trong email |
| `EMAIL_TRANSPORT` | | `console` | `console` in email ra log (API trả kèm `devToken` khi không phải production); `smtp` gửi thật |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | khi `smtp` | | Gmail: `smtp.gmail.com`, 587, App Password; hoặc Brevo, Mailgun, SendGrid |
| `PUSH_ENABLED` | | `false` | Bật gửi push qua Expo Push API |
| `EXPO_ACCESS_TOKEN` | | | Chỉ cần nếu bật "Enhanced Push Security" trên Expo |
| `STORAGE_DRIVER` | | `local` | `local` hoặc `s3` |
| `UPLOAD_DIR`, `PUBLIC_BASE_URL`, `UPLOAD_MAX_MB` | | `uploads`, `http://localhost:3000`, `5` | Lưu local: thư mục, URL công khai của API, giới hạn MB |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` | khi `s3` | | Cloudflare R2: endpoint `https://<account>.r2.cloudflarestorage.com`, region `auto`, `S3_PUBLIC_URL` = domain public của bucket |
| `CORS_ORIGINS` | | `*` | Production: domain web build, phân tách bằng dấu phẩy |
| `BOOKING_TAX_RATE` | | `0.08` | Thuế/phí trên booking |
| `PAYMENT_TIMEOUT_MINUTES` | | `15` | Hạn thanh toán online |
| `TRUST_PROXY` | | `0` | `1` nếu đứng sau Nginx / Render / Railway |
| `DATABASE_CONNECTION_LIMIT` | | `5` | Số kết nối DB tối đa |
| `SEED_DEFAULT_PASSWORD` | | `Password123` | Mật khẩu tài khoản demo khi seed |
| `REQUEST_LOG` | | `true` | Ghi một dòng JSON cho mỗi request |
| `SLOW_REQUEST_MS` | | `1000` | Ngưỡng ghi request chậm (`level: warn`) |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`, `SENTRY_TRACES_SAMPLE_RATE` | | trống, `NODE_ENV`, trống, `0` | Gửi lỗi 500 lên Sentry; trống DSN = tắt ([giam-sat-van-hanh.md](giam-sat-van-hanh.md) mục 8) |

API **không khởi động** nếu thiếu biến bắt buộc hoặc sai định dạng (báo rõ biến nào sai). Biến khai báo nhưng để trống (`S3_ENDPOINT=`) được coi như chưa đặt.

**Production nên đặt:** `EMAIL_TRANSPORT=smtp` (nếu không, không ai nhận được email xác thực/đặt lại mật khẩu), `APP_URL` = domain web thật, `PUBLIC_BASE_URL` = domain API thật (HTTPS) hoặc `STORAGE_DRIVER=s3`.

## 3. Địa chỉ API cho frontend

`fe/src/config/env.ts` chọn địa chỉ theo thứ tự:

1. `EXPO_PUBLIC_API_URL` nếu có (bắt buộc cho bản build production), ví dụ `https://api.travelling.example.com/api`.
2. Khi dev bằng Expo Go: IP máy đang chạy Metro (điện thoại và máy tính phải cùng mạng Wi-Fi).
3. Android Emulator: `http://10.0.2.2:3000/api`.
4. Web / iOS Simulator: `http://localhost:3000/api`.

Bản build Android production chặn `http://` không mã hóa: API production phải dùng **HTTPS**.

#### 4. Chạy thử bằng Docker trên máy

`docker-compose.yml` ở thư mục gốc gồm MariaDB 11.4 + API (image từ `be/Dockerfile`: build 2 giai đoạn, user không phải root, healthcheck, tự chạy `prisma migrate deploy` khi khởi động):

```bash
cp .env.example .env     # thư mục gốc: DB_PASSWORD, DB_ROOT_PASSWORD, JWT_SECRET
docker compose up -d --build
docker compose exec api npm run db:seed
docker compose logs -f api
```

Migration đã được sửa tên bảng PascalCase để chạy đúng trên MariaDB Linux. Khi thêm migration mới, xem [backend.md](backend.md) mục 6.

## 5. Triển khai thật và vận hành

| Việc | Tài liệu |
|---|---|
| API + DB lên VPS có HTTPS, web lên domain, build file APK, sao lưu, rollback, danh sách trước khi công bố | [trien-khai-production.md](trien-khai-production.md) |
| Đo tốc độ, theo dõi lỗi, giám sát uptime, đo app Android, xử lý sự cố | [giam-sat-van-hanh.md](giam-sat-van-hanh.md) |
