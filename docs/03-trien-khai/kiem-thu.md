# Kiểm thử

Ba lớp kiểm thử, từ nhanh đến đầy đủ:

| Lớp | Công cụ | Vị trí | Cần DB | Kiểm tra gì |
|---|---|---|---|---|
| Unit | Vitest | `be/tests/unit/` | Không | Hàm thuần: tính giá, giảm giá, hoa hồng, máy trạng thái, chính sách hủy, ngày giờ VN, mã booking |
| Integration | Vitest + Supertest | `be/tests/integration/` | Không | Route trả đúng mã lỗi khi thiếu token, sai body, JSON hỏng, thiếu đồng ý điều khoản |
| End-to-end API | Postman CLI | `be/postman/travelling-app.postman_collection.json` | **Có** (sau khi seed) | Toàn bộ luồng nghiệp vụ trên server và DB thật |

Tài liệu gốc ghi Jest; dự án dùng **Vitest** vì chạy thẳng TypeScript + ESM không cần cấu hình thêm, API giống Jest (`describe`, `it`, `expect`).

## 1. Chạy unit + integration test

```bash
cd be
npm test
```

Kết quả hiện tại: **3 file, 32 test pass**. Biến môi trường cho test nằm trong `be/vitest.config.ts` (không cần file `.env`).

## 2. Chạy kiểm thử end-to-end

```bash
cd be
npm run db:seed
npm run dev
```

Ở terminal khác:

```bash
cd be
postman collection run postman/travelling-app.postman_collection.json
```

Kết quả hiện tại: **133 request, 194 assertion, 0 lỗi**. Có thể mở file collection bằng ứng dụng Postman để chạy từng request.

**Lưu ý giới hạn đăng nhập:** mỗi lần chạy dùng khoảng 10 lượt đăng nhập/đăng ký, giới hạn là 20 lượt / 15 phút / IP. Chạy collection 2 lần liên tiếp sẽ gặp 429; khởi động lại API (`npm run dev`) để xóa bộ đếm.

### Các nhóm trong collection

| Thư mục | Nội dung chính |
|---|---|
| 0. Setup | Health check; sinh ngày nhận/trả tương đối với hôm nay |
| 1. Auth | Đăng ký (thiếu điều khoản, trùng email, mật khẩu yếu), đăng nhập 5 vai trò, sửa hồ sơ |
| 2. Khám phá | Danh mục, nổi bật, tìm "Đà Lạt", lọc giá + tiện ích + sắp xếp, chi tiết theo slug, 404 |
| 3. Yêu thích | Toggle, `isFavorite`, danh sách, guest bị chặn |
| 4. Đặt chỗ | Phòng trống, báo giá + công thức, voucher sai, ngày quá khứ, quá sức chứa, thiếu đêm; tạo booking; BR-06, BR-10; thanh toán thất bại → thành công → trả lại; review sớm bị chặn; hủy + hoàn tiền |
| 5. Chống overbooking | Suite 2 phòng: đặt 2 lần OK, lần 3 → 409; hủy giải phóng phòng |
| 6. Thông báo | Đếm chưa đọc, đọc, đọc của người khác → 404 |
| 7. Đánh giá | Trùng booking, sửa → chờ duyệt, quyền kiểm duyệt, rating cập nhật |
| 8. CSKH | Mở hội thoại, quyền đọc, staff trả lời, đóng, gửi vào hội thoại đóng → 409 |
| 9. Admin | Phân quyền user/staff/admin, tạo địa điểm + phòng + gói, giá từ, ẩn, xóa, khóa tài khoản có hiệu lực ngay |
| 10. Đối tác & tin đăng | Nộp hồ sơ, duyệt thiếu ngân hàng → 409, bổ sung, duyệt → OWNER; tạo nháp, ẩn với khách, gửi duyệt thiếu gói → 400, chủ khác sửa → 403, từ chối → gửi lại → duyệt |
| 11. Booking tại địa điểm đối tác | Hoa hồng đúng tỷ lệ, chủ nhận thông báo, chỉ thấy booking của mình, chủ khác → 404, hủy thiếu lý do → 400, chủ xác nhận, hạn thanh toán ~15 phút, thanh toán qua ví |
| 12. Dashboard | User → 403, admin toàn sàn (30 ngày, tổng theo ngày = summary), owner chỉ cơ sở mình, khoảng ngày sai → 400, tạm ngưng đối tác ẩn tin |

### Kiểm thử hết hạn thanh toán

Postman không chờ được 15 phút, nên luồng quá hạn được kiểm thử bằng script gọi trực tiếp service: tạo booking online → giữ phòng (8 → 7 phòng trống) → lùi `paymentDueAt` về quá khứ → phòng trống trở lại 8 ngay → thanh toán trả `PAYMENT_EXPIRED` → `expireOverdueBookings()` hủy booking với lý do "Quá hạn thanh toán" và gửi thông báo. Có thể thử thủ công bằng cách đặt `PAYMENT_TIMEOUT_MINUTES=1` trong `be/.env`, đặt một booking online và chờ 1–2 phút.

## 3. Kiểm thử giao diện (thủ công)

Theo [frontend-web-mobile.md](frontend-web-mobile.md) mục 6. Với mỗi trang:

| Kiểm tra | Android | Web 375px | Web 1280px |
|---|---|---|---|
| Hiển thị đúng bố cục | ☐ | ☐ | ☐ |
| Loading / rỗng / lỗi (tắt API để thử lỗi) | ☐ | ☐ | ☐ |
| Lỗi validation hiện dưới đúng ô | ☐ | ☐ | ☐ |
| Quay lại / điều hướng đúng | ☐ | ☐ | ☐ |
| Sai quyền bị chuyển trang | ☐ | ☐ | ☐ |

## 4. Kịch bản demo trước giảng viên (khoảng 10 phút)

1. **Khách** (`user@travelling.app`): tìm "Đà Lạt" → chi tiết → đặt gói Premium + Deluxe + voucher `WELCOME10` → cổng giả lập, thanh toán bằng ví → booking đã xác nhận, có thông báo.
2. **Người muốn làm đối tác** (đăng ký mới): nộp hồ sơ đối tác.
3. **Admin** (`admin@travelling.app`): dashboard thấy 1 hồ sơ chờ duyệt → duyệt, đặt hoa hồng 10%.
4. **Đối tác mới**: tạo tin, thêm phòng và gói, gửi duyệt.
5. **Admin**: duyệt tin.
6. **Khách**: thấy tin mới, đặt "trả tại nơi ở".
7. **Đối tác**: nhận thông báo, xác nhận booking, xem dashboard thấy doanh thu sau hoa hồng.
8. **Staff** (`staff@travelling.app`): hoàn thành booking cũ → khách đánh giá → staff duyệt → rating cập nhật.
