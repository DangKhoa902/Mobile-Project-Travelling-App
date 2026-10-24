# Quy tắc nghiệp vụ

BR-01 → BR-10 lấy từ tài liệu gốc. BR-11 → BR-20 bổ sung khi thêm chủ địa điểm, hoa hồng, hạn thanh toán và dashboard; BR-21 → BR-27 khi thêm phiên đăng nhập, email, giá mùa, đối soát, nhật ký, ảnh, tìm không dấu. Cột **Thực thi tại** chỉ chỗ code đảm bảo quy tắc, để khi sửa biết phải sửa ở đâu.

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

## Đối soát, giá mùa, tài khoản (bổ sung 25/10/2026)

| Mã | Quy tắc | Thực thi tại |
|---|---|---|
| BR-21 | Access token sống 15 phút; refresh token 30 ngày, **xoay vòng** mỗi lần dùng. Dùng lại token đã xoay (sau 30 giây) = nghi bị đánh cắp → thu hồi mọi phiên của tài khoản. Đổi / đặt lại mật khẩu hoặc bị khóa → thu hồi mọi phiên. | `session.service.ts`, `user.routes.ts` |
| BR-22 | Phải xác thực email trước khi nộp hồ sơ đối tác. Link xác thực hiệu lực 24 giờ, link đặt lại mật khẩu 30 phút, dùng một lần; tạo link mới thì link cũ hết hiệu lực. "Quên mật khẩu" luôn trả cùng một thông báo dù email có tồn tại hay không. | `verification.service.ts`, `partner.routes.ts` |
| BR-23 | Giá mùa ghi đè giá phòng cho từng đêm trong khoảng (gồm ngày đầu và cuối); các khoảng của một loại phòng không chồng ngày. Giá chụp lại trên booking như cũ. | `nightlyRoomPrices` (`pricing.ts`), `catalog.routes.ts` |
| BR-24 | Đối soát chỉ gom booking `COMPLETED`, đã thu tiền, chưa thuộc kỳ nào, hoàn thành trong kỳ đã kết thúc. Một booking thuộc tối đa một kỳ. Chỉ hủy được kỳ chưa chuyển tiền; kỳ đã chuyển không sửa. Chủ phải có tài khoản ngân hàng. | `payout.service.ts` |
| BR-25 | Ghi nhật ký cho: khóa/mở tài khoản, đổi quyền, duyệt/từ chối/tạm ngưng đối tác, đổi hoa hồng, duyệt/từ chối tin đăng và đánh giá, chủ/staff xác nhận/hoàn thành/hủy booking, đổi giá gói/phòng, tạo/sửa/xóa giá mùa, tạo/sửa voucher, lập/chuyển/hủy kỳ đối soát. Chỉ ADMIN xem nhật ký. | `audit.service.ts` |
| BR-26 | Ảnh chỉ nhận JPEG/PNG/WebP (kiểm tra chữ ký file, không tin đuôi file), tối đa 5 MB. Ảnh địa điểm chỉ chủ địa điểm/admin tải. Ảnh đính kèm đánh giá (tối đa 5) phải do chính người viết tải lên. | `storage.ts`, `upload.routes.ts`, `review.service.ts` |
| BR-27 | Tìm kiếm không phân biệt dấu và hoa/thường trên tên, khu vực, địa chỉ, danh mục. | `Destination.searchText`, `destination.dao.ts` |

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
