# Quy tắc nghiệp vụ

BR-01 → BR-10 lấy từ tài liệu gốc. BR-11 → BR-20 bổ sung khi thêm chủ địa điểm, hoa hồng, hạn thanh toán và dashboard. Cột **Thực thi tại** chỉ chỗ code đảm bảo quy tắc, để khi sửa biết phải sửa ở đâu.

## Tài khoản và phân quyền

| Mã | Quy tắc | Thực thi tại |
|---|---|---|
| BR-01 | Phải đăng nhập để yêu thích, đặt chỗ, đánh giá, chat CSKH. Khách vãng lai vẫn xem được báo giá. | Middleware `authenticate` trên các router; `POST /bookings/quote` để công khai |
| BR-09 | Mật khẩu được hash bằng bcrypt, không lưu và không trả về plaintext. | `auth.service.ts`, `publicUserSelect` không có `password` |
| BR-10 | Người dùng không xem/sửa dữ liệu của người khác. Truy cập dữ liệu không phải của mình trả **404** (không phải 403) để không lộ dữ liệu có tồn tại. | `getAccessibleBooking`, lọc theo `userId` trong mọi truy vấn của USER |
| BR-11 | Khóa tài khoản hoặc đổi vai trò có hiệu lực **ngay**, kể cả khi người đó đang đăng nhập. | `resolveUser` đọc lại user từ DB ở mỗi request |
| BR-12 | Tài khoản trở thành chủ địa điểm **chỉ qua hồ sơ đối tác được admin duyệt**. Không đổi role `OWNER` trực tiếp ở trang quản lý người dùng. | `partner.routes.ts`; `PATCH /users/:id/role` chặn OWNER |
| BR-13 | Hồ sơ đối tác chỉ được duyệt khi có đủ tài khoản ngân hàng nhận tiền. | `PATCH /partners/:id/review` → 409 `PARTNER_BANK_REQUIRED` |

## Địa điểm và tin đăng

| Mã | Quy tắc | Thực thi tại |
|---|---|---|
| BR-14 | Chủ địa điểm chỉ quản lý **địa điểm của mình** và gói/phòng/dịch vụ thuộc địa điểm đó. | `assertCanManageDestination` (`access.service.ts`) |
| BR-15 | Khách chỉ thấy và đặt được địa điểm **đã duyệt** (`listingStatus = APPROVED`) và **đang hoạt động** (`isActive = true`). Chủ và Staff/Admin xem trước được tin chưa duyệt. | `buildDestinationWhere`, route chi tiết, `buildQuote` |
| BR-16 | Tin chỉ được gửi duyệt khi có ít nhất 1 gói và 1 loại phòng đang bán. Chỉ gửi được tin `DRAFT` hoặc `REJECTED`. Từ chối phải có lý do. | `submitListing`, `reviewListing` |
| BR-17 | Tin đã duyệt vẫn hiển thị khi chủ sửa nội dung (không phải duyệt lại); admin ẩn được nếu vi phạm. Chủ không tự đánh dấu "nổi bật" và không xóa được tin đã duyệt. | `updateDestination`, route `DELETE` |
| BR-18 | Tạm ngưng đối tác thì mọi địa điểm của họ bị ẩn và họ mất quyền quản lý. | `PATCH /partners/:id/status` |

## Đặt chỗ và thanh toán

| Mã | Quy tắc | Thực thi tại |
|---|---|---|
| BR-03 | Mỗi người chỉ yêu thích một địa điểm một lần. | Khóa chính `Favorite(userId, destinationId)` |
| BR-04 | Không đặt vượt số phòng còn trống. Phòng trống tính theo **từng đêm**; khóa dòng loại phòng khi đặt để tránh hai người lấy phòng cuối. | `getAvailableRooms`, `SELECT ... FOR UPDATE` trong `createBooking` |
| BR-05 | Booking có trạng thái rõ ràng: `PENDING → CONFIRMED → COMPLETED`, hoặc `→ CANCELLED`. | Enum + `canTransition` (`booking-rules.ts`) |
| BR-06 | Booking thanh toán online chỉ được xác nhận khi đã thanh toán. Booking trả tại nơi ở do chủ địa điểm hoặc Staff xác nhận. | `updateBookingStatus` → 409 `PAYMENT_REQUIRED` |
| BR-07 | Khách tự hủy: booking `PENDING` trước giờ nhận phòng; booking `CONFIRMED` khi còn ≥ số giờ hủy miễn phí của gói. Hủy booking đã thanh toán thì hoàn tiền. | `checkCustomerCancellation`, `cancelBooking` |
| BR-19 | Booking thanh toán online phải được thanh toán trong **15 phút** (cấu hình `PAYMENT_TIMEOUT_MINUTES`). Quá hạn: không còn giữ phòng, không thanh toán được nữa, và tự hủy. | `paymentDueAt`; `findOverlapping`; `payBooking` → 409 `PAYMENT_EXPIRED`; job `expireOverdueBookings` |
| BR-20 | Chủ địa điểm hoặc Staff hủy booking của khách **phải ghi lý do**; khách và chủ đều được thông báo. | `cancelBooking` → 400 `CANCEL_REASON_REQUIRED` |
| — | Giá, hoa hồng, thuế được **chụp lại trên booking** lúc đặt; sửa bảng giá hay tỷ lệ hoa hồng sau đó không làm đổi booking cũ. | Các cột giá + `commissionRate/Amount`, `ownerRevenue` của `Booking` |

## Đánh giá

| Mã | Quy tắc | Thực thi tại |
|---|---|---|
| BR-02 | Chỉ đánh giá sau khi booking liên quan đã `COMPLETED`. | `createReview` → 409 `BOOKING_NOT_COMPLETED` |
| BR-08 | Mỗi booking một đánh giá; sửa đánh giá sẽ đưa về chờ duyệt lại. | `Review.bookingId` UNIQUE; `updateReview` |
| — | Chỉ đánh giá đã duyệt mới hiển thị và được tính vào điểm trung bình. Từ chối phải có lý do. | `refreshDestinationRating`, `moderateReview` |

## Thống kê

| Quy tắc | Thực thi tại |
|---|---|
| Doanh thu chỉ tính booking `CONFIRMED` và `COMPLETED`, theo **ngày tạo booking** (giờ Việt Nam). | `stats.service.ts` (`REVENUE_STATUSES`) |
| Admin xem số liệu toàn sàn; chủ địa điểm chỉ xem số liệu địa điểm của mình. | `getOverview` theo `user.role` |
