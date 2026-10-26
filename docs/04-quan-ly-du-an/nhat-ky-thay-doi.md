# Nhật ký thay đổi

Ghi lại **thay đổi gì, ở lớp nào, vì sao** – để thành viên mới (và người chấm) hiểu lịch sử thiết kế mà không phải đọc từng commit. Mục mới nhất ở trên.

---

## 26/10/2026 – Đăng nhập / đăng ký bằng Google

| Lớp | Thay đổi |
|---|---|
| Database | Migration `20261026090000_google_sign_in`: cột `User.googleId` (unique) |
| Backend | `POST /api/auth/google` (`lib/google.ts` xác minh ID token bằng `google-auth-library`, `planGoogleSignIn` quyết định đăng nhập / liên kết / tạo mới); biến `GOOGLE_CLIENT_IDS`; 7 test mới (58 tổng) |
| Frontend | `components/auth/google-button.tsx` (`expo-auth-session`), nút ở A1 và A2, tự ẩn khi chưa có client ID hoặc chạy Expo Go; `loginWithGoogle` trong `auth-store` |
| Khác | Bỏ khung tài khoản demo ở màn đăng nhập; thêm lề cho nút trên ảnh ở D2 |
| Tài liệu | [dang-nhap-google.md](../03-trien-khai/dang-nhap-google.md) (tạo client ID, cấu hình, giới hạn), [api.md](../02-thiet-ke/api.md) |

Kiểm chứng: `npm test` 58/58, `tsc` + `expo lint` sạch, nút hiển thị đúng trên web 375px. **Chưa đăng nhập thử bằng tài khoản Google thật** (cần client ID của nhóm).

---

## 25/10/2026 – Frontend đầy đủ (Web + Mobile)

| Phần | Thay đổi |
|---|---|
| Route | `(tabs)` 5 tab; `(auth)` A1–A5; `search`, `destinations/[slug]` (+ `reviews`); `booking/` B1–B5; `bookings/[id]`; `reviews/new`; `conversations/`; `profile/` P1–P5; `owner/` O1–O8; `admin/` M1–M15; `+not-found` |
| Nền | Kiểu dữ liệu theo response thật; Axios + làm mới token một lần + cổng chờ khôi phục phiên; lưu cặp token (SecureStore / localStorage); nháp đặt chỗ, toast (Zustand) |
| Component | Bộ `ui/`, khung quản lý (sidebar, bảng), trình soạn tin đăng dùng chung chủ – admin, chi tiết booking dùng chung khách – chủ – staff, chat poll 5 giây, biểu đồ tự vẽ |
| Cấu hình | `app.json` có `android.package` / `ios.bundleIdentifier`, `web.output: "single"`; Tailwind breakpoint `md`/`lg`, `darkMode: "class"`; thêm 4 thư viện Expo; bỏ file mẫu của template |
| Tài liệu | README gốc viết lại phần chạy project; `fe/README.md`; [yeu-cau-frontend.md](../03-trien-khai/yeu-cau-frontend.md) mục 2; [lo-trinh.md](lo-trinh.md) |

Kiểm chứng: `tsc`, `expo lint` sạch; `expo export` web + Android build được; chạy thử trên web: đăng nhập, đặt chỗ có voucher, thanh toán giả lập, chi tiết booking, dashboard chủ / admin, các trang quản trị; chủ tạo tin → thêm phòng, gói → gửi duyệt → admin duyệt → khách tìm "hoi an" ra tin; đăng ký (lỗi dưới ô, tự đăng nhập); chat CSKH nhận tin mới qua poll. Chạy trên Android Emulator: luồng đặt chỗ → thanh toán, tải ảnh, khu chủ; sửa 5 lỗi chỉ có trên Android (bàn phím che ô nhập, nền hộp thoại hở thanh trạng thái, nội dung bị thanh cử chỉ đè, chữ "Ví điện tử" bị cắt, màu link). Lỗi tìm ra khi chạy thử và đã sửa: B4 trắng sau khi xóa nháp, gọi `/auth/refresh` hai lần khi tải lại trang, trang trắng do `target!.x` với React Compiler. Chưa thử trên điện thoại thật và push.

Giao diện thanh đáy đặt chỗ (D2, B1–B4): giá / tạm tính ở hàng trên, nút rộng hết thanh và căn giữa; nút ở B4 đổi từ "Xác nhận đặt" thành "Đặt ngay".

---

## 25/10/2026 – Log request và Sentry cho backend

| Lớp | File | Thay đổi |
|---|---|---|
| Middleware mới | `middlewares/request-log.ts` | `X-Request-Id` (giữ mã an toàn từ proxy, không thì sinh UUID); một dòng JSON mỗi request: route chuẩn hóa `:id`, status, ms, userId; `warn` khi chậm; bỏ qua `/health`; không ghi query/body/token |
| Thư viện mới | `lib/monitoring.ts` | `initMonitoring`, `captureError`, `flushMonitoring` bọc `@sentry/node` 11; tắt khi không có `SENTRY_DSN`; không gửi cookie, body, query, Authorization |
| Hạ tầng | `app.ts`, `server.ts`, `error-handler.ts` | Gắn middleware đầu tiên; lỗi 500 ghi log có mã request, gửi Sentry, trả `requestId`; job nền gửi Sentry; flush khi tắt |
| Config | `config/env.ts`, `.env.example`, `docker-compose.yml`, `vitest.config.ts` | `REQUEST_LOG`, `SLOW_REQUEST_MS`, `SENTRY_*`; test tắt log request |
| Test | `tests/` | 5 test mới (51 tổng): header mã request, giữ / thay mã, chuẩn hóa route |

Kiểm chứng: `npm test` 51/51; chạy API xem dòng log thật; bản build production ghi log đúng; Sentry gửi đúng nội dung tới máy nhận giả lập local (chưa gửi lên sentry.io thật).

---

## 25/10/2026 – Tài liệu frontend, triển khai thật và giám sát

| Tài liệu | Nội dung |
|---|---|
| `03-trien-khai/yeu-cau-frontend.md` | Bàn giao để làm FE ở phiên mới: hiện trạng `fe/`, quy ước, kiến trúc, refresh token, 27 yêu cầu chức năng, Sprint 0, bẫy đã biết |
| `03-trien-khai/trien-khai-production.md` | VPS + Docker Compose + Caddy (HTTPS), web SPA, build APK bằng EAS hoặc Gradle, push qua FCM, sao lưu / khôi phục, rollback, checklist công bố |
| `03-trien-khai/giam-sat-van-hanh.md` | Chỉ tiêu mục tiêu, uptime, log, đo tải (số liệu nền: ~408 req/s, p99 120 ms với 20 kết nối trên máy dev), MariaDB, Lighthouse, đo APK bằng adb, Sentry, xử lý sự cố |
| `03-trien-khai/deploy.md` | Rút gọn còn cài đặt máy dev, biến môi trường, Docker trên máy |

Chưa chạy thử: image Docker, Caddy, build web, build APK (Docker Desktop tắt, chưa có tài khoản Expo của nhóm).

---

## 25/10/2026 – Mở rộng nền tảng (8 mục đề xuất của cơ sở dữ liệu)

### Yêu cầu

Triển khai mục 1, 2, 6, 7, 8, 9, 10, 11 trong "Đề xuất mở rộng" của `co-so-du-lieu.md`: đối soát cho chủ địa điểm, giá theo mùa, refresh token, quên mật khẩu / xác thực email, push notification, nhật ký quản trị, tìm kiếm không dấu, ảnh tải lên.

### Thay đổi theo lớp

| Lớp | File | Thay đổi |
|---|---|---|
| Database | `schema.prisma`, migration `20261025090000_platform_extensions` | 8 bảng mới: `RefreshToken`, `VerificationToken`, `DeviceToken`, `AuditLog`, `Payout`, `Upload`, `RoomRate`, `ReviewImage`; 3 enum mới; cột `User.emailVerifiedAt`, `Destination.searchText`, `Booking.payoutId`, `Notification.pushedAt`. Tài khoản có sẵn coi là đã xác thực; thông báo cũ không gửi push |
| Config | `config/env.ts`, `.env.example`, `docker-compose.yml`, `Dockerfile` | Biến cho refresh token, email, push, lưu file; `JWT_EXPIRES_IN` mặc định 15m; biến để trống = chưa đặt; volume `uploads` |
| Thư viện | `lib/crypto.ts`, `lib/search-text.ts`, `lib/destination-search.ts`, `lib/storage.ts` | Token ngẫu nhiên + SHA-256; bỏ dấu; lưu ảnh local/S3 + nhận dạng chữ ký file |
| Hàm thuần | `services/pricing.ts` | `nightlyRoomPrices`; `calculateBookingPrice` nhận giá từng đêm |
| Service mới | `session.service.ts`, `verification.service.ts`, `mail.service.ts`, `push.service.ts`, `payout.service.ts`, `audit.service.ts` | Phiên + xoay vòng; link email; gửi mail; outbox push; đối soát; nhật ký |
| Service | `auth.service.ts` | Đăng ký gửi email xác thực; đăng nhập trả phiên; đổi mật khẩu thu hồi phiên; xác thực email; quên / đặt lại mật khẩu |
| Service | `booking.service.ts` | Báo giá áp giá mùa, trả `nightlyRoomPrices`; nhật ký khi chủ/staff xử lý booking |
| Service | `destination.service.ts`, `review.service.ts`, `stats.service.ts` | `searchText`; nhật ký duyệt tin / đánh giá; ảnh đánh giá; dashboard chủ có `payouts` |
| Route mới | `payout.routes.ts`, `audit.routes.ts`, `device.routes.ts`, `upload.routes.ts` | `/api/payouts`, `/api/audit-logs`, `/api/devices`, `/api/uploads` + phục vụ `/uploads` |
| Route | `auth.routes.ts` | `/refresh`, `/logout`, `/logout-all`, `/sessions`, `/verify-email`, `/resend-verification`, `/forgot-password`, `/reset-password` |
| Route | `catalog.routes.ts` | CRUD giá mùa `/room-types/:id/rates`; nhật ký đổi giá gói/phòng, voucher; đổi tên danh mục cập nhật `searchText` |
| Route | `user.routes.ts`, `partner.routes.ts`, `review.routes.ts`, `destination.routes.ts` | Nhật ký; khóa tài khoản thu hồi phiên; nộp hồ sơ đối tác cần email đã xác thực; `imageUrls` cho đánh giá |
| Hạ tầng | `app.ts`, `server.ts`, `middlewares/error-handler.ts` | Mount router; helmet cho phép ảnh cross-origin; job push 15 giây; lỗi upload (413) |
| DAO | `destination.dao.ts`, `user.dao.ts` | Tìm theo `searchText`; chi tiết kèm `rates`, ảnh đánh giá; `emailVerifiedAt` |
| Seed | `prisma/seed.ts`, `prisma/backfill-search.ts` | Tài khoản demo đã xác thực; giá Tết và 30/4 cho phòng Deluxe Đà Lạt; tính `searchText` |
| Test | `tests/unit/extensions.test.ts`, `tests/integration/api.test.ts` | 14 test mới (46 tổng) |
| Postman | `postman/` | Thư mục 13–20 (60 request), file ảnh mẫu `fixtures/` |

### Quyết định thiết kế

| Quyết định | Lý do |
|---|---|
| Access token 15 phút + refresh token xoay vòng, phát hiện dùng lại | Lộ access token chỉ dùng được ít phút; lộ refresh token bị phát hiện khi chủ thật làm mới |
| Cửa sổ 30 giây trước khi coi là dùng lại | App mở lại thường gửi nhiều request cùng lúc; không đăng xuất nhầm người dùng thật |
| Chỉ lưu SHA-256 của token | Lộ DB không lộ phiên |
| Chỉ chặn nộp hồ sơ đối tác khi chưa xác thực email | Không thêm bước cho khách đặt chỗ; đối tác nhận tiền nên cần chắc chắn email |
| `EMAIL_TRANSPORT=console` + `devToken` khi không phải production | Chạy thử và kiểm thử tự động không cần hộp thư thật |
| Push qua outbox `Notification.pushedAt` | Lỗi mạng tới Expo không làm hỏng giao dịch; gửi lại được |
| Đối soát lập theo kỳ, admin chuyển khoản thủ công | Đồ án không tích hợp ngân hàng; vẫn có số liệu, trạng thái, mã giao dịch, thông báo |
| Giá mùa theo khoảng ngày, không chồng nhau | Mỗi đêm có đúng một giá; chủ nhập ít dòng |
| `searchText` + `LIKE` thay vì FULLTEXT | FULLTEXT bỏ từ ngắn hơn 3 ký tự, không hợp tiếng Việt |
| Kho file thay được (local / S3) | Dev không cần cloud; deploy nhiều instance chuyển sang R2/S3 không đổi code |

### Kiểm chứng

- `npm run typecheck` sạch; `npm test` 46/46.
- Postman lần đầu sau seed: 196 request, 299 assertion; lỗi duy nhất ở script test URL ảnh (`//uploads`), đã sửa; lần chạy lại 187 request / 283 assertion, 0 lỗi (đối soát tự bỏ qua vì đã đối soát).
- Chưa kiểm thử với SMTP thật, Expo Push thật, S3/R2 thật.

---

## 24/10/2026 – Mô hình môi giới, dashboard, thanh toán giả lập có hạn

### Yêu cầu

1. Thiết kế UI cho cả Web và Mobile: cần hướng dẫn cách triển khai.
2. Giả lập thanh toán: chỉnh lại đặc tả.
3. Đăng ký: ghi rõ trường bắt buộc / tùy chọn.
4. Sàn là **bên môi giới**, cần actor **chủ địa điểm** tự đăng địa điểm.
5. Thống kê, dashboard cho Admin.

### Thay đổi theo lớp

| Lớp | File | Thay đổi |
|---|---|---|
| Database | `prisma/schema.prisma`, migration `20261024090000_partner_owner_dashboard` | Role `OWNER`; enum `PartnerStatus`, `ListingStatus`; loại thông báo `PARTNER`; bảng `PartnerProfile`; `Destination.ownerId`, `listingStatus`, `listingRejectReason`, `submittedAt`, `approvedAt`; `Booking.commissionRate`, `commissionAmount`, `ownerRevenue`, `paymentDueAt`; `Payment.channel`; 5 index mới |
| Config | `src/config/env.ts`, `.env.example` | `PAYMENT_TIMEOUT_MINUTES` (mặc định 15) |
| Hàm thuần | `src/services/pricing.ts` | `calculateCommission` |
| Service mới | `src/services/access.service.ts` | `assertCanManageDestination` (quyền sở hữu), `commissionRateFor`, `isOwner` |
| Service mới | `src/services/stats.service.ts` | `getOverview`: số liệu theo vai trò, doanh thu theo ngày (SQL), top địa điểm, việc cần xử lý |
| Service | `src/services/booking.service.ts` | Chỉ đặt tin đã duyệt; chụp hoa hồng; `paymentDueAt`; thông báo cho chủ; phạm vi `scope` mine/managed; chủ xử lý booking cơ sở mình; hủy bởi chủ/staff bắt buộc lý do; `payBooking` nhận `channel`, chặn quá hạn; `expireOverdueBookings` |
| Service | `src/services/destination.service.ts` | Tạo/sửa theo vai trò (chủ → nháp, không đặt nổi bật); `submitListing`, `reviewListing` |
| Service | `src/services/notification.service.ts` | `notifyRoles` gửi cho mọi admin |
| DAO | `src/dao/booking.dao.ts` | Booking quá hạn thanh toán không còn giữ phòng; trả `destination.ownerId` |
| DAO | `src/dao/destination.dao.ts` | Công khai chỉ tin `APPROVED`; `findForManagement` lấy cả mục đang tắt |
| Route mới | `src/routes/partner.routes.ts` | `/api/partners`: nộp hồ sơ, duyệt, tạm ngưng, hoa hồng |
| Route mới | `src/routes/manage.routes.ts` | `/api/manage/destinations`: trang quản lý tin của chủ / admin |
| Route mới | `src/routes/stats.routes.ts` | `/api/stats/overview` |
| Route | `src/routes/destination.routes.ts` | OWNER tạo/sửa/xóa tin của mình; `POST /:id/submit`, `PATCH /:id/review`; xem trước tin chưa duyệt |
| Route | `src/routes/catalog.routes.ts` | Gói, phòng, dịch vụ: OWNER quản lý của mình |
| Route | `src/routes/booking.routes.ts` | `PATCH /:id/status` cho OWNER; `/pay` nhận `channel` |
| Route | `src/routes/user.routes.ts` | Lọc role OWNER; chặn đổi role OWNER trực tiếp |
| Validator | `src/validators/auth.schema.ts` | `acceptTerms` bắt buộc khi đăng ký |
| Validator | `src/validators/booking.schema.ts`, `destination.schema.ts` | `scope`, `channel`, `ownerId`, `reviewListingSchema`, `manageDestinationsSchema` |
| Khởi động | `src/server.ts`, `src/app.ts` | Job hủy booking quá hạn mỗi phút; mount 3 router mới |
| Seed | `prisma/seed.ts` | 2 chủ địa điểm đã duyệt + 1 hồ sơ chờ duyệt; gán địa điểm; 12 booking trong 30 ngày cho dashboard |
| Test | `tests/unit/pricing.test.ts`, `tests/integration/api.test.ts` | Hoa hồng; chặn quyền API mới; thiếu `acceptTerms` |
| Postman | `postman/travelling-app.postman_collection.json` | Thêm thư mục 10–12 (50 request) |

### Quyết định thiết kế

| Quyết định | Lý do |
|---|---|
| Chủ địa điểm = `User` có `role = OWNER` + bảng `PartnerProfile` riêng | Một người một tài khoản, vẫn đặt chỗ được như khách; thông tin doanh nghiệp không làm phình bảng `User` |
| Trở thành chủ phải qua hồ sơ được duyệt | Sàn môi giới chịu trách nhiệm với khách, cần kiểm soát ai được đăng tin |
| Tin đăng phải được duyệt; tin đã duyệt sửa nội dung không cần duyệt lại | Kiểm soát chất lượng lần đầu nhưng không chặn chủ cập nhật giá hằng ngày |
| `ownerId` cho phép NULL | Giữ địa điểm do sàn tự kinh doanh (hoa hồng 100%) và dữ liệu có sẵn |
| Hoa hồng tính trên (tạm tính − giảm giá), không tính trên thuế | Thuế là tiền thu hộ; voucher chia chi phí theo tỷ lệ cho cả hai bên |
| Chụp lại tỷ lệ hoa hồng trên booking | Đổi tỷ lệ không làm sai doanh thu đã chốt |
| Một API thống kê, phạm vi theo vai trò | Giao diện dashboard Admin và chủ dùng chung cấu trúc dữ liệu và component biểu đồ |
| Hạn thanh toán 15 phút + loại khỏi tính phòng ngay khi quá hạn | Booking bỏ dở không chặn khách khác; không phụ thuộc job chạy đúng giờ |
| Cổng giả lập không có ô nhập thẻ / OTP | Tránh giao diện giống trang thu thập thông tin thanh toán thật |
| Số điện thoại không bắt buộc khi đăng ký | Giảm bước đăng ký; vẫn bắt buộc khi đặt chỗ |

### Tài liệu

Sắp xếp lại thư mục `docs/` theo vai trò của tài liệu (đặc tả → thiết kế → triển khai → quản lý dự án → tham khảo), xem [../README.md](../README.md). Tài liệu mới: `tong-quan.md`, `tai-khoan-va-dang-ky.md`, `quy-tac-nghiep-vu.md`, `thanh-toan-gia-lap.md`, `api.md`, `frontend-web-mobile.md`, `kiem-thu.md`, `deploy.md`, file này. Viết lại `backend.md`, `lo-trinh.md`; cập nhật `luong-nghiep-vu.md`, `giao-dien.md`, `co-so-du-lieu.md`.

| Vị trí cũ | Vị trí mới |
|---|---|
| `docs/be/business-flows.md` | `docs/01-dac-ta/luong-nghiep-vu.md` |
| `docs/be/screens.md` | `docs/02-thiet-ke/giao-dien.md` |
| `docs/database/README.md` | `docs/02-thiet-ke/co-so-du-lieu.md` |
| `docs/be/README.md` | `docs/03-trien-khai/backend.md` |
| `docs/git.md` | `docs/04-quan-ly-du-an/git.md` |
| `docs/sprints/README.md` | `docs/04-quan-ly-du-an/lo-trinh.md` |
| `docs/teck.md` | `docs/tham-khao/cong-nghe.md` |
| `docs/Mô tả hệ thống.docx` | `docs/tham-khao/Mô tả hệ thống (bản gốc).docx` |
| `Mobile_Project_Full_Development_Guide.md` (gốc repo) | `docs/tham-khao/huong-dan-react-native-expo.md` |

### Kiểm chứng

- `npm run typecheck`: không lỗi. `npm test`: 32/32 pass.
- Postman: 133 request, 194 assertion, 0 lỗi.
- Script kiểm tra hết hạn thanh toán: giữ phòng → quá hạn trả phòng ngay → `PAYMENT_EXPIRED` → job hủy + thông báo.
- Chưa build thử Docker image (Docker Desktop tắt).

---

## 21/10/2026 – Backend nghiệp vụ đầy đủ

### Thay đổi chính

| Lớp | Thay đổi |
|---|---|
| Database | Từ 3 bảng lên 17 bảng theo tài liệu nghiệp vụ (migration `business_domain`); tiền lưu INT VNĐ; enum thay chuỗi trạng thái |
| Hạ tầng | `config/env.ts` kiểm tra env bằng Zod; `lib/http-error.ts`; middleware lỗi chung; helmet, CORS theo env, giới hạn body |
| Xác thực | JWT + bcrypt; đọc lại user mỗi request; rate limit đăng nhập |
| Nghiệp vụ | Báo giá, đặt chỗ chống overbooking (khóa dòng + đếm theo đêm), voucher, thanh toán giả lập, hủy theo chính sách, đánh giá sau chuyến đi + kiểm duyệt, chat CSKH, thông báo |
| Bảo mật | `GET /api/users` và `GET /api/bookings` trước đây công khai → đã yêu cầu đăng nhập và phân quyền |
| Triển khai | Dockerfile, docker-compose, `prisma migrate deploy` khi khởi động; sửa tên bảng PascalCase trong migration |
| Kiểm thử | Vitest 26 test; Postman 83 request |
| Frontend | Thêm `babel.config.js` (NativeWind trước đó không hoạt động); lớp API, store đăng nhập, kiểu dữ liệu để tham khảo |
