# Kiểm thử

Ba lớp kiểm thử, từ nhanh đến đầy đủ:

| Lớp | Công cụ | Vị trí | Cần DB | Kiểm tra gì |
|---|---|---|---|---|
| Unit | Vitest | `be/tests/unit/` | Không | Hàm thuần: tính giá, giá mùa từng đêm, giảm giá, hoa hồng, máy trạng thái, chính sách hủy, ngày giờ VN, mã booking, bỏ dấu tìm kiếm, nhận dạng ảnh |
| Integration | Vitest + Supertest | `be/tests/integration/` | Không | Route trả đúng mã lỗi khi thiếu token, sai body, JSON hỏng, thiếu đồng ý điều khoản; `X-Request-Id` |
| End-to-end API | Postman CLI | `be/postman/travelling-app.postman_collection.json` | **Có** (sau khi seed) | Toàn bộ luồng nghiệp vụ trên server và DB thật |

Tài liệu gốc ghi Jest; dự án dùng **Vitest** vì chạy thẳng TypeScript + ESM không cần cấu hình thêm, API giống Jest (`describe`, `it`, `expect`).

## 1. Chạy unit + integration test

```bash
cd be
npm test
```

Kết quả hiện tại: **10 file, 126 test pass** (gồm test AI với Gemini giả lập, không gọi mạng). Biến môi trường cho test nằm trong `be/vitest.config.ts` (không cần file `.env`).

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

Kết quả hiện tại: **196 request, 299 assertion, 0 lỗi** (lần chạy đầu sau `db:seed`). Các lần chạy sau, nhóm 19 (đối soát) chỉ chạy phần đầu vì booking demo đã được đối soát ở lần trước; các bước còn lại tự bỏ qua (`skipRequest`), không báo lỗi. Muốn chạy đủ lại: seed vào một DB mới.

Collection cần chạy từ thư mục `be/` để tìm thấy file mẫu `postman/fixtures/*.png` của nhóm 17. Có thể mở file collection bằng ứng dụng Postman để chạy từng request.

**Lưu ý giới hạn đăng nhập:** mỗi lần chạy dùng khoảng 17 lượt đăng nhập/đăng ký/quên mật khẩu, giới hạn là 20 lượt / 15 phút / IP. Chạy collection 2 lần liên tiếp sẽ gặp 429; khởi động lại API (`npm run dev`) để xóa bộ đếm.

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
| 13. Phiên đăng nhập | Refresh xoay vòng, dùng lại token vừa xoay → `ROTATED`, danh sách phiên, đăng xuất, dùng token đã đăng xuất → `REUSED` |
| 14. Quên mật khẩu | Gửi link (email có/không tồn tại cùng kết quả), đặt lại, dùng lại link → 400, mật khẩu cũ hết hiệu lực, đổi mật khẩu trả phiên mới và thu hồi phiên cũ |
| 15. Giá theo mùa | Chủ khác → 403, tạo, trùng ngày → 409, ngày ngược → 400, báo giá áp giá mùa từng đêm, chi tiết có `rates`, sửa, xóa |
| 16. Tìm không dấu | "da lat" = "ĐÀ LẠT", tìm theo danh mục không dấu |
| 17. Tải ảnh | PNG thật → 201 và tải lại được qua URL; file giả ảnh → 400; khách tải ảnh địa điểm → 403; thiếu file → 400; gắn ảnh vào đánh giá; ảnh của người khác → 400 |
| 18. Thiết bị push | Đăng ký token, token sai → 400, danh sách, gỡ |
| 19. Đối soát | Chưa đối soát, xem trước (chỉ admin), kỳ chưa kết thúc → 400, lập kỳ, lập trùng → 409, chủ khác → 404, tổng booking = số tiền kỳ, hủy kỳ trả booking, lập lại, chuyển, chuyển lại → 409, hủy kỳ đã chuyển → 409, chủ nhận thông báo |
| 20. Nhật ký quản trị | User → 403, lọc theo hành động, đối tượng; có người thực hiện |

**Chưa kiểm thử với dịch vụ thật:** gửi email qua SMTP (mới chạy chế độ `console`), gửi push tới Expo (mới kiểm thử đăng ký thiết bị; job gửi chưa gọi Expo thật), lưu ảnh lên S3/R2 (mới chạy `local`).

### Kiểm thử hết hạn thanh toán

Postman không chờ được 15 phút, nên luồng quá hạn được kiểm thử bằng script gọi trực tiếp service: tạo booking online → giữ phòng (8 → 7 phòng trống) → lùi `paymentDueAt` về quá khứ → phòng trống trở lại 8 ngay → thanh toán trả `PAYMENT_EXPIRED` → `expireOverdueBookings()` hủy booking với lý do "Quá hạn thanh toán" và gửi thông báo. Có thể thử thủ công bằng cách đặt `PAYMENT_TIMEOUT_MINUTES=1` trong `be/.env`, đặt một booking online và chờ 1–2 phút.

## 3. Kiểm thử giao diện (thủ công)

Trước khi thử bằng tay, chạy trong `fe/`: `npm run typecheck`, `npm run lint`, `npm run build:web` (bắt lỗi bundle). Theo [frontend-web-mobile.md](frontend-web-mobile.md) mục 6. Với mỗi trang:

| Kiểm tra | Android | Web 375px | Web 1280px |
|---|---|---|---|
| Hiển thị đúng bố cục | ☐ | ☐ | ☐ |
| Loading / rỗng / lỗi (tắt API để thử lỗi) | ☐ | ☐ | ☐ |
| Lỗi validation hiện dưới đúng ô | ☐ | ☐ | ☐ |
| Quay lại / điều hướng đúng | ☐ | ☐ | ☐ |
| Sai quyền bị chuyển trang | ☐ | ☐ | ☐ |

### 3.1. Trợ lý AI CSKH (giai đoạn 1, thủ công)

Chuẩn bị: trong `be/.env` đặt `AI_ENABLED=true` và `GEMINI_API_KEY` là key thử lấy từ Google AI Studio, rồi chạy lại `npm run dev`. Không commit key vào git.

| Bước | Thao tác | Kết quả mong đợi |
|---|---|---|
| 1 | Đăng nhập `user@travelling.app`, mở Hộp thư → **+ Yêu cầu hỗ trợ** (C1) | Có dòng chú thích "Trợ lý AI sẽ trả lời ngay…" |
| 2 | Gửi nội dung "booking của tôi đã xác nhận chưa?" | Mở C2. Hiện "Trợ lý AI đang trả lời…", rồi xuất hiện tin AI có nhãn AI |
| 3 | Đọc nội dung tin AI | Nêu đúng trạng thái booking của khách; không có email, số điện thoại hay địa chỉ |
| 4 | Bấm **Gặp nhân viên** | Hiện dải "Đã chuyển nhân viên CSKH"; nút biến mất |
| 5 | Đăng nhập `staff@travelling.app`, mở M5, lọc **Chờ nhân viên** | Hội thoại vừa chuyển có trong danh sách, nhãn lý do `CUSTOMER_REQUEST` |
| 6 | Khách tạo hội thoại thứ hai (không bấm gặp nhân viên). Staff mở hội thoại đó trong M5 và gửi một tin | Hội thoại chuyển sang "Chờ nhân viên", nhãn `STAFF_TAKEOVER`; AI không trả lời tiếp |
| 7 | Đặt `AI_ENABLED=false`, chạy lại API, gọi `GET /api/ai/status` | Trả `enabled: false`; C1 không còn dòng chú thích AI |
| 8 | Khách tạo hội thoại mới | Hội thoại đi thẳng tới nhân viên (`handler = STAFF`), không có tin AI, hiện ngay ở lọc **Chờ nhân viên** |

### 3.2. Trợ lý tư vấn công khai (giai đoạn 2, thủ công)

Chuẩn bị như mục 3.1 (`AI_ENABLED=true`, có `GEMINI_API_KEY`). Dữ liệu demo phải đã chạy `npm run db:seed`.

| Bước | Thao tác | Kết quả mong đợi |
|---|---|---|
| 1 | Mở T1 (chưa đăng nhập hoặc đăng nhập đều được), chạm thẻ **Hỏi trợ lý AI** | Mở `/assistant` với lời chào và 3 câu hỏi mẫu |
| 2 | Hỏi "Đi Đà Lạt 2 người cuối tuần, ngân sách 3 triệu" | Trả lời tiếng Việt, gợi ý địa điểm phù hợp; dưới câu trả lời có thẻ **Đà Lạt Pine Hill Resort** |
| 3 | Chạm thẻ **Đà Lạt Pine Hill Resort** | Mở D2 đúng địa điểm đó |
| 4 | Bấm **Cuộc trò chuyện mới** | Lịch sử trên màn hình bị xóa, ô nhập trống |
| 5 | Gửi 21 câu hỏi trong 10 phút từ cùng một IP (mặc định `AI_PUBLIC_RATE_LIMIT=20`) | Câu thứ 21 báo "Bạn hỏi hơi nhanh, thử lại sau ít phút" |
| 6 | Đặt `AI_ENABLED=false`, chạy lại API, mở `/assistant` | Hiện trạng thái rỗng "Trợ lý tư vấn chưa được bật" kèm link tới tìm kiếm; T1 không còn thẻ **Hỏi trợ lý AI** |

Thông tin trong câu trả lời về giá và chính sách phải khớp với bước báo giá ở B1–B3. Nếu lệch, ghi lại câu hỏi và nội dung trả lời để sửa prompt hoặc tool.

### 3.3. Gợi ý và tóm tắt cho nhân viên (giai đoạn 3, thủ công)

Dùng hội thoại đang mở do khách tạo ở mục 3.1 (bước 2 trở đi).

| Bước | Thao tác | Kết quả mong đợi |
|---|---|---|
| 1 | Đăng nhập `staff@travelling.app`, mở M5 rồi mở hội thoại đang mở (`OPEN`) trong M6 | Có nút **Gợi ý trả lời** và **Tóm tắt** |
| 2 | Bấm **Gợi ý trả lời** | Ô nhập có nội dung gợi ý, chưa gửi; sửa được. Tin của khách không đổi, không có tin mới trong hội thoại |
| 3 | Bấm **Tóm tắt** | Card **Tóm tắt từ AI** được cập nhật, tối đa 5 dòng: vấn đề, thông tin đã có, đã làm gì, việc cần làm tiếp |
| 4 | Tải lại trang M6 | Card **Tóm tắt từ AI** vẫn còn (lưu trong `aiSummary`) |
| 5 | Đặt `AI_ENABLED=false`, chạy lại API, mở lại M6 | Hai nút không hiện. Nếu đang mở sẵn, bấm một nút sẽ nhận `AI_DISABLED` và hai nút biến mất |

## 4. Kịch bản demo trước giảng viên (khoảng 10 phút)

1. **Khách** (`user@travelling.app`): tìm "Đà Lạt" → chi tiết → đặt gói Premium + Deluxe + voucher `WELCOME10` → cổng giả lập, thanh toán bằng ví → booking đã xác nhận, có thông báo.
2. **Người muốn làm đối tác** (đăng ký mới): nộp hồ sơ đối tác.
3. **Admin** (`admin@travelling.app`): dashboard thấy 1 hồ sơ chờ duyệt → duyệt, đặt hoa hồng 10%.
4. **Đối tác mới**: tạo tin, thêm phòng và gói, gửi duyệt.
5. **Admin**: duyệt tin.
6. **Khách**: thấy tin mới, đặt "trả tại nơi ở".
7. **Đối tác**: nhận thông báo, xác nhận booking, xem dashboard thấy doanh thu sau hoa hồng.
8. **Staff** (`staff@travelling.app`): hoàn thành booking cũ → khách đánh giá (kèm ảnh) → staff duyệt → rating cập nhật.
9. **Admin**: đối soát tháng trước cho chủ địa điểm → xác nhận đã chuyển → chủ thấy thông báo và kỳ "Đã chuyển"; mở nhật ký thấy toàn bộ thao tác vừa làm.
