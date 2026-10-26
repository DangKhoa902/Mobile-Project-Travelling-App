# Yêu cầu và chức năng frontend

Tài liệu bàn giao để làm frontend (`fe/`) ở một phiên làm việc mới mà không phải dò lại lịch sử. Backend đã xong và đã kiểm thử; tài liệu này nói **frontend phải làm gì, code hiện có ở trạng thái nào, quy ước nào bắt buộc và những lỗi đã biết**. Chi tiết từng trang, từng API, từng quy tắc nằm ở các tài liệu được dẫn link; khi có mâu thuẫn, tài liệu chuyên đề thắng tài liệu này.

Cập nhật: 25/10/2026 (frontend đã làm xong – xem mục 2).

## 0. Cách bắt đầu ở chat mới

Dán đoạn dưới vào tin nhắn đầu tiên của chat mới (mở trong thư mục gốc `Mobile-Project-Travelling-App`):

```text
Đọc docs/03-trien-khai/yeu-cau-frontend.md trước, rồi đọc các tài liệu nó dẫn khi cần.
Tôi muốn làm frontend theo tài liệu đó. Bắt đầu bằng Sprint 0 (mục 10), làm từng bước,
chạy `npx tsc --noEmit` và mở thử trên web sau mỗi bước. Không sửa backend (be/) trừ khi tôi yêu cầu.
```

Muốn làm một phần cụ thể thì thay câu cuối, ví dụ: *"Làm luồng đặt chỗ B1–B5 của thành viên B (mục 7)"*.

## 1. Mục tiêu và phạm vi

- **Một codebase Expo** chạy Android, iOS (nếu có máy Mac) và Web.
- Giao diện tiếng Việt cho 5 nhóm người dùng: khách vãng lai, khách hàng, chủ địa điểm (OWNER), nhân viên CSKH (STAFF), quản trị viên (ADMIN).
- Khách: **mobile trước**, web đầy đủ. Chủ địa điểm, Staff, Admin: **web trước**, mobile rút gọn.
- Dùng **toàn bộ API backend đã có**, không giả lập dữ liệu trong frontend (trừ khi đang chờ trang của thành viên khác).

| Tài liệu | Dùng khi |
|---|---|
| [../02-thiet-ke/giao-dien.md](../02-thiet-ke/giao-dien.md) | Đặc tả **từng trang**: route, nội dung, API, thao tác, trạng thái, mã trang (T1, B4, O3, M12...) |
| [frontend-web-mobile.md](frontend-web-mobile.md) | Cách làm **một giao diện cho cả Web và Mobile**; mục 7 = nối các chức năng mới của backend |
| [../02-thiet-ke/api.md](../02-thiet-ke/api.md) | Danh sách **endpoint**, body, quyền |
| [../01-dac-ta/luong-nghiep-vu.md](../01-dac-ta/luong-nghiep-vu.md) | Luồng nhiều trang, **xử lý token**, **bảng mã lỗi** (mục 12) |
| [../01-dac-ta/tai-khoan-va-dang-ky.md](../01-dac-ta/tai-khoan-va-dang-ky.md) | **Trường bắt buộc / tùy chọn** của mọi form |
| [../01-dac-ta/thanh-toan-gia-lap.md](../01-dac-ta/thanh-toan-gia-lap.md) | Cổng thanh toán giả lập (B5) |
| [../01-dac-ta/quy-tac-nghiep-vu.md](../01-dac-ta/quy-tac-nghiep-vu.md) | Quy tắc BR-01 → BR-27 (nút nào hiện khi nào) |

## 2. Hiện trạng `fe/`

Cập nhật 25/10/2026: **đã làm đủ các trang trong sitemap** ([giao-dien.md](../02-thiet-ke/giao-dien.md) mục 2), nối API thật. `npx tsc --noEmit` và `npx expo lint` sạch; `npx expo export` cho web và Android chạy được. Đã chạy thử trên web (375px, 800px, 1280px) luồng: đăng nhập → D2 → B1–B4 (voucher) → B5 thanh toán → B6; đăng ký; chủ tạo tin → gửi duyệt → admin duyệt; chat CSKH; dashboard chủ / admin; các trang quản trị. **Đã chạy trên Android Emulator (Pixel 9, Android 17) qua Expo Go:** đăng nhập, tab, D2 (♥), B1–B5 (lịch giá mùa, voucher, thanh toán thất bại / thành công), B6, hộp thoại hủy, tải ảnh đại diện (nén 1080×2424 → 712×1600), dashboard + booking của chủ. Chưa thử trên điện thoại thật, chưa thử push.

| Phần | File | Ghi chú |
|---|---|---|
| Khung | `app/_layout.tsx`, `app/(tabs)/_layout.tsx` | Stack gốc + provider; 5 tab dùng `Tabs` của Expo Router (thanh đáy trên mobile, thanh trái trên web ≥ 1024px) thay cho `NativeTabs` để có badge và chạy giống nhau trên web |
| Phiên đăng nhập | `store/auth-store.ts`, `services/api/client.ts`, `services/token-storage(.web).ts` | Đúng mục 5.3; thêm **cổng chờ**: lúc mở app, request (trừ đăng nhập / làm mới...) chờ khôi phục phiên xong rồi mới gửi để không gọi `/auth/refresh` hai lần |
| Gọi API | `services/<miền>.service.ts` | Mỗi file gồm hàm gọi API + hook TanStack Query của miền đó |
| UI dùng chung | `components/ui/` | `Button`, `Input`, `Card`/`InfoRow`/`Banner`, `Badge` theo trạng thái, `StateView`/`QueryState`, `Screen`, `Chip`/`Checkbox`/`RadioCard`/`Segmented`/`Stepper`/`Toggle`/`Stars`, `Dialog` (thay Alert – không chạy trên web), `DateField` (lịch tự vẽ, tô ngày giá mùa), `ImageUploader`, `ToastHost` |
| Khu quản lý | `components/layout/manage-shell.tsx`, `nav.ts`, `data-table.tsx` | Chặn vai trò, sidebar web, bảng (web) / thẻ (mobile), phân trang |
| Dùng chung chủ – admin | `components/booking/booking-detail.tsx`, `managed-booking-list.tsx`, `components/manage/destination-editor.tsx`, `payouts.tsx`, `components/support/chat-view.tsx` | B6/O7/M3, O6/M2, O3/M8, O8/M14, C2/M6 |
| Biểu đồ | `components/dashboard/widgets.tsx` | Cột chồng, thanh ngang vẽ bằng `View` – không thêm thư viện |
| Push | `services/push.ts` / `push.web.ts` | Đăng ký `/api/devices` sau đăng nhập; bỏ qua trên Expo Go và web; chạm push mở đúng trang (`utils/notification-link.ts`) |
| Ảnh | `services/upload.service.ts` | `expo-image-picker` → nén ≤ 1600px (`expo-image-manipulator`) → `POST /api/uploads` |
| Cấu hình | `app.json`, `tailwind.config.js` | `android.package` = `ios.bundleIdentifier` = `com.travellingapp.app`; `web.output: "single"`; plugin `expo-image-picker`, `expo-notifications`; Tailwind `darkMode: "class"` (tránh lỗi NativeWind trên web) |

**Thư viện đã thêm:** `expo-image-picker`, `expo-image-manipulator`, `expo-clipboard`, `expo-notifications` (cài bằng `npx expo install`).

**Lưu ý khi sửa tiếp:**

- File trong `app/` chỉ `export default` component trang; hàm / hằng dùng chung để ở `components/`, `utils/`.
- React Compiler đọc trước các thuộc tính truy cập trong closure: đừng viết `dialog.target!.id` trong `onConfirm` (target đang `null` sẽ làm trang trắng). Gán `const target = dialog.target; if (!target) return;` rồi mới dùng.
- Android (edge-to-edge): `KeyboardAvoidingView` phải dùng `behavior="padding"` cả trên Android; `Modal` cần `statusBarTranslucent navigationBarTranslucent` để nền tối phủ kín; màu chữ của `<Link>` không ăn `className` trên Android – bọc `<Text>` bên trong.
- Chạy trên emulator: `npx expo start` (không dùng `--localhost`: Metro chỉ nghe IPv6 `[::1]`), `adb reverse tcp:8081 tcp:8081` và `adb reverse tcp:3000 tcp:3000`, mở `exp://127.0.0.1:8081` trong Expo Go.
- Không `setState` trực tiếp trong `useEffect` (lint `react-hooks/set-state-in-effect`); dùng mẫu "so với giá trị trước trong state" như `dialog.tsx`, `destination-editor.tsx`.

## 3. Chạy môi trường

Máy dev hiện tại: **Windows, Node 24, MariaDB chạy local cổng 3306**.

```bash
# Terminal 1 – backend
cd be
npm install
npm run db:deploy
npm run db:seed
npm run dev                   # http://localhost:3000 — GET /health phải trả database: connected
```

```bash
# Terminal 2 – frontend
cd fe
npm install
npm run web                   # trình duyệt
npm run android               # emulator / Expo Go
```

| Môi trường | Địa chỉ API frontend dùng |
|---|---|
| Web, iOS Simulator | `http://localhost:3000/api` |
| Android Emulator | `http://10.0.2.2:3000/api` |
| Điện thoại thật qua Expo Go | IP máy tính đang chạy Metro (cùng Wi-Fi), tự lấy trong `config/env.ts` |
| Bản build / deploy | Bắt buộc đặt `EXPO_PUBLIC_API_URL` (HTTPS) |

**Tài khoản demo** (mật khẩu `Password123`):

| Email | Vai trò | Dùng để thử |
|---|---|---|
| `user@travelling.app` | USER | Đặt chỗ, có 1 chuyến đã hoàn thành + đánh giá |
| `owner1@travelling.app` | OWNER | Chủ Đà Lạt, Sa Pa, Hạ Long (hoa hồng 15%); phòng Deluxe Đà Lạt có giá Tết |
| `owner2@travelling.app` | OWNER | Chủ Mỹ Khê, Phú Quốc (12%) |
| `partner.pending@travelling.app` | USER | Hồ sơ đối tác đang chờ duyệt |
| `staff@travelling.app` | STAFF | CSKH, kiểm duyệt đánh giá |
| `admin@travelling.app` | ADMIN | Dashboard, duyệt, đối soát, nhật ký |

Voucher thử: `WELCOME10`. Email chạy chế độ `console`: link xác thực / đặt lại mật khẩu **in ra log của backend**, và response trả kèm `devVerificationToken` / `devResetToken`.

## 4. Quy ước bắt buộc

1. **Expo SDK 57 thay đổi nhiều so với kiến thức cũ.** Trước khi dùng API Expo nào, đọc `fe/AGENTS.md` và tài liệu đúng phiên bản (`https://docs.expo.dev/versions/v57.0.0/`). Cài thư viện bằng `npx expo install <tên>`, không dùng `npm install` cho thư viện Expo/React Native.
2. **Route nằm trong `fe/src/app/`** (Expo Router, file = trang, `_layout.tsx` = khung điều hướng). Component, hook, service để ngoài `app/`. `typedRoutes` đang bật: dùng `router.push("/booking/options")` sẽ được kiểm tra kiểu.
3. **Không tạo hay sửa thư mục `ios/`, `android/`.** Cấu hình native qua `app.json` và config plugin.
4. **Styling bằng NativeWind v4** (`className`). Màu dùng token trong `tailwind.config.js` (`brand`, `surface`, `muted`, `accent`, `danger`), không viết mã màu rải rác. Không chép cấu hình NativeWind v5.
5. **Tên file kebab-case** (`destination-card.tsx`, `use-breakpoint.ts`), import bằng alias `@/` (`@/components/...`, `@/assets/...`).
6. **Mọi chữ hiển thị bằng tiếng Việt.** Thông báo lỗi lấy `message` từ API (backend đã viết tiếng Việt); quyết định xử lý dựa vào `code`.
7. **Mọi màn có gọi API phải có 3 trạng thái** đang tải / rỗng / lỗi.
8. **Không gọi Axios trực tiếp trong component.** Component → hook TanStack Query → hàm service → `apiClient`.
9. **React Compiler đang bật** (`app.json` → `experiments.reactCompiler`): không cần `useMemo`/`useCallback` thủ công cho hiệu năng.
10. Sau mỗi bước: `npx tsc --noEmit` và `npx expo lint` sạch; mở thử ở web 375px và 1280px.

## 5. Kiến trúc frontend

### 5.1. Thư mục

```text
fe/src/
├── app/                      Route — sitemap đầy đủ ở giao-dien.md mục 2
│   ├── _layout.tsx           Stack gốc + provider
│   ├── (tabs)/               5 tab khách
│   ├── (auth)/               A1–A5
│   ├── booking/              B1–B5
│   ├── owner/                O1–O8 (layout riêng, chặn role OWNER)
│   └── admin/                M1–M15 (layout riêng, chặn STAFF/ADMIN)
├── components/
│   ├── ui/                   Button, Input, Card, Badge, StateView, Screen, Price
│   ├── layout/               Sidebar, DataTable, StatCard (khu owner/admin)
│   └── <nhóm>/               explore/, booking/, partner/, dashboard/, support/...
├── hooks/                    use-breakpoint, use-theme...
├── services/                 api/client.ts, token-storage(.web).ts, <miền>.service.ts
├── store/                    auth-store.ts, booking-draft-store.ts
├── types/                    api.ts + kiểu theo miền
├── config/env.ts
└── utils/format.ts
```

### 5.2. Dữ liệu

| Loại state | Công cụ | Ví dụ |
|---|---|---|
| Dữ liệu từ API | TanStack Query, `queryKey` theo miền | `['destinations', filters]`, `['bookings', scope, status]`, `['notifications']`, `['manage', ...]`, `['stats', range]`, `['payouts', ...]` |
| Phiên đăng nhập | Zustand `auth-store` | `user`, `status`, `login`, `logout`, `refresh` |
| Nháp đặt chỗ B1–B4 | Zustand `booking-draft-store` | gói, phòng, ngày, khách, dịch vụ, liên hệ, voucher |
| Trạng thái một màn | `useState` | ô đang nhập, tab đang chọn |

Sau mỗi thao tác ghi, làm mới đúng các query liên quan ([luong-nghiep-vu.md](../01-dac-ta/luong-nghiep-vu.md) mục 1.4). Khi đăng xuất: `queryClient.clear()`.

### 5.3. Đăng nhập và làm mới token (bắt buộc làm đúng)

Backend: access token sống **15 phút**, refresh token **30 ngày**, refresh token **xoay vòng** (mỗi lần dùng bị thay bằng token mới).

1. Đăng nhập / đăng ký / làm mới / đổi mật khẩu đều trả `{ user?, accessToken, token, refreshToken, refreshTokenExpiresAt, sessionId }`. Lưu `accessToken` + `refreshToken` vào `token-storage` (mobile: SecureStore; web: localStorage).
2. **Mở app:** có `refreshToken` → `POST /api/auth/refresh` → lưu cặp mới → `GET /api/auth/me` lấy `user` → "đã đăng nhập". Lỗi → xóa token → "khách".
3. **Interceptor 401** trong `client.ts`: khi một request (không phải `/auth/*`) trả 401 → gọi `/auth/refresh` **một lần duy nhất** (các request khác cùng chờ một promise) → lưu token mới → gửi lại request ban đầu. Refresh lỗi → đăng xuất.
4. `REFRESH_TOKEN_ROTATED` (401) = request khác vừa làm mới trước: dùng token mới nhất trong store, không đăng xuất.
5. **Đổi mật khẩu** (`PATCH /auth/me/password`) trả phiên mới: phải lưu lại, nếu không thiết bị này bị đăng xuất.
6. **Đăng xuất:** `POST /api/auth/logout { refreshToken }` → `DELETE /api/devices { token }` (nếu đã đăng ký push) → xóa token → `queryClient.clear()`.
7. Gửi `deviceName` khi đăng nhập (`expo-device`: `Device.modelName`; web: `"Trình duyệt"`).

### 5.4. Gọi API – những điểm dễ sai

| Điểm | Đúng |
|---|---|
| Response một đối tượng | `response.data.data` |
| Response danh sách | `{ data: [...], meta: { page, limit, total, totalPages } }` — cuộn vô hạn dùng `useInfiniteQuery` với `meta.totalPages` |
| Lỗi | `{ code, message, details? }`; `VALIDATION_ERROR` có `details[].path` → hiện lỗi dưới đúng ô |
| Ngày | Gửi chuỗi `YYYY-MM-DD` (ngày ở, kỳ thống kê); hiển thị bằng `formatDate` (không dùng `new Date(...)` cho cột DATE vì lệch múi giờ) |
| Tiền | Số nguyên VNĐ, hiển thị bằng `formatVnd`; **không tự tính tổng tiền** ở frontend — luôn lấy từ `/bookings/quote` |
| Danh sách booking | Khách: `?scope=mine`; chủ / staff mặc định `scope=managed` |
| Upload ảnh | `FormData` với `file` + `purpose`, **không tự đặt header `Content-Type`** |
| Giới hạn | Đăng nhập / đăng ký / quên mật khẩu: 20 lần / 15 phút / IP — test nhiều quá thì khởi động lại backend |

## 6. Danh sách màn hình

Đặc tả đầy đủ ở [giao-dien.md](../02-thiet-ke/giao-dien.md). Tóm tắt (MVP = bắt buộc để demo):

| Nhóm | Trang | Ưu tiên |
|---|---|---|
| Tab khách | T1 Khám phá · T2 Yêu thích · T3 Chuyến đi · T4 Hộp thư · T5 Tài khoản | MVP |
| Khám phá | D1 Tìm kiếm + lọc · D2 Chi tiết · D3 Tất cả đánh giá | MVP (D3: P2) |
| Tài khoản | A1 Đăng nhập · A2 Đăng ký | MVP |
| | A3 Quên mật khẩu · A4 Đặt mật khẩu mới · A5 Xác thực email | P2 |
| | P1 Sửa hồ sơ (ảnh đại diện) · P2 Đổi mật khẩu · P3 Đánh giá của tôi · P5 Thiết bị đăng nhập | P2–P3 |
| | P4 Trở thành đối tác | MVP |
| Đặt chỗ | B1 Gói + ngày + phòng · B2 Dịch vụ · B3 Liên hệ + voucher · B4 Xác nhận · B5 Cổng thanh toán giả lập · B6 Chi tiết booking · R1 Viết đánh giá (kèm ảnh) | MVP |
| CSKH | C1 Tạo yêu cầu · C2 Chat | P2 |
| Chủ địa điểm | O1 Dashboard · O2 Tin đăng · O3 Tạo/sửa tin (phòng, giá mùa, gói, dịch vụ, ảnh) · O6 Booking · O7 Xử lý booking | MVP |
| | O4 Trạng thái tin · O5 Hồ sơ đối tác · O8 Đối soát | P2 |
| Quản trị | M1 Dashboard · M2/M3 Booking · M4 Duyệt đánh giá · M12 Đối tác · M13 Duyệt tin | MVP |
| | M5/M6 CSKH · M7/M8 Địa điểm · M11 Người dùng · M14 Đối soát | P2 |
| | M9 Danh mục · M10 Voucher · M15 Nhật ký | P3 |

## 7. Phân công 3 thành viên

Chia theo luồng để ít sửa chung file. Mỗi người chỉ sửa route, component và service của mình; file dùng chung có một chủ (mục 10).

| | A – Khám phá, tài khoản, CSKH | B – Vòng đời booking | C – Đối tác, dashboard, quản trị |
|---|---|---|---|
| Trang | T1 D1 D2 D3 T2 A1–A5 T5 P1–P5 T4 C1 C2 M5 M6 | B1–B6 T3 R1 O6 O7 M2 M3 M4 | O1–O5 O8 M1 M7–M15 |
| Làm trước trên | Mobile | Mobile (khách), web (xử lý) | Web |
| Service | `destination.service.ts`, `auth.service.ts`, `support.service.ts`, `notification.service.ts` | `booking.service.ts`, `review.service.ts` | `partner.service.ts`, `manage.service.ts`, `stats.service.ts`, `payout.service.ts`, `admin.service.ts` |
| Dùng chung từ người khác | `startDraft()` của B (nút Đặt ngay ở D2) | `DataTable` của C (O6, M2); `ui/` của A | `ui/` của A; trang O6, M2, M4 của B, M5 của A trong sidebar |

**Hợp đồng chuyển trang giữa các thành viên** (chốt ở Sprint 0, không đổi tùy ý):

| Từ → Đến | Route / hàm |
|---|---|
| D2 (A) → B1 (B) | `useBookingDraft.getState().startDraft({ destinationId, packageId? })` rồi `router.push('/booking/options')` |
| B1 (B) → A1 (A) | `/login?redirect=/booking/options` |
| B6 (B) → C1 (A) | `/conversations/new?bookingId=12` |
| P3 (A) → R1 (B) | `/reviews/new?reviewId=5`; từ B6/T3: `/reviews/new?bookingId=12` |
| T4 (A) → trang theo `data` của thông báo | `bookingId` → `/bookings/:id` (khách) hoặc `/owner/bookings/:id` (OWNER); `conversationId` → `/conversations/:id`; `destinationId` → `/destinations/:slug` hoặc `/owner/destinations/:id/status`; `partnerProfileId` → `/admin/partners`; `payoutId` → `/owner/payouts` |
| T5 / P4 (A) → khu quản lý (C) | OWNER → `/owner`; STAFF/ADMIN → `/admin` |
| O3 (C) → D2 (A) | `/destinations/:slug` (xem trước tin chưa duyệt, có token chủ) |
| O1, M1 (C) → trang của B, A | `/owner/bookings?status=PENDING`, `/admin/bookings?status=PENDING`, `/admin/reviews`, `/admin/support` |

## 8. Yêu cầu chức năng

Mỗi dòng là một tiêu chí nghiệm thu. Chi tiết giao diện: trang tương ứng trong [giao-dien.md](../02-thiet-ke/giao-dien.md).

### 8.1. Khám phá (A)

- FR-01 T1 hiện danh mục, địa điểm nổi bật, phổ biến; mỗi khối có loading/lỗi riêng; kéo xuống tải lại.
- FR-02 D1 tìm theo từ khóa **không dấu** ("da lat" ra Đà Lạt), lọc danh mục, khu vực, khoảng giá, rating, tiện ích; sắp xếp; cuộn vô hạn; chờ 400 ms sau khi ngừng gõ mới gọi API.
- FR-03 D2 hiện ảnh, thông tin, tiện ích, gói, loại phòng (kèm giá mùa sắp tới), dịch vụ, bản đồ, chính sách, 5 đánh giá (có ảnh); 404 có trang riêng.
- FR-04 ♥ đổi ngay khi chạm, lỗi thì hoàn tác; chưa đăng nhập → A1 rồi quay lại D2.

### 8.2. Tài khoản (A)

- FR-05 A2 đăng ký đủ trường bắt buộc (họ tên, email, mật khẩu, nhập lại, đồng ý điều khoản); lỗi hiện dưới đúng ô; đăng ký xong là đăng nhập luôn.
- FR-06 A1 đăng nhập; quay về trang `redirect`; xử lý 401 / 403 bị khóa / 429.
- FR-07 Phiên đăng nhập theo mục 5.3; mở lại app vẫn đăng nhập trong 30 ngày.
- FR-08 A3–A5: quên mật khẩu, đặt mật khẩu mới từ link, xác thực email từ link; T5 hiện dải "Xác thực email" + Gửi lại khi chưa xác thực.
- FR-09 P1 đổi ảnh đại diện (chọn → nén → tải lên → lưu URL); P2 đổi mật khẩu (lưu phiên mới); P5 xem và đăng xuất từng thiết bị.
- FR-10 T5 hiện mục theo vai trò: Trở thành đối tác (USER), Quản lý cơ sở (OWNER), Quản trị (STAFF/ADMIN).
- FR-11 P4 nộp hồ sơ đối tác, hiện trạng thái hồ sơ (chờ / bị từ chối + nộp lại / đã duyệt → O1); chặn khi chưa xác thực email.

### 8.3. Hộp thư và CSKH (A)

- FR-12 T4 thông báo + badge chưa đọc trên tab; chạm thông báo mở đúng trang; đánh dấu đã đọc / đọc tất cả.
- FR-13 Push: sau đăng nhập xin quyền, đăng ký Expo push token với `/api/devices`; chạm push mở đúng trang; đăng xuất gỡ token. (Cần development build trên Android; Expo Go không nhận push từ SDK 53.)
- FR-14 C1 tạo yêu cầu hỗ trợ (gắn booking nếu có); C2 chat, poll tin mới mỗi 5 giây khi màn hình đang mở, dừng khi rời trang; hội thoại đóng thì khóa ô nhập. M5/M6 cho Staff.

### 8.4. Đặt chỗ và sau đặt (B)

- FR-15 B1–B3 lưu nháp trong `booking-draft-store`; mỗi lần đổi lựa chọn gọi `/bookings/quote` (debounce); hiện giá từng đêm khi có giá mùa; chặn ngày quá khứ, thiếu đêm, quá sức chứa, hết phòng; voucher báo lỗi dưới ô.
- FR-16 B4 hiện hóa đơn đúng số từ báo giá; nút Xác nhận khóa khi đang gửi; 409 hết phòng → về B1.
- FR-17 B5 cổng giả lập: đồng hồ đếm ngược tới `paymentDueAt`, chọn kênh Thẻ / Ví / Chuyển khoản, Thanh toán / Mô phỏng thất bại; **không có ô nhập số thẻ, CVV, OTP**; hết giờ hoặc `PAYMENT_EXPIRED` → Đặt lại. Trả tại nơi ở → "Chờ cơ sở xác nhận". Back không quay lại B4.
- FR-18 B6 nút theo trạng thái (thanh toán, hủy theo chính sách, đánh giá, liên hệ CSKH); T3 tab Sắp tới / Hoàn thành / Đã hủy.
- FR-19 R1 đánh giá 1–5 sao, nhận xét, tối đa 5 ảnh; thông báo "hiển thị sau khi duyệt".
- FR-20 O6/O7 (chủ) và M2/M3 (staff): bảng booking, xác nhận, hoàn thành, hủy bắt buộc lý do; O7 hiện hoa hồng và doanh thu của chủ. M4 duyệt / từ chối đánh giá (từ chối cần lý do).

### 8.5. Chủ địa điểm và quản trị (C)

- FR-21 Layout `owner/` và `admin/`: sidebar ở web ≥ 1024px, stack ở mobile; sai vai trò chuyển về T5.
- FR-22 O1 / M1 dashboard từ `/api/stats/overview`: chọn kỳ, thẻ chỉ số, biểu đồ doanh thu theo ngày, top địa điểm, việc cần xử lý (mỗi thẻ dẫn tới trang xử lý); O1 hiện tiền chưa đối soát / chờ chuyển.
- FR-23 O2 tin đăng + công tắc nhận khách; O3 form 4 tab (thông tin + ảnh, phòng + giá mùa, gói, dịch vụ), Lưu nháp / Xem trước / Gửi duyệt, checklist trước khi gửi; O4 trạng thái duyệt + lý do từ chối.
- FR-24 O5 hồ sơ đối tác (che số tài khoản); O8 đối soát (chỉ xem).
- FR-25 M12 duyệt / từ chối / tạm ngưng đối tác, đặt hoa hồng; M13 duyệt tin (xem trước + checklist).
- FR-26 M14 đối soát: xem trước theo kỳ, lập kỳ, xác nhận đã chuyển (mã giao dịch), hủy kỳ chưa chuyển.
- FR-27 M7–M11 quản lý địa điểm (gán chủ, nổi bật), danh mục, tiện ích, voucher, người dùng (khóa/mở, đổi vai trò trừ OWNER); M15 nhật ký có bộ lọc.

## 9. Yêu cầu phi chức năng

| Chủ đề | Yêu cầu |
|---|---|
| Responsive | Breakpoint `md: 768px`, `lg: 1024px` trong `tailwind.config.js`; kiểm tra ở 375px, 768px, 1280px ([frontend-web-mobile.md](frontend-web-mobile.md) mục 2–3) |
| Trạng thái | Loading / rỗng / lỗi ở mọi màn có API; lỗi mạng có nút Thử lại |
| Form | Lỗi dưới từng ô theo `details[].path`; nút gửi khóa khi đang gửi; bàn phím không che nút (`KeyboardAvoidingView`) |
| Bảo mật | Token chỉ trong SecureStore / localStorage, không log ra console; không lưu mật khẩu; xóa cache khi đăng xuất |
| Ảnh | Nén về cạnh dài ≤ 1600px trước khi tải; dùng `expo-image` với `contentFit="cover"` |
| Hiệu năng | Danh sách dài dùng `FlatList` / `FlashList`; `staleTime` 60 giây mặc định |
| Truy cập | Nút ≥ 44×44, có `accessibilityLabel` cho nút chỉ có icon |

## 10. Sprint 0 – việc làm đầu tiên

Làm theo thứ tự; mỗi bước xong thì typecheck và mở thử.

1. **`tailwind.config.js`**: thêm `screens: { md: "768px", lg: "1024px" }`.
2. **`src/app/_layout.tsx`**: `import "../../global.css"`; `QueryClientProvider` (`retry: 1`, `staleTime: 60_000`); gọi `useAuthStore.getState().hydrate()` một lần; `Stack` gốc chứa nhóm `(tabs)`.
3. **Cấu trúc route**: chuyển `index`, `favorites`, `bookings`, `inbox`, `profile` vào `src/app/(tabs)/` + `(tabs)/_layout.tsx` dùng `AppTabs`; xóa `explore.tsx`.
4. **`app-tabs.tsx` (native)**: 5 `NativeTabs.Trigger` (`index` Khám phá, `favorites` Yêu thích, `bookings` Chuyến đi, `inbox` Hộp thư, `profile` Tài khoản). Icon: `<NativeTabs.Trigger.Icon sf="heart" md="favorite" />` (SF Symbol cho iOS, Material cho Android) — kiểm tra lại prop trong `node_modules/expo-router/build/native-tabs/common/elements.d.ts`. **`app-tabs.web.tsx`**: 5 `TabTrigger` tương ứng.
5. **`types/api.ts`** cập nhật theo backend (mục 2, dòng `types/api.ts`).
6. **`token-storage`, `auth-store`, `client.ts`** theo mục 5.3.
7. **`components/ui/`**: `Button`, `Input` (có `error`), `Card`, `Badge`, `StateView`, `Screen`, `Price`.
8. **`hooks/use-breakpoint.ts`**, **`store/booking-draft-store.ts`** (có `startDraft`), **`owner/_layout.tsx`**, **`admin/_layout.tsx`** chặn vai trò.
9. **Trang tạm** cho mọi route trong sitemap (chỉ tiêu đề + mã trang) để link giữa các thành viên bấm được.
10. Xóa `navigator.tsx`, `stype/`, file template không dùng.

**Xong Sprint 0 khi:** `npm run web` và `npm run android` mở được 5 tab; đăng nhập `user@travelling.app` được; tắt mở lại app vẫn đăng nhập; bấm qua được mọi trang tạm.

## 11. Bẫy đã biết

| Triệu chứng | Nguyên nhân / cách xử lý |
|---|---|
| Trang chủ crash "No QueryClient set" | Chưa bọc `QueryClientProvider` trong `_layout.tsx` |
| `className` không có tác dụng | Thiếu `import "../../global.css"` ở `_layout.tsx`, hoặc đổi cấu hình mà chưa `npx expo start --clear` |
| Android emulator không gọi được API | Phải dùng `10.0.2.2`, không phải `localhost` (`config/env.ts` đã xử lý) |
| Điện thoại thật không gọi được API | Điện thoại và máy tính phải cùng Wi-Fi; tường lửa Windows cho phép cổng 3000 |
| Bị đăng xuất sau 15 phút | Chưa làm interceptor làm mới token (mục 5.3) |
| Đăng xuất ngẫu nhiên khi mở app | Nhiều request cùng gọi `/auth/refresh` → token bị coi là dùng lại. Chỉ được làm mới một lần cùng lúc |
| Upload trả 400 `INVALID_UPLOAD` | Tự đặt `Content-Type: multipart/form-data` làm mất boundary; để Axios tự đặt |
| Push không nhận trong Expo Go Android | Cần development build (`npx expo run:android` hoặc EAS) |
| Ngày hiển thị lệch một ngày | Cột DATE trả `2026-12-01T00:00:00.000Z`; cắt chuỗi bằng `formatDate`, đừng `new Date()` rồi format theo giờ máy |
| Thử đăng nhập nhiều bị 429 | Giới hạn 20 lần / 15 phút; khởi động lại backend để xóa bộ đếm |
| Import `@/components/Navigator` lỗi khi build Linux/EAS | Windows không phân biệt hoa thường; tên file thật là `navigator.tsx`. Luôn import đúng chữ thường |
| Link email không mở trang | Route phải đúng `/verify-email` và `/reset-password` (backend tạo link theo `APP_URL`) |
| Báo giá khác hóa đơn | Đừng tự tính tiền ở frontend; dùng `price` từ `/bookings/quote` |

## 12. Hoàn thành một trang khi

- [ ] Đúng đặc tả trong `giao-dien.md` (nội dung, API, nút theo trạng thái)
- [ ] Chạy đúng trên Android và web 375px / 1280px
- [ ] Có đang tải / rỗng / lỗi; lỗi validation dưới đúng ô
- [ ] Sai quyền / chưa đăng nhập chuyển đúng trang
- [ ] Chỉ sửa file của mình (file dùng chung có chủ file duyệt)
- [ ] `npx tsc --noEmit` và `npx expo lint` sạch
- [ ] Đi được bước tương ứng trong kịch bản demo ([kiem-thu.md](kiem-thu.md) mục 4)
