# 🌍 Travelling App

Sàn môi giới dịch vụ du lịch đa nền tảng (Android, iOS, Web). Chủ địa điểm đăng resort, khách sạn, homestay, tour; khách du lịch tìm kiếm, đặt chỗ, thanh toán và đánh giá; sàn kiểm duyệt nội dung và thu hoa hồng trên mỗi booking.

> Đồ án môn **Lập trình thiết bị di động**. Backend đã hoàn thiện nghiệp vụ và kiểm thử; giao diện đang phát triển.

## Chức năng chính

| Actor | Chức năng |
|---|---|
| Khách vãng lai | Khám phá, tìm kiếm, lọc, xem chi tiết, xem báo giá |
| Khách hàng | Yêu thích, đặt chỗ, thanh toán giả lập, hủy theo chính sách, đánh giá, chat CSKH, thông báo, đăng ký làm đối tác |
| Chủ địa điểm | Đăng và quản lý địa điểm, gói, phòng, giá theo mùa; gửi duyệt; xác nhận booking; dashboard doanh thu; xem đối soát |
| Nhân viên CSKH | Xử lý booking, kiểm duyệt đánh giá, trả lời chat |
| Quản trị viên | Duyệt đối tác và tin đăng, hoa hồng, đối soát chuyển tiền, danh mục, voucher, người dùng, nhật ký, dashboard toàn sàn |

## Công nghệ

| Phần | Công nghệ |
|---|---|
| Frontend | React Native, Expo, Expo Router, TypeScript, NativeWind, Axios, TanStack Query, Zustand |
| Backend | Node.js, Express 5, TypeScript, Prisma 7, MariaDB, Zod, JWT, bcrypt |
| Kiểm thử | Vitest, Supertest, Postman CLI |
| Triển khai | Docker, docker-compose, Expo EAS |

## Cấu trúc thư mục

```text
Mobile-Project-Travelling-App/
├── fe/                    Frontend Expo (Android, iOS, Web)
├── be/                    Backend REST API
├── docs/                  Tài liệu dự án – bắt đầu từ docs/README.md
├── docker-compose.yml     MariaDB + API
└── .env.example           Biến môi trường cho docker-compose
```

## Chạy nhanh

```bash
cd be
npm install
cp .env.example .env       # sửa DATABASE_URL và JWT_SECRET
npm run db:deploy
npm run db:seed
npm run dev                # http://localhost:3000
```

```bash
cd fe
npm install
npm run web                # hoặc: npm run android
```

Tài khoản demo (mật khẩu `Password123`): `user@travelling.app`, `owner1@travelling.app`, `staff@travelling.app`, `admin@travelling.app`.

Chi tiết cài đặt, biến môi trường, Docker và build: [docs/03-trien-khai/deploy.md](docs/03-trien-khai/deploy.md).

## Kiểm thử

```bash
cd be
npm test                                                           # 46 unit + integration test
postman collection run postman/travelling-app.postman_collection.json   # 196 request end-to-end (cần API đang chạy)
```

## Tài liệu

| Nội dung | Link |
|---|---|
| Mục lục tài liệu | [docs/README.md](docs/README.md) |
| Đặc tả hệ thống | [docs/01-dac-ta/tong-quan.md](docs/01-dac-ta/tong-quan.md) |
| Cơ sở dữ liệu | [docs/02-thiet-ke/co-so-du-lieu.md](docs/02-thiet-ke/co-so-du-lieu.md) |
| API | [docs/02-thiet-ke/api.md](docs/02-thiet-ke/api.md) |
| Giao diện | [docs/02-thiet-ke/giao-dien.md](docs/02-thiet-ke/giao-dien.md) |
| Web + Mobile | [docs/03-trien-khai/frontend-web-mobile.md](docs/03-trien-khai/frontend-web-mobile.md) |
| Lộ trình | [docs/04-quan-ly-du-an/lo-trinh.md](docs/04-quan-ly-du-an/lo-trinh.md) |
| Quy trình Git | [docs/04-quan-ly-du-an/git.md](docs/04-quan-ly-du-an/git.md) |
