# Danh sách API

Base URL khi dev: `http://localhost:3000`. Mọi endpoint nghiệp vụ có tiền tố `/api`. Quy ước response, mã lỗi và xử lý token: [../01-dac-ta/luong-nghiep-vu.md](../01-dac-ta/luong-nghiep-vu.md) mục 1 và 12. Mọi response có header `X-Request-Id` (gửi kèm header này trong request để tự đặt mã, 8–64 ký tự `A-Z a-z 0-9 . _ -`).

Collection Postman chạy được toàn bộ luồng: `be/postman/travelling-app.postman_collection.json` (xem [../03-trien-khai/kiem-thu.md](../03-trien-khai/kiem-thu.md)).

**Cột Quyền:** `Công khai` = không cần token · `Đăng nhập` = mọi vai trò · tên vai trò = chỉ vai trò đó. "Của mình" nghĩa là backend kiểm tra quyền sở hữu, dữ liệu của người khác trả 404/403.

## Hệ thống

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/health` | Công khai | Kiểm tra API và kết nối DB (503 nếu DB lỗi) |
| GET | `/` | Công khai | Tên và trạng thái API |

## Xác thực – `/api/auth`

| Method | Path | Quyền | Body | Mô tả |
|---|---|---|---|---|
| POST | `/register` | Công khai | `name`, `email`, `password`, `acceptTerms: true`, `phone?`, `dateOfBirth?` | Đăng ký, gửi email xác thực, trả phiên (bảng dưới) |
| POST | `/login` | Công khai | `email`, `password`, `deviceName?` | Đăng nhập, trả phiên |
| POST | `/refresh` | Công khai | `refreshToken`, `deviceName?` | Đổi refresh token lấy cặp token mới (token cũ bị thu hồi) |
| POST | `/logout` | Công khai | `refreshToken` | Thu hồi phiên này (204) |
| POST | `/logout-all` | Đăng nhập | | Thu hồi mọi phiên (204) |
| GET | `/sessions` | Đăng nhập | | Phiên đang hoạt động: thiết bị, IP, lần dùng cuối |
| DELETE | `/sessions/:id` | Đăng nhập (của mình) | | Đăng xuất một thiết bị (204) |
| POST | `/verify-email` | Công khai | `token` | Xác thực email từ link trong email |
| POST | `/resend-verification` | Đăng nhập | | Gửi lại email xác thực (409 nếu đã xác thực) |
| POST | `/forgot-password` | Công khai | `email` | Gửi link đặt lại mật khẩu; luôn trả cùng thông báo |
| POST | `/reset-password` | Công khai | `token`, `newPassword` | Đặt mật khẩu mới, thu hồi mọi phiên (204) |
| GET | `/me` | Đăng nhập | | Hồ sơ của tôi (có `emailVerifiedAt`) |
| PATCH | `/me` | Đăng nhập | `name?`, `phone?`, `dateOfBirth?`, `avatarUrl?` | Sửa hồ sơ |
| PATCH | `/me/password` | Đăng nhập | `currentPassword`, `newPassword` | Đổi mật khẩu; thu hồi mọi phiên, trả phiên mới cho thiết bị này |

**Phiên** (response của register, login, refresh, đổi mật khẩu):

```json
{
  "user": { "id": 1, "email": "...", "role": "USER", "emailVerifiedAt": null },
  "accessToken": "eyJ...",
  "token": "eyJ...",
  "refreshToken": "4f9K...",
  "refreshTokenExpiresAt": "2026-11-24T09:00:00.000Z",
  "sessionId": 42
}
```

- `accessToken` hết hạn sau `JWT_EXPIRES_IN` (15 phút); `token` là tên cũ của cùng giá trị. Gửi trong header `Authorization: Bearer <accessToken>`.
- Khi API trả 401, gọi `/refresh` một lần rồi thử lại request; `/refresh` cũng lỗi thì đăng xuất. Luồng chi tiết: [luong-nghiep-vu.md](../01-dac-ta/luong-nghiep-vu.md) mục 1.3.
- Khi `EMAIL_TRANSPORT=console` (dev, demo), response kèm `devVerificationToken` / `devResetToken` để thử luồng không cần hộp thư. Production không có.

`/register`, `/login`, `/forgot-password`, `/reset-password`, `/resend-verification` giới hạn 20 lần / 15 phút / IP. Trường bắt buộc: [tai-khoan-va-dang-ky.md](../01-dac-ta/tai-khoan-va-dang-ky.md).

## Khám phá – danh mục, tiện ích, địa điểm

| Method | Path | Quyền | Body / Query | Mô tả |
|---|---|---|---|---|
| GET | `/api/categories` | Công khai | | Danh mục + số địa điểm công khai |
| GET | `/api/facilities` | Công khai | | Tiện ích |
| GET | `/api/destinations` | Công khai | `q` (không phân biệt dấu: `da lat` = `Đà Lạt`), `categoryId`, `location`, `minPrice`, `maxPrice`, `minRating`, `facilityIds=1,2`, `featured`, `sort` (`newest`·`popular`·`rating`·`price_asc`·`price_desc`·`name`), `page`, `limit`; Staff/Admin: `includeInactive=true` | Tìm kiếm, lọc, phân trang. Chỉ tin đã duyệt và đang hoạt động |
| GET | `/api/destinations/:idOrSlug` | Công khai (token tùy chọn) | | Chi tiết + `latestReviews` (kèm `images`) + `isFavorite`; mỗi loại phòng có `rates` (giá mùa chưa kết thúc). Tin chưa duyệt: chỉ chủ và Staff/Admin xem |
| GET | `/api/destinations/:id/reviews` | Công khai | `page`, `limit` | Đánh giá đã duyệt |
| GET | `/api/destinations/:id/availability` | Công khai | `roomTypeId`, `checkInDate`, `checkOutDate` | Số phòng còn trống |
| GET | `/api/room-types/:id/rates` | Công khai | | Giá mùa chưa kết thúc của loại phòng |

## Yêu thích – `/api/favorites`

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/` | Đăng nhập | Địa điểm yêu thích của tôi |
| POST | `/:destinationId/toggle` | Đăng nhập | Thêm/bỏ, trả `{ isFavorite }` |
| DELETE | `/:destinationId` | Đăng nhập | Bỏ yêu thích (204) |

## Đặt chỗ và thanh toán – `/api/bookings`

| Method | Path | Quyền | Body / Query | Mô tả |
|---|---|---|---|---|
| POST | `/quote` | Công khai | `packageId`, `roomTypeId`, `checkInDate`, `checkOutDate`, `guests`, `roomsCount`, `services[]?`, `voucherCode?` | Báo giá, không tạo dữ liệu; `nightlyRoomPrices[]` = giá từng đêm `{ date, price, rateName }` |
| POST | `/` | Đăng nhập | Như `/quote` + `contactName`, `contactPhone`, `contactEmail`, `note?`, `paymentMethod` (`ONLINE_MOCK`·`PAY_AT_PROPERTY`) | Tạo booking `PENDING`; online có `paymentDueAt` |
| GET | `/` | Đăng nhập | `scope` (`mine`·`managed`), `status`, `code`, `page`, `limit` | USER: của mình. OWNER mặc định `managed` = booking tại địa điểm mình. STAFF/ADMIN mặc định `managed` = tất cả |
| GET | `/:id` | Đăng nhập (của mình / quản lý) | | Chi tiết, gồm hoa hồng và thanh toán |
| POST | `/:id/pay` | Chủ booking | `channel?` (`CARD`·`EWALLET`·`BANK_TRANSFER`), `simulateFailure?` | Thanh toán giả lập |
| POST | `/:id/cancel` | Chủ booking / OWNER của địa điểm / STAFF / ADMIN | `reason` (bắt buộc với OWNER/STAFF/ADMIN) | Hủy, hoàn tiền nếu đã trả |
| PATCH | `/:id/status` | OWNER của địa điểm / STAFF / ADMIN | `status` (`CONFIRMED`·`COMPLETED`) | Xác nhận / hoàn thành |

## Đánh giá – `/api/reviews`

| Method | Path | Quyền | Body / Query | Mô tả |
|---|---|---|---|---|
| POST | `/` | Đăng nhập | `bookingId`, `rating` (1–5), `comment?`, `imageUrls?` (≤ 5, từ `/api/uploads`) | Đánh giá booking đã hoàn thành |
| GET | `/mine` | Đăng nhập | `page`, `limit` | Đánh giá của tôi, mọi trạng thái |
| PATCH | `/:id` | Tác giả | `rating?`, `comment?`, `imageUrls?` (gửi = thay toàn bộ ảnh) | Sửa → chờ duyệt lại |
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
| POST | `/apply` | USER (đã xác thực email) | `businessName`, `businessAddress`, `contactPhone`, `acceptPartnerTerms: true`, `taxCode?`, `description?`, `bankName?`, `bankAccountNumber?`, `bankAccountName?` | Nộp / nộp lại hồ sơ |
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
| POST | `/api/room-types/:id/rates` | OWNER (của mình), ADMIN | `name`, `startDate`, `endDate` (gồm cả hai ngày), `pricePerNight` | Thêm giá mùa (409 `RATE_OVERLAP` nếu trùng ngày) |
| PATCH / DELETE | `/api/room-types/:id/rates/:rateId` | OWNER (của mình), ADMIN | Như trên (một phần) | Sửa / xóa giá mùa |
| POST / PATCH | `/api/addon-services`, `/api/addon-services/:id` | OWNER (của mình), ADMIN | `destinationId`, `name`, `price`, `pricingUnit?`, `isActive?` | Dịch vụ bổ sung |
| POST / PATCH / DELETE | `/api/categories`, `/api/categories/:id` | ADMIN | `name`, `slug?`, `iconName?` | Danh mục |
| POST / PATCH / DELETE | `/api/facilities`, `/api/facilities/:id` | ADMIN | `name`, `iconName?` | Tiện ích |
| GET / POST / PATCH | `/api/vouchers`, `/api/vouchers/:id` | ADMIN | `code`, `discountType`, `value`, `startsAt`, `endsAt`, ... | Voucher |

## Đối soát – `/api/payouts`

| Method | Path | Quyền | Body / Query | Mô tả |
|---|---|---|---|---|
| GET | `/` | OWNER (của mình), ADMIN | `status`, `ownerId` (admin), `page` | Danh sách kỳ đối soát |
| GET | `/unsettled` | OWNER | | Doanh thu đã hoàn thành chưa vào kỳ nào: `{ bookingCount, grossAmount, commissionAmount, amount }` |
| GET | `/preview` | ADMIN | `periodStart`, `periodEnd` | Số tiền từng chủ trong kỳ, trước khi lập |
| POST | `/` | ADMIN | `ownerId`, `periodStart`, `periodEnd`, `note?` | Lập kỳ, gắn booking (409 `NOTHING_TO_PAY` nếu không có) |
| GET | `/:id` | OWNER (của mình), ADMIN | | Chi tiết kỳ + danh sách booking và doanh thu từng booking |
| PATCH | `/:id/pay` | ADMIN | `transferRef` | Xác nhận đã chuyển khoản → `PAID`, báo cho chủ |
| PATCH | `/:id/cancel` | ADMIN | `reason?` | Hủy kỳ chưa chuyển, trả booking về chưa đối soát |

## Tải ảnh – `/api/uploads`

| Method | Path | Quyền | Body | Mô tả |
|---|---|---|---|---|
| POST | `/` | Đăng nhập (`destination`: OWNER, ADMIN) | `multipart/form-data`: `file` (JPEG/PNG/WebP ≤ 5 MB), `purpose` (`avatar`·`destination`·`review`) | Trả `{ id, url, mimeType, size }`; dùng `url` cho `avatarUrl`, `imageUrl`/`images` của địa điểm, `imageUrls` của đánh giá |
| DELETE | `/:id` | Người tải lên | | Xóa file (204) |

Với `STORAGE_DRIVER=local`, ảnh được phục vụ ở `GET /uploads/<key>` (cache 1 năm).

## Thiết bị nhận push – `/api/devices`

| Method | Path | Quyền | Body | Mô tả |
|---|---|---|---|---|
| POST | `/` | Đăng nhập | `token` (`ExponentPushToken[...]`), `platform` (`IOS`·`ANDROID`·`WEB`) | Đăng ký / cập nhật thiết bị; gọi sau đăng nhập và mỗi lần mở app |
| DELETE | `/` | Đăng nhập | `token` | Gỡ khi đăng xuất (204) |
| GET | `/` | Đăng nhập | | Thiết bị của tôi |

Mọi thông báo trong `/api/notifications` được gửi push tới các thiết bị đã đăng ký khi `PUSH_ENABLED=true`; `data` của push giống `data` của thông báo (thêm `notificationId`) để app mở đúng trang.

## Nhật ký quản trị – `/api/audit-logs`

| Method | Path | Quyền | Query | Mô tả |
|---|---|---|---|---|
| GET | `/` | ADMIN | `actorId`, `entity`, `entityId`, `action` (lọc theo tiền tố, ví dụ `partner.`), `from`, `to`, `page` | Nhật ký mới nhất trước, kèm `actor` |

## Người dùng – `/api/users`

| Method | Path | Quyền | Body / Query | Mô tả |
|---|---|---|---|---|
| GET | `/` | STAFF, ADMIN | `q`, `role`, `status`, `page` | Danh sách (không có mật khẩu) |
| GET | `/:id` | STAFF, ADMIN | | Chi tiết + số booking, review |
| GET | `/:id/bookings` | STAFF, ADMIN | `page` | Lịch sử đặt của user |
| PATCH | `/:id/status` | ADMIN | `status` (`ACTIVE`·`LOCKED`) | Khóa / mở; khóa thì thu hồi mọi phiên |
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

Với OWNER, thay `users` bằng `listings` (số tin theo trạng thái), `rating`, `pending: { bookingsToConfirm, upcomingCheckIns }` và `payouts: { unsettledAmount, unsettledBookings, pendingPayoutAmount, pendingPayouts }`. Số trong ví dụ là minh họa.
