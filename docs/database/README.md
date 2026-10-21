# Thiết kế cơ sở dữ liệu – Travelling App

Tài liệu này mô tả cơ sở dữ liệu đề xuất cho Travelling App, xây dựng từ nghiệp vụ trong `docs/Mô tả hệ thống.docx`. Thiết kế đã được cài đặt bằng Prisma tại `be/prisma/schema.prisma` và migration `be/prisma/migrations/20261021090000_business_domain`.

- **Hệ quản trị:** MariaDB 11 (Prisma provider `mysql`), bảng mã `utf8mb4`, collation `utf8mb4_unicode_ci`.
- **ORM:** Prisma 7 với adapter `@prisma/adapter-mariadb`.
- **Quy ước:** tên bảng PascalCase theo tên model (`Booking`, `RoomType`), tên cột camelCase, khóa chính `id INT AUTO_INCREMENT`, mọi bảng nghiệp vụ có `createdAt` và `updatedAt`.

## 1. Tổng quan

Cơ sở dữ liệu gồm 17 bảng, chia thành 5 nhóm:

| Nhóm | Bảng | Mục đích |
|---|---|---|
| Tài khoản | `User` | Khách hàng, nhân viên CSKH và quản trị viên (phân biệt bằng `role`) |
| Danh mục và nội dung | `Category`, `Facility`, `Destination`, `DestinationImage`, `_DestinationToFacility` | Địa điểm du lịch, danh mục, tiện ích, ảnh |
| Sản phẩm đặt chỗ | `Package`, `RoomType`, `AddonService`, `Voucher` | Gói dịch vụ, loại phòng, dịch vụ bổ sung, mã giảm giá |
| Giao dịch | `Booking`, `BookingService`, `Payment` | Đơn đặt chỗ, dịch vụ đã chọn, thanh toán |
| Tương tác | `Favorite`, `Review`, `Conversation`, `Message`, `Notification` | Yêu thích, đánh giá, chat CSKH, thông báo |

## 2. Sơ đồ quan hệ (ERD)

```mermaid
erDiagram
    User ||--o{ Booking : "đặt"
    User ||--o{ Favorite : "yêu thích"
    User ||--o{ Review : "viết"
    User |o--o{ Review : "kiểm duyệt"
    User ||--o{ Notification : "nhận"
    User ||--o{ Conversation : "mở (khách)"
    User |o--o{ Conversation : "phụ trách (staff)"
    User ||--o{ Message : "gửi"

    Category |o--o{ Destination : "phân loại"
    Destination }o--o{ Facility : "có tiện ích"
    Destination ||--o{ DestinationImage : "có ảnh"
    Destination ||--o{ Package : "cung cấp"
    Destination ||--o{ RoomType : "có phòng"
    Destination ||--o{ AddonService : "có dịch vụ"
    Destination ||--o{ Favorite : ""
    Destination ||--o{ Review : ""
    Destination ||--o{ Booking : ""

    Package ||--o{ Booking : "được chọn"
    RoomType ||--o{ Booking : "được chọn"
    Voucher |o--o{ Booking : "áp dụng"
    Booking ||--o{ BookingService : "gồm"
    AddonService ||--o{ BookingService : ""
    Booking ||--o| Payment : "thanh toán"
    Booking ||--o| Review : "được đánh giá"

    Conversation ||--o{ Message : "chứa"
```

Cây dữ liệu theo nghiệp vụ (mục 20 và 23 trong tài liệu mô tả):

```text
Destination (Đà Lạt Pine Hill Resort)
├── Category: Resort
├── Facility: Wi-Fi, Bữa sáng, Spa...      (tiện ích để hiển thị và lọc)
├── Package: Standard / Premium / VIP     (giá gói, số ngày-đêm, chính sách hủy)
├── RoomType: Standard / Deluxe / Suite   (giá theo đêm, sức chứa, tổng số phòng)
├── AddonService: Đưa đón, Spa, Giường phụ (dịch vụ trả thêm phí)
└── Review (chỉ từ booking đã hoàn thành)

Booking
├── Package + RoomType + Voucher (tham chiếu)
├── BookingService[]  (dịch vụ đã chọn, chụp lại giá)
├── Payment           (1-1)
└── Review            (1-1, tùy chọn)
```

## 3. Kiểu liệt kê (enum)

| Enum | Giá trị | Dùng tại |
|---|---|---|
| `Role` | `USER`, `STAFF`, `ADMIN` | `User.role` |
| `UserStatus` | `ACTIVE`, `LOCKED` | `User.status` |
| `BookingStatus` | `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED` | `Booking.status` |
| `PaymentMethod` | `ONLINE_MOCK` (thanh toán online giả lập), `PAY_AT_PROPERTY` (trả tại nơi lưu trú) | `Payment.method` |
| `PaymentStatus` | `UNPAID`, `PAID`, `REFUNDED`, `FAILED` | `Payment.status` |
| `ReviewStatus` | `PENDING`, `APPROVED`, `REJECTED` | `Review.status` |
| `ServicePricingUnit` | `PER_BOOKING`, `PER_GUEST`, `PER_NIGHT` | `AddonService.pricingUnit` |
| `DiscountType` | `PERCENT`, `FIXED` | `Voucher.discountType` |
| `NotificationType` | `BOOKING`, `PAYMENT`, `SUPPORT`, `REVIEW`, `SYSTEM` | `Notification.type` |
| `ConversationStatus` | `OPEN`, `CLOSED` | `Conversation.status` |

Dùng enum thay cho chuỗi tự do (thiết kế cũ có `status String`) để database từ chối giá trị sai chính tả như `"CONFIRM"`.

## 4. Chi tiết các bảng

Ký hiệu: **PK** khóa chính, **FK** khóa ngoại, **UQ** duy nhất, **?** cho phép NULL.

### 4.1. `User` – Tài khoản

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | INT | PK | |
| `name` | VARCHAR(191) | | Họ tên |
| `email` | VARCHAR(191) | UQ | Lưu chữ thường; dùng để đăng nhập |
| `password` | VARCHAR(191) | | Hash bcrypt, không bao giờ trả ra API (BR-09) |
| `phone` | VARCHAR(20)? | | |
| `dateOfBirth` | DATE? | | |
| `avatarUrl` | VARCHAR(500)? | | |
| `role` | ENUM `Role` | mặc định `USER` | |
| `status` | ENUM `UserStatus` | mặc định `ACTIVE` | `LOCKED` chặn đăng nhập và mọi request ngay lập tức |

Một bảng cho cả ba vai trò vì Staff và Admin dùng chung cơ chế đăng nhập; quyền được kiểm tra bằng `role`.

### 4.2. `Category` – Danh mục

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | INT | PK | |
| `name` | VARCHAR(191) | UQ | Biển, Núi, Resort, Khách sạn, Khu vui chơi, Di tích lịch sử, Văn hóa, Sinh thái |
| `slug` | VARCHAR(191) | UQ | Dùng trong URL, ví dụ `di-tich-lich-su` |
| `iconName` | VARCHAR(191)? | | Tên icon hiển thị trên app |

### 4.3. `Facility` – Tiện ích

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | INT | PK | |
| `name` | VARCHAR(191) | UQ | Wi-Fi, Hồ bơi, Bữa sáng, Bãi đỗ xe, Spa, Gym, Đưa đón sân bay |
| `iconName` | VARCHAR(191)? | | |

Quan hệ nhiều-nhiều với `Destination` qua bảng nối `_DestinationToFacility (A = destinationId, B = facilityId)` do Prisma quản lý.

Tiện ích chỉ để **hiển thị và lọc**. Tiện ích nào thu thêm tiền (ví dụ Spa) được tạo thành `AddonService` để tính vào giá.

### 4.4. `Destination` – Địa điểm du lịch

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | INT | PK | |
| `name` | VARCHAR(191) | | |
| `slug` | VARCHAR(191) | UQ | `da-lat-pine-hill-resort` |
| `description` | TEXT? | | |
| `location` | VARCHAR(191) | INDEX | Khu vực/thành phố, dùng để lọc |
| `address` | VARCHAR(500)? | | |
| `latitude`, `longitude` | DOUBLE? | | Vị trí bản đồ |
| `imageUrl` | VARCHAR(500)? | | Ảnh đại diện |
| `contactPhone`, `contactEmail` | VARCHAR? | | Thông tin liên hệ |
| `policy` | TEXT? | | Chính sách nhận/trả phòng |
| `categoryId` | INT? | FK → `Category`, ON DELETE SET NULL | |
| `isActive` | BOOLEAN | mặc định `true` | Ẩn/hiện (kích hoạt/vô hiệu hóa) |
| `isFeatured` | BOOLEAN | mặc định `false` | Địa điểm nổi bật trên trang chủ |
| `minPrice` | INT | mặc định 0 | **Dữ liệu dẫn xuất:** "Giá từ" |
| `averageRating` | DOUBLE | mặc định 0 | **Dữ liệu dẫn xuất:** điểm trung bình review đã duyệt |
| `reviewCount` | INT | mặc định 0 | **Dữ liệu dẫn xuất:** số review đã duyệt |

`minPrice`, `averageRating`, `reviewCount` được lưu sẵn để lọc theo khoảng giá/rating và sắp xếp nhanh mà không phải JOIN + aggregate mỗi lần tìm kiếm. Backend tính lại các cột này:

- `minPrice` = giá gói rẻ nhất + giá/đêm của phòng rẻ nhất × số đêm của gói, cập nhật khi admin thêm/sửa gói hoặc phòng.
- `averageRating`, `reviewCount` chỉ tính review `APPROVED`, cập nhật khi duyệt, sửa hoặc xóa review.

### 4.5. `DestinationImage` – Thư viện ảnh

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `id` | INT | PK |
| `destinationId` | INT | FK → `Destination`, ON DELETE CASCADE |
| `url` | VARCHAR(500) | |
| `sortOrder` | INT | mặc định 0 |

### 4.6. `Package` – Gói dịch vụ

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | INT | PK | |
| `destinationId` | INT | FK → `Destination`, CASCADE | |
| `name` | VARCHAR(191) | | Gói Standard / Premium / VIP |
| `description` | TEXT? | | |
| `inclusions` | JSON? | | Danh sách quyền lợi, ví dụ `["Phòng Deluxe","Ăn sáng","Đưa đón"]` |
| `durationDays`, `durationNights` | INT | | 3 ngày 2 đêm; số đêm tối thiểu khi đặt |
| `price` | INT | | Giá gói (VNĐ) cho cả booking |
| `freeCancellationHours` | INT | mặc định 48 | Chính sách hủy miễn phí (BR-07) |
| `isActive` | BOOLEAN | mặc định `true` | |

### 4.7. `RoomType` – Loại phòng

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | INT | PK | |
| `destinationId` | INT | FK → `Destination`, CASCADE | |
| `name` | VARCHAR(191) | | Standard, Deluxe, Family, Suite |
| `description` | TEXT? | | |
| `capacity` | INT | | Số khách tối đa mỗi phòng |
| `pricePerNight` | INT | | VNĐ/đêm/phòng |
| `totalRooms` | INT | | Tổng số phòng loại này |
| `isActive` | BOOLEAN | mặc định `true` | |

**Không lưu cột "số phòng còn trống".** Số phòng trống thay đổi theo ngày nên được tính khi cần (mục 6.2). Lưu một con số cố định sẽ sai khi khách đặt các khoảng ngày khác nhau.

### 4.8. `AddonService` – Dịch vụ bổ sung

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | INT | PK | |
| `destinationId` | INT | FK → `Destination`, CASCADE | |
| `name` | VARCHAR(191) | | Đưa đón sân bay, Giường phụ, Hướng dẫn viên, Thuê xe |
| `description` | TEXT? | | |
| `price` | INT | | Đơn giá |
| `pricingUnit` | ENUM | mặc định `PER_BOOKING` | Tính theo lượt, theo khách hoặc theo đêm |
| `isActive` | BOOLEAN | mặc định `true` | |

### 4.9. `Voucher` – Mã giảm giá

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | INT | PK | |
| `code` | VARCHAR(191) | UQ | `WELCOME10` |
| `description` | VARCHAR? | | |
| `discountType` | ENUM | | `PERCENT` hoặc `FIXED` |
| `value` | INT | | 10 (%) hoặc 200000 (VNĐ) |
| `maxDiscount` | INT? | | Mức giảm tối đa khi giảm theo % |
| `minOrderValue` | INT | mặc định 0 | Giá trị đơn tối thiểu |
| `usageLimit` | INT? | | NULL = không giới hạn |
| `usedCount` | INT | mặc định 0 | Tăng khi đặt, giảm khi hủy |
| `startsAt`, `endsAt` | DATETIME | | Thời gian hiệu lực |
| `isActive` | BOOLEAN | mặc định `true` | |

### 4.10. `Booking` – Đơn đặt chỗ

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | INT | PK | |
| `code` | VARCHAR(191) | UQ | Mã đọc được, ví dụ `TA261021-7K3F9Q` |
| `status` | ENUM `BookingStatus` | mặc định `PENDING` | |
| `userId` | INT | FK → `User`, RESTRICT | |
| `destinationId` | INT | FK → `Destination`, RESTRICT | |
| `packageId` | INT | FK → `Package`, RESTRICT | |
| `roomTypeId` | INT | FK → `RoomType`, RESTRICT | |
| `voucherId` | INT? | FK → `Voucher`, SET NULL | |
| `checkInDate`, `checkOutDate` | DATE | | Ngày nhận, ngày trả |
| `nights` | INT | | Số đêm |
| `guests` | INT | | Số khách |
| `roomsCount` | INT | | Số phòng |
| `contactName`, `contactPhone`, `contactEmail` | VARCHAR | | Thông tin người lưu trú, có thể khác chủ tài khoản |
| `note` | TEXT? | | Ghi chú |
| `packagePrice` | INT | | Giá gói tại thời điểm đặt |
| `roomPrice` | INT | | Giá/đêm × số đêm × số phòng |
| `servicesPrice` | INT | | Tổng dịch vụ bổ sung |
| `subtotal` | INT | | Tạm tính |
| `discountAmount` | INT | mặc định 0 | |
| `taxAmount` | INT | mặc định 0 | |
| `totalAmount` | INT | | Tổng thanh toán |
| `confirmedAt`, `completedAt`, `cancelledAt` | DATETIME? | | Mốc thời gian theo trạng thái |
| `cancelReason` | TEXT? | | |

Bảng giá trong booking là **ảnh chụp (snapshot)**. Khi admin đổi giá gói hoặc phòng sau này, booking cũ vẫn giữ đúng số tiền khách đã đồng ý.

Các khóa ngoại dùng `RESTRICT`: không thể xóa địa điểm, gói hoặc phòng đã có booking. Muốn ngừng bán, đặt `isActive = false`.

### 4.11. `BookingService` – Dịch vụ đã chọn trong booking

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `id` | INT | PK |
| `bookingId` | INT | FK → `Booking`, CASCADE |
| `addonServiceId` | INT | FK → `AddonService`, RESTRICT |
| `quantity` | INT | |
| `unitPrice` | INT | Đơn giá tại thời điểm đặt |
| `totalPrice` | INT | Thành tiền sau khi nhân theo `pricingUnit` |

### 4.12. `Payment` – Thanh toán

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | INT | PK | |
| `bookingId` | INT | UQ, FK → `Booking`, CASCADE | Quan hệ 1-1 |
| `method` | ENUM `PaymentMethod` | | |
| `status` | ENUM `PaymentStatus` | mặc định `UNPAID` | |
| `amount` | INT | | Bằng `Booking.totalAmount` |
| `transactionRef` | VARCHAR? | UQ | Mã giao dịch từ cổng thanh toán |
| `paidAt`, `refundedAt` | DATETIME? | | |

### 4.13. `Favorite` – Yêu thích

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `userId` | INT | PK (ghép), FK → `User`, CASCADE |
| `destinationId` | INT | PK (ghép), FK → `Destination`, CASCADE |
| `createdAt` | DATETIME | |

Khóa chính ghép `(userId, destinationId)` đảm bảo **BR-03** ở mức database: mỗi người chỉ yêu thích một địa điểm một lần, kể cả khi hai request đến cùng lúc.

### 4.14. `Review` – Đánh giá

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | INT | PK | |
| `userId` | INT | FK → `User`, CASCADE | Tác giả |
| `destinationId` | INT | FK → `Destination`, CASCADE | |
| `bookingId` | INT | **UQ**, FK → `Booking`, CASCADE | Mỗi booking một review (BR-08) |
| `rating` | INT | | 1–5 sao |
| `comment` | TEXT? | | |
| `status` | ENUM `ReviewStatus` | mặc định `PENDING` | Chờ kiểm duyệt |
| `moderatedById` | INT? | FK → `User`, SET NULL | Nhân viên duyệt |
| `moderatedAt` | DATETIME? | | |
| `rejectReason` | VARCHAR? | | Bắt buộc khi từ chối |

Review gắn với `bookingId` thay vì chỉ `destinationId`. Như vậy chỉ khách có booking mới tạo được review, và backend kiểm tra booking đó đã `COMPLETED` (**BR-02**).

### 4.15. `Conversation` và `Message` – Chat CSKH

`Conversation`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | INT | PK | |
| `customerId` | INT | FK → `User`, CASCADE | Khách mở hội thoại |
| `staffId` | INT? | FK → `User`, SET NULL | Gán cho nhân viên trả lời đầu tiên |
| `bookingId` | INT? | | Booking liên quan (nếu có) |
| `subject` | VARCHAR(191) | | |
| `status` | ENUM | mặc định `OPEN` | |
| `lastMessageAt` | DATETIME | | Sắp xếp hộp thư |

`Message`

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `id` | INT | PK |
| `conversationId` | INT | FK → `Conversation`, CASCADE |
| `senderId` | INT | FK → `User`, CASCADE |
| `content` | TEXT | |
| `readAt` | DATETIME? | Thời điểm phía bên kia đã đọc |
| `createdAt` | DATETIME | |

### 4.16. `Notification` – Thông báo

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | INT | PK | |
| `userId` | INT | FK → `User`, CASCADE | Người nhận |
| `type` | ENUM | | |
| `title` | VARCHAR(191) | | |
| `body` | TEXT | | |
| `data` | JSON? | | Ví dụ `{"bookingId": 12, "code": "TA261021-..."}` để app mở đúng màn hình |
| `isRead` | BOOLEAN | mặc định `false` | Đã đọc / chưa đọc |

Thông báo được tạo **trong cùng transaction** với sự kiện nghiệp vụ (tạo booking, thanh toán, hủy, xác nhận, staff trả lời, duyệt review), nên không xảy ra trường hợp đổi trạng thái thành công mà mất thông báo.

## 5. Index

| Bảng | Index | Phục vụ |
|---|---|---|
| `User` | `email` (UQ) | Đăng nhập |
| `Destination` | `slug` (UQ), `location`, `categoryId`, `(isActive, isFeatured)` | Chi tiết theo slug, lọc khu vực/danh mục, trang chủ |
| `Booking` | `code` (UQ), `(userId, status)`, `(roomTypeId, checkInDate, checkOutDate)`, `status` | Lịch sử đặt, **kiểm tra phòng trống**, màn hình quản lý của staff |
| `Review` | `bookingId` (UQ), `(destinationId, status)`, `status` | Review đã duyệt của địa điểm, hàng chờ kiểm duyệt |
| `Conversation` | `customerId`, `(status, lastMessageAt)` | Hộp thư khách, hàng đợi CSKH |
| `Message` | `(conversationId, createdAt)` | Tải tin nhắn theo thứ tự |
| `Notification` | `(userId, isRead)` | Đếm thông báo chưa đọc |
| `Package`, `RoomType`, `AddonService`, `DestinationImage` | `destinationId` | Trang chi tiết địa điểm |

## 6. Quy tắc nghiệp vụ trong dữ liệu

### 6.1. Ánh xạ Business Rule

| Rule | Cách đảm bảo |
|---|---|
| BR-01 Phải đăng nhập để yêu thích/đặt/đánh giá/chat | Các bảng tương ứng đều có `userId` NOT NULL; API yêu cầu JWT |
| BR-02 Chỉ review sau khi hoàn thành booking | `Review.bookingId` bắt buộc; backend kiểm tra `Booking.status = COMPLETED` |
| BR-03 Không yêu thích trùng | Khóa chính ghép `Favorite(userId, destinationId)` |
| BR-04 Không đặt vượt số phòng | Tính phòng trống theo từng đêm + khóa dòng `RoomType` (mục 6.2) |
| BR-05 Booking có trạng thái rõ ràng | Enum `BookingStatus` + máy trạng thái (mục 6.3) |
| BR-06 Thanh toán online xong mới xác nhận | Không cho `CONFIRMED` khi `Payment.method = ONLINE_MOCK` và `status ≠ PAID` |
| BR-07 Hủy theo chính sách gói | `Package.freeCancellationHours` |
| BR-08 Mỗi booking một review | `Review.bookingId` UNIQUE; sửa review đưa về `PENDING` để duyệt lại |
| BR-09 Không lưu mật khẩu plaintext | `User.password` là hash bcrypt |
| BR-10 Không xem dữ liệu người khác | Mọi truy vấn của USER lọc theo `userId` |

### 6.2. Kiểm tra phòng trống (BR-04)

Booking đang giữ phòng là booking có trạng thái `PENDING` hoặc `CONFIRMED` và giao với khoảng ngày cần đặt:

```sql
SELECT checkInDate, checkOutDate, roomsCount
FROM Booking
WHERE roomTypeId = ?
  AND status IN ('PENDING', 'CONFIRMED')
  AND checkInDate < :checkOut
  AND checkOutDate > :checkIn;
```

Với từng đêm trong khoảng ở, cộng `roomsCount` của các booking phủ đêm đó. Đêm đông nhất quyết định số phòng còn trống:

```text
phòng trống = RoomType.totalRooms - max(số phòng bị giữ của từng đêm)
```

Lấy giá trị lớn nhất theo từng đêm chứ không cộng dồn mọi booking giao nhau, vì hai booking không trùng ngày nhau có thể dùng lại cùng một phòng.

Để tránh hai khách cùng lấy phòng cuối, transaction tạo booking khóa dòng loại phòng trước khi đếm:

```sql
SELECT id FROM RoomType WHERE id = ? FOR UPDATE;
```

Request thứ hai phải chờ request thứ nhất commit rồi mới đếm lại. Trường hợp này đã được kiểm thử: Suite có 2 phòng, booking thứ 3 cùng ngày bị từ chối với mã `NOT_AVAILABLE`.

### 6.3. Máy trạng thái Booking

```mermaid
stateDiagram-v2
    [*] --> PENDING: Tạo booking
    PENDING --> CONFIRMED: Thanh toán online thành công / Staff xác nhận (trả tại nơi ở)
    PENDING --> CANCELLED: Khách hủy (trước giờ nhận phòng) / Staff hủy
    CONFIRMED --> COMPLETED: Staff hoàn thành (từ ngày nhận phòng)
    CONFIRMED --> CANCELLED: Khách hủy (còn ≥ freeCancellationHours) / Staff hủy
    COMPLETED --> [*]
    CANCELLED --> [*]
```

Tác động lên các bảng khác:

| Sự kiện | `Payment` | `Voucher` | `Notification` |
|---|---|---|---|
| Tạo booking | Tạo bản ghi `UNPAID` | `usedCount + 1` | "Đặt chỗ thành công" |
| Thanh toán online thành công | `PAID`, `paidAt`, `transactionRef` | | "Thanh toán thành công" |
| Thanh toán thất bại | `FAILED` (được thử lại) | | "Thanh toán thất bại" |
| Hủy | `PAID` → `REFUNDED` | `usedCount - 1` | "Booking đã bị hủy" |
| Hoàn thành (trả tại nơi ở) | `UNPAID` → `PAID` | | "Chuyến đi đã hoàn thành" |

Giờ nhận phòng chuẩn là 14:00 giờ Việt Nam; hạn hủy miễn phí được tính ngược từ mốc này.

### 6.4. Công thức tính tiền

```text
roomPrice     = RoomType.pricePerNight × nights × roomsCount
servicesPrice = Σ AddonService.price × quantity × (1 | guests | nights theo pricingUnit)
subtotal      = Package.price + roomPrice + servicesPrice
discount      = PERCENT: min(subtotal × value%, maxDiscount)   |   FIXED: min(value, subtotal)
tax           = round((subtotal - discount) × BOOKING_TAX_RATE)   -- mặc định 8%, cấu hình qua env
totalAmount   = subtotal - discount + tax
```

Voucher chỉ áp dụng khi còn hiệu lực, còn lượt và `subtotal ≥ minOrderValue`.

## 7. Quyết định thiết kế

| Quyết định | Lý do |
|---|---|
| Lưu tiền bằng `INT` (VNĐ) | VNĐ không có phần lẻ; tránh sai số của số thực. Giới hạn ~2,1 tỷ VNĐ mỗi giá trị, đủ cho một booking du lịch. Nếu cần ngoại tệ, đổi sang `DECIMAL(14,2)` |
| Ngày ở dùng `DATE`, mốc sự kiện dùng `DATETIME(3)` | Ngày nhận/trả là ngày lịch, không có múi giờ; mốc thanh toán/hủy cần thời điểm chính xác |
| Phòng thuộc địa điểm, không thuộc gói | Một loại phòng dùng chung cho nhiều gói; khách chọn gói rồi chọn phòng như quy trình mục 8–9 của tài liệu mô tả |
| Snapshot giá trong `Booking` và `BookingService` | Đổi bảng giá không làm sai hóa đơn cũ |
| Xóa mềm bằng `isActive` | Giữ lịch sử booking và báo cáo; FK `RESTRICT` chặn xóa nhầm |
| Cột dẫn xuất `minPrice`, `averageRating`, `reviewCount` | Lọc và sắp xếp nhanh trên danh sách; chấp nhận cập nhật khi dữ liệu nguồn đổi |
| `Payment` tách khỏi `Booking` (1-1) | Dễ mở rộng sang nhiều lần thanh toán hoặc cổng thật (VNPay, MoMo) mà không đổi bảng Booking |

## 8. Migration và môi trường

| Migration | Nội dung |
|---|---|
| `20261004083101_init` | 3 bảng ban đầu: `User`, `Destination`, `Booking` |
| `20261021090000_business_domain` | Toàn bộ thiết kế trong tài liệu này |

**Lưu ý khi tạo migration trên Windows:** MariaDB trên Windows mặc định `lower_case_table_names=1`, nên SQL do Prisma sinh ra có thể viết tên bảng thành chữ thường (`` `booking` ``). Trên Linux/Docker, tên bảng phân biệt hoa thường và migration đó sẽ lỗi khi deploy. Sau khi tạo migration, kiểm tra và sửa lại tên bảng đúng PascalCase (`` `Booking` ``) trước khi commit. Migration `business_domain` đã được sửa theo cách này.

Lệnh thường dùng (chạy trong `be/`):

```bash
npm run db:migrate -- --name ten_migration   # tạo + áp dụng migration khi dev
npm run db:deploy                            # áp dụng migration ở server/production
npm run db:seed                              # dữ liệu mẫu: 3 tài khoản, 8 danh mục, 6 địa điểm, voucher WELCOME10
npm run db:studio                            # xem dữ liệu
```

## 9. Đề xuất mở rộng

Các mục dưới đây chưa có trong schema; nên làm theo thứ tự ưu tiên:

1. **Tự hủy booking chưa thanh toán:** thêm `Booking.expiresAt` (ví dụ 15 phút sau khi tạo với `ONLINE_MOCK`) và một job định kỳ chuyển sang `CANCELLED`, để booking bỏ dở không giữ phòng mãi.
2. **Giá theo mùa / ngày lễ:** bảng `RoomRate(roomTypeId, date, price)` hoặc `(roomTypeId, startDate, endDate, price)` ghi đè `pricePerNight` vào Tết, lễ 30/4.
3. **Đóng phòng theo ngày:** bảng `RoomBlock(roomTypeId, date, blockedRooms)` cho bảo trì hoặc bán qua kênh khác.
4. **Phí hủy thay vì chặn hủy:** thêm `Package.cancellationFeePercent` và `Payment.refundAmount` để hủy muộn vẫn được, nhưng hoàn một phần.
5. **Cổng thanh toán thật:** bảng `PaymentTransaction(paymentId, provider, providerRef, status, rawPayload, createdAt)` lưu từng lần gọi và callback từ VNPay/MoMo.
6. **Đăng nhập lâu dài an toàn:** bảng `RefreshToken(userId, tokenHash, expiresAt, revokedAt, deviceName)` cho access token ngắn hạn + refresh token, thu hồi theo thiết bị.
7. **Quên mật khẩu / xác thực email:** bảng `VerificationToken(userId, type, tokenHash, expiresAt, usedAt)`.
8. **Push notification:** bảng `DeviceToken(userId, expoPushToken, platform)` để gửi thông báo qua Expo Push.
9. **Nhật ký quản trị:** bảng `AuditLog(actorId, action, entity, entityId, before, after, createdAt)` ghi lại thao tác khóa tài khoản, đổi giá, duyệt review.
10. **Tìm kiếm không dấu:** thêm cột `searchText` (tên + địa chỉ đã bỏ dấu) với FULLTEXT index, để "da lat" tìm ra "Đà Lạt".
11. **Ảnh do người dùng tải lên:** lưu file ở object storage (S3, Cloudinary) và chỉ lưu URL trong DB; thêm `ReviewImage(reviewId, url)` nếu cho phép đăng ảnh trong review.
