# Lộ trình phát triển

Trạng thái: ✅ xong · 🔄 đang làm · ⬜ chưa làm. Cập nhật mục tương ứng khi xong một việc (kèm ngày và bằng chứng trong repo). Chi tiết từng lần thay đổi: [nhat-ky-thay-doi.md](nhat-ky-thay-doi.md).

## Tổng quan

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 1 | Khởi tạo Expo + TypeScript + Expo Router + NativeWind | ✅ |
| 2 | Giao diện khám phá ban đầu (dữ liệu tĩnh) | ✅ |
| 3 | Backend nghiệp vụ: đặt chỗ, thanh toán giả lập, đánh giá, CSKH, thông báo | ✅ |
| 4 | Mô hình môi giới: chủ địa điểm, duyệt tin, hoa hồng, dashboard, hạn thanh toán | ✅ |
| 4b | Mở rộng: đối soát, giá mùa, refresh token, email, push, nhật ký, tìm không dấu, ảnh | ✅ |
| 5 | Giao diện Web + Mobile theo đặc tả | ✅ (25/10/2026) |
| 6 | Kết nối giao diện với API, trạng thái tải/lỗi | ✅ (25/10/2026) |
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

## Giai đoạn 4b – Mở rộng nền tảng (✅ 25/10/2026)

- Đối soát và chuyển tiền cho chủ địa điểm (`Payout`), giá theo mùa (`RoomRate`).
- Refresh token xoay vòng, quản lý thiết bị đăng nhập; xác thực email, quên / đặt lại mật khẩu.
- Push notification qua Expo (outbox), nhật ký quản trị, tìm kiếm không dấu, tải ảnh (local / S3) + ảnh trong đánh giá.
- 58 test, Postman 196 request / 299 assertion.

## Giai đoạn 5 – Giao diện Web + Mobile (✅ 25/10/2026)

Thực hiện theo [frontend-web-mobile.md](../03-trien-khai/frontend-web-mobile.md) mục 6 và thứ tự đợt trong [giao-dien.md](../02-thiet-ke/giao-dien.md) mục 6. Hiện trạng chi tiết: [yeu-cau-frontend.md](../03-trien-khai/yeu-cau-frontend.md) mục 2.

| Việc | Trạng thái |
|---|---|
| `_layout.tsx`: `global.css`, `QueryClientProvider`, khôi phục phiên (refresh token), toast, chạm push | ✅ |
| Breakpoint `md`/`lg`, `useBreakpoint`, bộ component `ui/` (Button, Input, Dialog, DateField, ImageUploader...) | ✅ |
| 5 tab khách: thanh đáy (mobile) / thanh trái (web ≥ 1024px), badge thông báo | ✅ |
| Đợt 1–3: khám phá, tìm kiếm + lọc, chi tiết, đăng nhập / đăng ký, đặt chỗ B1–B5, cổng thanh toán, B6 | ✅ |
| Đợt 4–6: đối tác P4, tin đăng O2–O4 (phòng, giá mùa, gói, dịch vụ, ảnh), xử lý booking O6/O7, M2/M3, M4, dashboard O1/M1 | ✅ |
| Đợt 7–9: chat C1/C2, M5/M6, hồ sơ P1–P5, D3, O5, O8, M7–M15, A3–A5 | ✅ |
| Kiểm tra: `tsc`, `expo lint`, `expo export` web + Android; chạy thử luồng đặt chỗ → thanh toán trên web 375px | ✅ |
| Chạy thử trên Android Emulator (Expo Go) | ✅ |
| Điện thoại thật, push trên development build | ⬜ |

**Tiêu chí hoàn thành:** chạy được luồng demo ở [kiem-thu.md](../03-trien-khai/kiem-thu.md) mục 4 trên Android và Web (375px, 1280px).

## Giai đoạn 7 – Kiểm thử, phát hành (🔄)

| Việc | Trạng thái |
|---|---|
| Unit + integration test backend | ✅ |
| Postman end-to-end | ✅ |
| Build production backend | ✅ |
| Build và chạy image Docker | ⬜ (Docker Desktop chưa bật) |
| Triển khai lên VPS / Render có HTTPS | ⬜ |
| `app.json`: `android.package`, `ios.bundleIdentifier` | ✅ |
| `eas.json` | ⬜ |
| Web build (`npx expo export --platform web` chạy được) | ✅ |
| Deploy web lên hosting | ⬜ |
| File `.apk` chạy trên điện thoại thật | ⬜ |

## Đề xuất sau đồ án (theo thứ tự giá trị)

1. **Cổng thanh toán thật** (VNPay/MoMo sandbox): thay `payBooking` bằng tạo URL + xử lý IPN – xem [thanh-toan-gia-lap.md](../01-dac-ta/thanh-toan-gia-lap.md) mục 7.
2. **Chủ địa điểm trả lời đánh giá.**
3. **Đóng phòng theo ngày**, phí hủy thay vì chặn hủy.
4. **Chat thời gian thực** bằng WebSocket.
5. **Xuất báo cáo CSV** cho dashboard và đối soát.
