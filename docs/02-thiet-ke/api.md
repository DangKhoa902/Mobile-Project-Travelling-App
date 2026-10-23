# Danh sách API

Base URL khi dev: `http://localhost:3000`. Mọi endpoint nghiệp vụ có tiền tố `/api`. Quy ước response, mã lỗi và xử lý token: [../01-dac-ta/luong-nghiep-vu.md](../01-dac-ta/luong-nghiep-vu.md) mục 1 và 12.

Collection Postman chạy được toàn bộ luồng: `be/postman/travelling-app.postman_collection.json` (xem [../03-trien-khai/kiem-thu.md](../03-trien-khai/kiem-thu.md)).

**Cột Quyền:** `Công khai` = không cần token · `Đăng nhập` = mọi vai trò · tên vai trò = chỉ vai trò đó. "Của mình" nghĩa là backend kiểm tra quyền sở hữu, dữ liệu của người khác trả 404/403.

## Hệ thống

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/health` | Công khai | Kiểm tra API và kết nối DB (503 nếu DB lỗi) |
| GET | `/` | Công khai | Tên và trạng thái API |

## Xác thực – `/api/auth`

| Method | Path | Quyền | Body / Query | Mô tả |
|---|---|---|---|---|
| POST | `/register` | Công khai | `name`, `email`, `password`, `acceptTerms: true`, `phone?`, `dateOfBirth?` | Đăng ký, trả `{ user, token }` |
| POST | `/login` | Công khai | `email`, `password` | Đăng nhập, trả `{ user, token }` |
| GET | `/me` | Đăng nhập | | Hồ sơ của tôi |
| PATCH | `/me` | Đăng nhập | `name?`, `phone?`, `dateOfBirth?`, `avatarUrl?` | Sửa hồ sơ |
| PATCH | `/me/password` | Đăng nhập | `currentPassword`, `newPassword` | Đổi mật khẩu (204) |

`/register` và `/login` giới hạn 20 lần / 15 phút / IP. Trường bắt buộc: [../01-dac-ta/tai-khoan-va-dang-ky.md](../01-dac-ta/tai-khoan-va-dang-ky.md).

## Khám phá – danh mục, tiện ích, địa điểm

| Method | Path | Quyền | Body / Query | Mô tả |
|---|---|---|---|---|
| GET | `/api/categories` | Công khai | | Danh mục + số địa điểm công khai |
| GET | `/api/facilities` | Công khai | | Tiện ích |
| GET | `/api/destinations` | Công khai | `q`, `categoryId`, `location`, `minPrice`, `maxPrice`, `minRating`, `facilityIds=1,2`, `featured`, `sort` (`newest`·`popular`·`rating`·`price_asc`·`price_desc`·`name`), `page`, `limit`; Staff/Admin: `includeInactive=true` | Tìm kiếm, lọc, phân trang. Chỉ tin đã duyệt và đang hoạt động |
| GET | `/api/destinations/:idOrSlug` | Công khai (token tùy chọn) | | Chi tiết + `latestReviews` + `isFavorite`. Tin chưa duyệt: chỉ chủ và Staff/Admin xem |
| GET | `/api/destinations/:id/reviews` | Công khai | `page`, `limit` | Đánh giá đã duyệt |
| GET | `/api/destinations/:id/availability` | Công khai | `roomTypeId`, `checkInDate`, `checkOutDate` | Số phòng còn trống |

## Yêu thích – `/api/favorites`

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/` | Đăng nhập | Địa điểm yêu thích của tôi |
| POST | `/:destinationId/toggle` | Đăng nhập | Thêm/bỏ, trả `{ isFavorite }` |
| DELETE | `/:destinationId` | Đăng nhập | Bỏ yêu thích (204) |

## Đặt chỗ và thanh toán – `/api/bookings`

| Method | Path | Quyền | Body / Query | Mô tả |
|---|---|---|---|---|
| POST | `/quote` | Công khai | `packageId`, `roomTypeId`, `checkInDate`, `checkOutDate`, `guests`, `roomsCount`, `services[]?`, `voucherCode?` | Báo giá, không tạo dữ liệu |
| POST | `/` | Đăng nhập | Như `/quote` + `contactName`, `contactPhone`, `contactEmail`, `note?`, `paymentMethod` (`ONLINE_MOCK`·`PAY_AT_PROPERTY`) | Tạo booking `PENDING`; online có `paymentDueAt` |
| GET | `/` | Đăng nhập | `scope` (`mine`·`managed`), `status`, `code`, `page`, `limit` | USER: của mình. OWNER mặc định `managed` = booking tại địa điểm mình. STAFF/ADMIN mặc định `managed` = tất cả |
| GET | `/:id` | Đăng nhập (của mình / quản lý) | | Chi tiết, gồm hoa hồng và thanh toán |
| POST | `/:id/pay` | Chủ booking | `channel?` (`CARD`·`EWALLET`·`BANK_TRANSFER`), `simulateFailure?` | Thanh toán giả lập |
| POST | `/:id/cancel` | Chủ booking / OWNER của địa điểm / STAFF / ADMIN | `reason` (bắt buộc với OWNER/STAFF/ADMIN) | Hủy, hoàn tiền nếu đã trả |
| PATCH | `/:id/status` | OWNER của địa điểm / STAFF / ADMIN | `status` (`CONFIRMED`·`COMPLETED`) | Xác nhận / hoàn thành |

## Đánh giá – `/api/reviews`

| Method | Path | Quyền | Body / Query | Mô tả |
|---|---|---|---|---|
| POST | `/` | Đăng nhập | `bookingId`, `rating` (1–5), `comment?` | Đánh giá booking đã hoàn thành |
| GET | `/mine` | Đăng nhập | `page`, `limit` | Đánh giá của tôi, mọi trạng thái |
| PATCH | `/:id` | Tác giả | `rating?`, `comment?` | Sửa → chờ duyệt lại |
| DELETE | `/:id` | Tác giả | | Xóa (204) |
| GET | `/moderation` | STAFF, ADMIN | `status` (mặc định `PENDING`) | Hàng chờ kiểm duyệt |
| PATCH | `/:id/moderation` | STAFF, ADMIN | `status` (`APPROVED`·`REJECTED`), `rejectReason?` | Duyệt / từ chối |

## Thông báo – `/api/notifications`

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/` | Đăng nhập | `unread=true` để lọc chưa đọc |
| GET | `/unread-count` | Đăng nhập | `{ count }` |
| PATCH | `/read-all` | Đăng nhập | Đánh dấu tất cả đã đọc |
| PATCH | `/:id/read` | Đăng nhập (của mình) | `{ isRead }` (mặc định `true`) |

## Chat CSKH – `/api/conversations`

| Method | Path | Quyền | Body / Query | Mô tả |
|---|---|---|---|---|
| POST | `/` | Đăng nhập | `subject`, `content`, `bookingId?` | Mở hội thoại kèm tin đầu tiên |
| GET | `/` | Đăng nhập | `status`, `page` | USER: của mình; STAFF/ADMIN: tất cả |
| GET | `/:id/messages` | Đăng nhập (của mình / staff) | `after?` (id tin cuối, để poll) | Tin nhắn, đánh dấu đã đọc |
| POST | `/:id/messages` | Đăng nhập (của mình / staff) | `content` | Gửi tin |
| PATCH | `/:id` | STAFF, ADMIN | `status?`, `staffId?` | Nhận xử lý / đóng |

## Đối tác – `/api/partners`

| Method | Path | Quyền | Body / Query | Mô tả |
|---|---|---|---|---|
| POST | `/apply` | USER | `businessName`, `businessAddress`, `contactPhone`, `acceptPartnerTerms: true`, `taxCode?`, `description?`, `bankName?`, `bankAccountNumber?`, `bankAccountName?` | Nộp / nộp lại hồ sơ |
| GET | `/me` | Đăng nhập | | Hồ sơ của tôi (404 nếu chưa nộp) |
| PATCH | `/me` | Đăng nhập | Các trường hồ sơ và ngân hàng | Cập nhật |
| GET | `/` | ADMIN | `status`, `q`, `page` | Danh sách hồ sơ |
| GET | `/:id` | ADMIN | | Chi tiết hồ sơ |
| PATCH | `/:id/review` | ADMIN | `status` (`APPROVED`·`REJECTED`), `commissionRate?`, `rejectReason?` | Duyệt → role thành `OWNER` |
| PATCH | `/:id/status` | ADMIN | `status` (`SUSPENDED`·`APPROVED`), `reason?` | Tạm ngưng / mở lại |
| PATCH | `/:id/commission` | ADMIN | `commissionRate` (0–0.5) | Đổi hoa hồng cho booking mới |

## Quản lý địa điểm, gói, phòng, dịch vụ

| Method | Path | Quyền | Body / Query | Mô tả |
|---|---|---|---|---|
| GET | `/api/manage/destinations` | OWNER (của mình), ADMIN | `listingStatus`, `ownerId` (admin), `q`, `page` | Tin đăng mọi trạng thái |
| GET | `/api/manage/destinations/:id` | OWNER (của mình), ADMIN | | Chi tiết đầy đủ, gồm mục đang tắt |
| POST | `/api/destinations` | OWNER, ADMIN | Xem [tai-khoan-va-dang-ky.md](../01-dac-ta/tai-khoan-va-dang-ky.md) mục 5; admin thêm `ownerId?`, `isFeatured?` | OWNER → `DRAFT`; ADMIN → `APPROVED` |
| PATCH | `/api/destinations/:id` | OWNER (của mình), ADMIN | Như trên (một phần) | Sửa; OWNER không đổi được `isFeatured`, `ownerId` |
| POST | `/api/destinations/:id/submit` | OWNER (của mình) | | Gửi duyệt |
| PATCH | `/api/destinations/:id/review` | ADMIN | `status` (`APPROVED`·`REJECTED`), `rejectReason?` | Duyệt tin |
| DELETE | `/api/destinations/:id` | OWNER (tin chưa duyệt của mình), ADMIN | | Xóa (409 nếu đã có booking) |
| POST / PATCH | `/api/packages`, `/api/packages/:id` | OWNER (của mình), ADMIN | `destinationId`, `name`, `durationDays`, `durationNights`, `price`, `inclusions?`, `freeCancellationHours?`, `isActive?` | Gói dịch vụ |
| POST / PATCH | `/api/room-types`, `/api/room-types/:id` | OWNER (của mình), ADMIN | `destinationId`, `name`, `capacity`, `pricePerNight`, `totalRooms`, `isActive?` | Loại phòng |
| POST / PATCH | `/api/addon-services`, `/api/addon-services/:id` | OWNER (của mình), ADMIN | `destinationId`, `name`, `price`, `pricingUnit?`, `isActive?` | Dịch vụ bổ sung |
| POST / PATCH / DELETE | `/api/categories`, `/api/categories/:id` | ADMIN | `name`, `slug?`, `iconName?` | Danh mục |
| POST / PATCH / DELETE | `/api/facilities`, `/api/facilities/:id` | ADMIN | `name`, `iconName?` | Tiện ích |
| GET / POST / PATCH | `/api/vouchers`, `/api/vouchers/:id` | ADMIN | `code`, `discountType`, `value`, `startsAt`, `endsAt`, ... | Voucher |

## Người dùng – `/api/users`

| Method | Path | Quyền | Body / Query | Mô tả |
|---|---|---|---|---|
| GET | `/` | STAFF, ADMIN | `q`, `role`, `status`, `page` | Danh sách (không có mật khẩu) |
| GET | `/:id` | STAFF, ADMIN | | Chi tiết + số booking, review |
| GET | `/:id/bookings` | STAFF, ADMIN | `page` | Lịch sử đặt của user |
| PATCH | `/:id/status` | ADMIN | `status` (`ACTIVE`·`LOCKED`) | Khóa / mở |
| PATCH | `/:id/role` | ADMIN | `role` (`USER`·`STAFF`·`ADMIN`) | Đổi vai trò; không áp cho OWNER |

## Thống kê – `/api/stats`

| Method | Path | Quyền | Query | Mô tả |
|---|---|---|---|---|
| GET | `/overview` | OWNER, ADMIN | `from?`, `to?` (`YYYY-MM-DD`, mặc định 30 ngày, tối đa 366) | ADMIN: toàn sàn (`scope = PLATFORM`); OWNER: địa điểm của mình (`scope = OWNER`) |

Cấu trúc response (rút gọn):

```json
{
  "data": {
    "scope": "PLATFORM",
    "range": { "from": "2026-09-25", "to": "2026-10-24", "days": 30 },
    "summary": {
      "grossBookingValue": 41850000,
      "platformRevenue": 5420000,
      "ownerRevenue": 33100000,
      "discountGiven": 200000,
      "totalBookings": 14,
      "confirmedBookings": 11,
      "cancellationRate": 14.3,
      "averageBookingValue": 3804545,
      "roomNightsSold": 19
    },
    "bookingsByStatus": { "PENDING": 1, "CONFIRMED": 4, "COMPLETED": 7, "CANCELLED": 2 },
    "revenueByDay": [{ "date": "2026-09-25", "bookings": 0, "grossBookingValue": 0, "commission": 0, "ownerRevenue": 0 }],
    "topDestinations": [{ "id": 1, "name": "Đà Lạt Pine Hill Resort", "bookings": 4, "grossBookingValue": 12000000, "commission": 1800000 }],
    "paymentMethods": [{ "method": "ONLINE_MOCK", "count": 8, "amount": 30000000 }],
    "users": { "newUsers": 3, "totalUsers": 9, "activeOwners": 2 },
    "pending": { "partnerApplications": 1, "listingsToReview": 0, "reviewsToModerate": 0, "bookingsToConfirm": 1, "openConversations": 0 }
  }
}
```

Với OWNER, thay `users` bằng `listings` (số tin theo trạng thái), `rating` và `pending: { bookingsToConfirm, upcomingCheckIns }`. Số trong ví dụ là minh họa.
