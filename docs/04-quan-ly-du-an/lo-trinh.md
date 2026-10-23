# Lộ trình phát triển

Trạng thái: ✅ xong · 🔄 đang làm · ⬜ chưa làm. Cập nhật mục tương ứng khi xong một việc (kèm ngày và bằng chứng trong repo). Chi tiết từng lần thay đổi: [nhat-ky-thay-doi.md](nhat-ky-thay-doi.md).

## Tổng quan

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 1 | Khởi tạo Expo + TypeScript + Expo Router + NativeWind | ✅ |
| 2 | Giao diện khám phá ban đầu (dữ liệu tĩnh) | ✅ |
| 3 | Backend nghiệp vụ: đặt chỗ, thanh toán giả lập, đánh giá, CSKH, thông báo | ✅ |
| 4 | Mô hình môi giới: chủ địa điểm, duyệt tin, hoa hồng, dashboard, hạn thanh toán | ✅ |
| 5 | Giao diện Web + Mobile theo đặc tả | 🔄 |
| 6 | Kết nối giao diện với API, trạng thái tải/lỗi | ⬜ |
| 7 | Kiểm thử đa nền tảng, build, triển khai | 🔄 (backend xong) |

## Giai đoạn 3 – Backend nghiệp vụ (✅ 21/10/2026)

- Schema 17 bảng theo tài liệu nghiệp vụ; migration `business_domain`.
- Xác thực JWT + bcrypt, phân quyền USER/STAFF/ADMIN, rate limit đăng nhập.
- Tìm kiếm/lọc/sắp xếp địa điểm; yêu thích; báo giá; đặt chỗ chống overbooking; thanh toán giả lập; hủy theo chính sách; đánh giá + kiểm duyệt; chat CSKH; thông báo.
- Dockerfile, docker-compose, seed, 26 test, Postman 83 request.

## Giai đoạn 4 – Mô hình môi giới (✅ 24/10/2026)

- Actor chủ địa điểm (`OWNER`): hồ sơ đối tác, admin duyệt, tạm ngưng.
- Tin đăng có kiểm duyệt (`DRAFT → PENDING_REVIEW → APPROVED/REJECTED`).
- Hoa hồng chụp lại trên booking; chủ xử lý booking tại cơ sở mình.
- Dashboard `GET /api/stats/overview` cho Admin và chủ địa điểm.
- Thanh toán giả lập có hạn 15 phút, tự hủy, kênh thanh toán.
- Đăng ký bắt buộc đồng ý điều khoản.
- 32 test, Postman 133 request / 194 assertion.

## Giai đoạn 5 – Giao diện Web + Mobile (🔄)

Thực hiện theo [frontend-web-mobile.md](../03-trien-khai/frontend-web-mobile.md) mục 6 và thứ tự đợt trong [giao-dien.md](../02-thiet-ke/giao-dien.md) mục 6.

| Việc | Trạng thái |
|---|---|
| Lớp gọi API, store đăng nhập, kiểu dữ liệu, `StateView` (bản tham khảo) | ✅ |
| `babel.config.js` cho NativeWind | ✅ |
| `_layout.tsx`: import `global.css`, `QueryClientProvider`, khôi phục đăng nhập | ⬜ |
| Breakpoint + `useBreakpoint` + design system nhỏ | ⬜ |
| 5 tab khách (native + web) | ⬜ |
| Đợt 1–3: khám phá, chi tiết, đăng nhập, đặt chỗ, cổng thanh toán | ⬜ |
| Đợt 4–6: đối tác, tin đăng, xử lý booking, dashboard | ⬜ |
| Đợt 7–8: CSKH, hồ sơ, quản trị còn lại | ⬜ |

**Tiêu chí hoàn thành:** chạy được luồng demo ở [kiem-thu.md](../03-trien-khai/kiem-thu.md) mục 4 trên Android và Web (375px, 1280px).

## Giai đoạn 7 – Kiểm thử, phát hành (🔄)

| Việc | Trạng thái |
|---|---|
| Unit + integration test backend | ✅ |
| Postman end-to-end | ✅ |
| Build production backend | ✅ |
| Build và chạy image Docker | ⬜ (Docker Desktop chưa bật) |
| Triển khai lên VPS / Render có HTTPS | ⬜ |
| `app.json`: `android.package`, `ios.bundleIdentifier`; `eas.json` | ⬜ |
| Web build + deploy | ⬜ |
| File `.apk` chạy trên điện thoại thật | ⬜ |

## Đề xuất sau đồ án (theo thứ tự giá trị)

1. **Đối soát và chuyển tiền cho đối tác** theo kỳ (bảng `Payout`), trang đối soát cho admin và chủ.
2. **Cổng thanh toán thật** (VNPay/MoMo sandbox): thay `payBooking` bằng tạo URL + xử lý IPN – xem [thanh-toan-gia-lap.md](../01-dac-ta/thanh-toan-gia-lap.md) mục 7.
3. **Tải ảnh lên** (Cloudinary/S3) cho avatar và tin đăng.
4. **Quên mật khẩu, xác thực email** khi đăng ký.
5. **Push notification** qua Expo cho booking mới (chủ) và xác nhận (khách).
6. **Chủ địa điểm trả lời đánh giá**; nhật ký thao tác quản trị.
7. **Giá theo mùa / ngày lễ**, đóng phòng theo ngày.
8. **Tìm kiếm không dấu** ("da lat" → "Đà Lạt").
9. **Chat thời gian thực** bằng WebSocket.
