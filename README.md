# 🌍 Travelling App

Sàn môi giới dịch vụ du lịch đa nền tảng (Android, iOS, Web). Chủ địa điểm đăng resort, khách sạn, homestay, tour; khách du lịch tìm kiếm, đặt chỗ, thanh toán và đánh giá; sàn kiểm duyệt nội dung và thu hoa hồng trên mỗi booking.

> Đồ án môn **Lập trình thiết bị di động**. Backend và frontend (một codebase Expo cho Android, iOS, Web) đã nối với nhau, chạy được trọn luồng demo.

## Chức năng chính

| Actor | Chức năng |
|---|---|
| Khách vãng lai | Khám phá, tìm kiếm không dấu, lọc, xem chi tiết, xem báo giá |
| Khách hàng | Yêu thích, đặt chỗ 4 bước, thanh toán giả lập, hủy theo chính sách, đánh giá kèm ảnh, chat CSKH, thông báo, đăng ký làm đối tác |
| Chủ địa điểm | Đăng và quản lý địa điểm, gói, phòng, giá theo mùa; gửi duyệt; xác nhận booking; dashboard doanh thu; xem đối soát |
| Nhân viên CSKH | Xử lý booking, kiểm duyệt đánh giá, trả lời chat |
| Quản trị viên | Duyệt đối tác và tin đăng, hoa hồng, đối soát chuyển tiền, danh mục, voucher, người dùng, nhật ký, dashboard toàn sàn |

## Công nghệ

| Phần | Công nghệ |
|---|---|
| Frontend | Expo SDK 57, React Native 0.86, Expo Router, TypeScript, NativeWind 4, TanStack Query, Zustand, Axios |
| Backend | Node.js 24, Express 5, TypeScript, Prisma 7, MariaDB, Zod, JWT + refresh token, bcrypt |
| Kiểm thử | Vitest, Supertest, Postman CLI |
| Triển khai | Docker, docker-compose, Caddy, Expo EAS |

## Cấu trúc thư mục

```text
Mobile-Project-Travelling-App/
├── fe/                    Frontend Expo (Android, iOS, Web)
│   └── src/
│       ├── app/           Route (Expo Router): (tabs), (auth), booking, owner, admin...
│       ├── components/    ui/, layout/, booking/, explore/, manage/, dashboard/, support/
│       ├── services/      Gọi API theo miền + hook TanStack Query
│       ├── store/         Phiên đăng nhập, nháp đặt chỗ, toast (Zustand)
│       └── types/, utils/, hooks/, config/
├── be/                    Backend REST API
├── docs/                  Tài liệu dự án – bắt đầu từ docs/README.md
├── docker-compose.yml     MariaDB + API
└── .env.example           Biến môi trường cho docker-compose
```

## Chạy project trên máy dev

### 1. Cần cài

| Công cụ | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | 24 | `node -v` |
| MariaDB | 10.6+ (khuyên dùng 11) | Hoặc dùng Docker (cách B bên dưới) |
| Trình duyệt | Chrome / Edge | Chạy bản web |
| Android | Android Studio Emulator hoặc điện thoại có **Expo Go** | Chỉ cần khi chạy mobile |

### 2. Backend – cách A: Node + MariaDB cài trên máy

```bash
cd be
npm install
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env
```

Sửa `be/.env` tối thiểu hai dòng:

```env
DATABASE_URL="mysql://<user>:<mật khẩu>@localhost:3306/travelling_app"
JWT_SECRET="<chuỗi ngẫu nhiên ≥ 32 ký tự>"
```

Tạo database trống `travelling_app` (ví dụ `CREATE DATABASE travelling_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`), rồi:

```bash
npm run db:deploy             # tạo bảng theo migration
npm run db:seed               # dữ liệu demo: địa điểm, tài khoản, booking mẫu
npm run dev                   # http://localhost:3000
```

Kiểm tra: mở <http://localhost:3000/health> phải thấy `{"status":"ok","database":"connected"}`.

### 2. Backend – cách B: Docker

```bash
cp .env.example .env          # ở thư mục gốc; đặt DB_PASSWORD, DB_ROOT_PASSWORD, JWT_SECRET
docker compose up -d --build
docker compose exec api npm run db:seed
```

API chạy ở <http://localhost:3000> giống cách A.

### 3. Frontend

```bash
cd fe
npm install
npm run web                   # mở http://localhost:8081 trên trình duyệt
```

| Chạy trên | Lệnh | Địa chỉ API app tự dùng |
|---|---|---|
| Trình duyệt | `npm run web` | `http://localhost:3000/api` |
| Android Emulator | `npm run android` (mở emulator trước) | `http://10.0.2.2:3000/api` |
| Điện thoại thật (Expo Go) | `npm start` rồi quét QR bằng Expo Go | IP máy tính chạy Metro – **điện thoại và máy tính cùng Wi-Fi**, tường lửa Windows mở cổng 3000 |
| API ở máy khác / đã deploy | Tạo `fe/.env` với `EXPO_PUBLIC_API_URL=https://api.example.com/api` rồi chạy lại với `--clear` | Theo biến này |

Đổi cấu hình (tailwind, `.env`) mà giao diện không cập nhật: `npx expo start --clear`.

### 4. Tài khoản demo

Mật khẩu chung `Password123` (tạo bởi `npm run db:seed`):

| Email | Vai trò | Thử gì |
|---|---|---|
| `user@travelling.app` | Khách hàng | Đặt chỗ, thanh toán giả lập, đánh giá, chat CSKH |
| `owner1@travelling.app` | Chủ địa điểm | `/owner`: dashboard, tin đăng, phòng + giá mùa, xử lý booking, đối soát |
| `owner2@travelling.app` | Chủ địa điểm | Chủ của Mỹ Khê, Phú Quốc |
| `partner.pending@travelling.app` | Khách hàng | Hồ sơ đối tác đang chờ duyệt |
| `staff@travelling.app` | CSKH | `/admin`: booking, kiểm duyệt đánh giá, chat |
| `admin@travelling.app` | Quản trị | `/admin`: dashboard, duyệt đối tác / tin, đối soát, voucher, nhật ký |

Mã giảm giá thử: `WELCOME10`. Email chạy chế độ `console`: link xác thực / đặt lại mật khẩu in ra log backend (khi dev, app có nút mở link luôn).

### 5. Kịch bản demo nhanh (5 phút)

1. `user@` → Khám phá → **Đà Lạt Pine Hill Resort** → Đặt ngay → chọn ngày, phòng (chọn Deluxe để thấy lịch tô màu ngày giá Tết) → thêm dịch vụ → nhập `WELCOME10` → Xác nhận → cổng giả lập → **Thanh toán**.
2. `owner1@` → `/owner/bookings` → mở booking vừa đặt (thấy hoa hồng, doanh thu của chủ).
3. `user@` → Chuyến đi → **Đã hoàn thành** (seed có sẵn một chuyến) → sửa đánh giá, thêm ảnh → `staff@` duyệt ở **Kiểm duyệt đánh giá**. Booking đã tới ngày nhận phòng thì Staff / chủ bấm được **Hoàn thành**.
4. `partner.pending@` chờ duyệt → `admin@` → **Đối tác** → Duyệt (đặt hoa hồng) → tài khoản đó đăng nhập lại có mục **Quản lý cơ sở**.

Kịch bản đầy đủ: [docs/03-trien-khai/kiem-thu.md](docs/03-trien-khai/kiem-thu.md) mục 4.

### 6. Lỗi thường gặp

| Triệu chứng | Cách xử lý |
|---|---|
| App báo "Không kết nối được máy chủ" | Backend chưa chạy hoặc sai địa chỉ: mở <http://localhost:3000/health>; điện thoại thật phải cùng Wi-Fi |
| Đăng nhập báo "thử quá nhiều lần" (429) | Giới hạn 20 lần / 15 phút / IP: khởi động lại backend |
| `npm run db:deploy` lỗi kết nối | Sai `DATABASE_URL` hoặc MariaDB chưa chạy / chưa tạo database |
| Giao diện mất style | `npx expo start --clear` |
| Push không nhận trên Expo Go Android | Đúng: cần development build hoặc APK (xem tài liệu triển khai) |

## Kiểm tra code

```bash
cd be
npm test                                                           # 51 unit + integration test
postman collection run postman/travelling-app.postman_collection.json   # 196 request end-to-end (cần API đang chạy)

cd ../fe
npx tsc --noEmit                                                   # typecheck
npx expo lint
npx expo export --platform web                                     # thử build bản web
```

## Triển khai

Biến môi trường, Docker: [docs/03-trien-khai/deploy.md](docs/03-trien-khai/deploy.md). Triển khai thật (VPS, web, APK): [docs/03-trien-khai/trien-khai-production.md](docs/03-trien-khai/trien-khai-production.md). Giám sát: [docs/03-trien-khai/giam-sat-van-hanh.md](docs/03-trien-khai/giam-sat-van-hanh.md).

## Tài liệu

| Nội dung | Link |
|---|---|
| Mục lục tài liệu | [docs/README.md](docs/README.md) |
| Đặc tả hệ thống | [docs/01-dac-ta/tong-quan.md](docs/01-dac-ta/tong-quan.md) |
| Cơ sở dữ liệu | [docs/02-thiet-ke/co-so-du-lieu.md](docs/02-thiet-ke/co-so-du-lieu.md) |
| API | [docs/02-thiet-ke/api.md](docs/02-thiet-ke/api.md) |
| Giao diện | [docs/02-thiet-ke/giao-dien.md](docs/02-thiet-ke/giao-dien.md) |
| Frontend: hiện trạng và quy ước | [docs/03-trien-khai/yeu-cau-frontend.md](docs/03-trien-khai/yeu-cau-frontend.md) |
| Web + Mobile | [docs/03-trien-khai/frontend-web-mobile.md](docs/03-trien-khai/frontend-web-mobile.md) |
| Lộ trình | [docs/04-quan-ly-du-an/lo-trinh.md](docs/04-quan-ly-du-an/lo-trinh.md) |
| Quy trình Git | [docs/04-quan-ly-du-an/git.md](docs/04-quan-ly-du-an/git.md) |
