# Cài đặt và triển khai

## 1. Chạy ở máy cá nhân (dev)

Yêu cầu: Node.js ≥ 20.19 (dự án dùng 24), MariaDB 11 (hoặc Docker), Git. Android Studio nếu chạy emulator.

```bash
# Backend
cd be
npm install
cp .env.example .env          # sửa DATABASE_URL, JWT_SECRET
npm run db:deploy             # tạo bảng
npm run db:seed               # dữ liệu demo
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
| `JWT_EXPIRES_IN` | | `7d` | Thời hạn token |
| `CORS_ORIGINS` | | `*` | Production: domain web build, phân tách bằng dấu phẩy |
| `BOOKING_TAX_RATE` | | `0.08` | Thuế/phí trên booking |
| `PAYMENT_TIMEOUT_MINUTES` | | `15` | Hạn thanh toán online |
| `TRUST_PROXY` | | `0` | `1` nếu đứng sau Nginx / Render / Railway |
| `DATABASE_CONNECTION_LIMIT` | | `5` | Số kết nối DB tối đa |
| `SEED_DEFAULT_PASSWORD` | | `Password123` | Mật khẩu tài khoản demo khi seed |

API **không khởi động** nếu thiếu biến bắt buộc hoặc sai định dạng (báo rõ biến nào sai).

## 3. Địa chỉ API cho frontend

`fe/src/config/env.ts` chọn địa chỉ theo thứ tự:

1. `EXPO_PUBLIC_API_URL` nếu có (bắt buộc cho bản build production), ví dụ `https://api.travelling.example.com/api`.
2. Khi dev bằng Expo Go: IP máy đang chạy Metro (điện thoại và máy tính phải cùng mạng Wi-Fi).
3. Android Emulator: `http://10.0.2.2:3000/api`.
4. Web / iOS Simulator: `http://localhost:3000/api`.

Bản build Android production chặn `http://` không mã hóa: API production phải dùng **HTTPS**.

## 4. Triển khai backend bằng Docker

`be/Dockerfile` build 2 giai đoạn (biên dịch TypeScript → image chạy nhỏ gọn, user không phải root, có healthcheck). Khi container khởi động sẽ tự chạy `prisma migrate deploy` rồi mới chạy API.

`docker-compose.yml` ở thư mục gốc gồm MariaDB 11.4 + API:

```bash
cp .env.example .env     # ở thư mục gốc: DB_PASSWORD, DB_ROOT_PASSWORD, JWT_SECRET, CORS_ORIGINS
docker compose up -d --build
docker compose exec api npm run db:seed     # chỉ cho môi trường demo
docker compose logs -f api
```

> **Trạng thái kiểm thử:** bản build production (`npm run build` + `node dist/server.js`) đã được chạy thử; **image Docker chưa được build thử** vì Docker Desktop chưa bật trên máy phát triển. Chạy lệnh trên một lần trước khi nộp.

Migration đã được sửa tên bảng PascalCase để chạy đúng trên MariaDB Linux (phân biệt hoa thường). Khi thêm migration mới, xem [backend.md](backend.md) mục 6.

### Gợi ý nơi triển khai

| Nơi | Backend | Database | Ghi chú |
|---|---|---|---|
| VPS (DigitalOcean, Vultr, VPS Việt Nam) | `docker compose` | Container MariaDB | Linh hoạt nhất; cần tự cài HTTPS (Caddy / Nginx + Let's Encrypt) |
| Render / Railway | Deploy từ `be/Dockerfile` | MariaDB/MySQL được quản lý hoặc container | Đặt `TRUST_PROXY=1`; có HTTPS sẵn |
| Máy cá nhân khi demo | `npm run dev` | MariaDB local | Điện thoại cùng Wi-Fi |

Chỉ chạy **một instance API** (job hủy booking quá hạn chạy trong tiến trình). Muốn nhiều instance: tách job ra cron riêng.

## 5. Build frontend

### Web

```bash
cd fe
EXPO_PUBLIC_API_URL=https://api.example.com/api npx expo export --platform web
```

Kết quả trong `fe/dist/` là web tĩnh, deploy lên Netlify, Vercel, Cloudflare Pages hoặc thư mục tĩnh của Nginx. Thêm domain web vào `CORS_ORIGINS` của backend.

### Android / iOS bằng EAS

Cần tài khoản Expo. `app.json` cần thêm `android.package` và `ios.bundleIdentifier` (ví dụ `com.travellingapp.app`) trước khi build.

```bash
cd fe
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview    # file .apk để cài thử
```

Khai báo `EXPO_PUBLIC_API_URL` trong `eas.json` cho từng profile (`development`, `preview`, `production`).

## 6. Danh sách kiểm tra trước khi nộp / demo

| Hạng mục | Đã làm |
|---|---|
| `JWT_SECRET` thật, không dùng giá trị mẫu | ☐ |
| `CORS_ORIGINS` là domain web, không phải `*` | ☐ |
| `NODE_ENV=production` | ☐ |
| API chạy HTTPS | ☐ |
| `npm test` pass, Postman collection pass | ☐ |
| `docker compose up --build` chạy được | ☐ |
| Web build mở được, gọi đúng API | ☐ |
| File `.apk` cài và chạy trên điện thoại thật | ☐ |
| Đổi mật khẩu tài khoản demo nếu public | ☐ |
