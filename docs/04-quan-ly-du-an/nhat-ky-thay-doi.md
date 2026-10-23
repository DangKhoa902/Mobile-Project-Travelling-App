# Nhật ký thay đổi

Ghi lại **thay đổi gì, ở lớp nào, vì sao** – để thành viên mới (và người chấm) hiểu lịch sử thiết kế mà không phải đọc từng commit. Mục mới nhất ở trên.

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
