# Đặc tả các trang giao diện

Tài liệu này liệt kê các trang cần có cho Travelling App và nghiệp vụ của từng trang: trang dùng để làm gì, hiển thị gì, gọi API nào, người dùng thao tác gì và hệ thống phản hồi ra sao. Các API đều đã có trong backend (`be/src/routes`); trang nào cần API chưa có sẽ được ghi rõ.

Luồng nghiệp vụ xuyên nhiều trang (đặt chỗ, thanh toán, hủy, đánh giá...) và danh sách mã lỗi nằm ở [business-flows.md](business-flows.md).

## 1. Cách đọc tài liệu

Mỗi trang được mô tả theo cùng một khung:

| Mục | Nội dung |
|---|---|
| **Route** | File trong `fe/src/app/` (Expo Router) |
| **Ai dùng** | Guest (chưa đăng nhập), User, Staff, Admin |
| **Ưu tiên** | **MVP**: bắt buộc để demo luồng chính · **P2**: nên có · **P3**: mở rộng |
| **Hiển thị** | Thành phần trên màn hình |
| **API** | Endpoint backend cần gọi |
| **Thao tác** | Hành động của người dùng → kết quả |
| **Trạng thái** | Loading / rỗng / lỗi cần xử lý |
| **Quy tắc** | Business rule áp dụng (BR-xx trong `docs/Mô tả hệ thống.docx`) |

Mọi trang có gọi API đều phải có đủ 3 trạng thái **đang tải, rỗng, lỗi** (Definition of Done trong `Mobile_Project_Full_Development_Guide.md`).

## 2. Sơ đồ trang (sitemap)

```text
fe/src/app/
├── _layout.tsx                      Stack gốc: provider, khôi phục phiên đăng nhập
│
├── (tabs)/                          5 tab chính
│   ├── _layout.tsx
│   ├── index.tsx                    T1  Khám phá (trang chủ)
│   ├── favorites.tsx                T2  Yêu thích
│   ├── bookings.tsx                 T3  Chuyến đi của tôi
│   ├── inbox.tsx                    T4  Hộp thư (thông báo + chat CSKH)
│   └── profile.tsx                  T5  Tài khoản
│
├── (auth)/
│   ├── login.tsx                    A1  Đăng nhập
│   └── register.tsx                 A2  Đăng ký
│
├── search.tsx                       D1  Kết quả tìm kiếm + bộ lọc
├── destinations/
│   ├── [slug].tsx                   D2  Chi tiết địa điểm
│   └── [slug]/reviews.tsx           D3  Tất cả đánh giá
│
├── booking/                         Luồng đặt chỗ nhiều bước
│   ├── _layout.tsx                  (Stack + thanh tiến trình bước 1/4)
│   ├── options.tsx                  B1  Chọn gói, ngày, phòng, số khách
│   ├── services.tsx                 B2  Chọn dịch vụ bổ sung
│   ├── contact.tsx                  B3  Thông tin liên hệ + voucher + phương thức thanh toán
│   ├── review.tsx                   B4  Xác nhận đơn
│   └── result.tsx                   B5  Kết quả đặt chỗ / thanh toán
│
├── bookings/[id].tsx                B6  Chi tiết booking (thanh toán, hủy, đánh giá)
├── reviews/new.tsx                  R1  Viết / sửa đánh giá
├── conversations/
│   ├── new.tsx                      C1  Tạo yêu cầu hỗ trợ
│   └── [id].tsx                     C2  Màn hình chat
│
├── profile/
│   ├── edit.tsx                     P1  Sửa hồ sơ
│   ├── password.tsx                 P2  Đổi mật khẩu
│   └── reviews.tsx                  P3  Đánh giá của tôi
│
└── admin/                           Khu quản trị (ưu tiên chạy trên Web)
    ├── _layout.tsx                  Chặn theo role STAFF/ADMIN, sidebar
    ├── index.tsx                    M1  Tổng quan
    ├── bookings/index.tsx           M2  Quản lý booking
    ├── bookings/[id].tsx            M3  Xử lý booking
    ├── reviews.tsx                  M4  Kiểm duyệt đánh giá
    ├── support/index.tsx            M5  Hàng đợi CSKH
    ├── support/[id].tsx             M6  Trả lời khách
    ├── destinations/index.tsx       M7  Danh sách địa điểm          (ADMIN)
    ├── destinations/[id].tsx        M8  Thêm / sửa địa điểm, gói, phòng, dịch vụ (ADMIN)
    ├── catalog.tsx                  M9  Danh mục & tiện ích         (ADMIN)
    ├── vouchers.tsx                 M10 Mã giảm giá                 (ADMIN)
    └── users.tsx                    M11 Quản lý người dùng
```

Nhóm `(tabs)` và `(auth)` trong ngoặc là route group của Expo Router: không xuất hiện trong URL, chỉ để gom layout.

### Điều hướng tổng quát

```mermaid
flowchart LR
    T1[T1 Khám phá] -->|tìm kiếm| D1[D1 Tìm kiếm]
    T1 -->|chọn thẻ| D2[D2 Chi tiết địa điểm]
    D1 --> D2
    T2[T2 Yêu thích] --> D2
    D2 -->|Đặt ngay| B1[B1 Chọn gói & phòng]
    B1 --> B2[B2 Dịch vụ] --> B3[B3 Liên hệ] --> B4[B4 Xác nhận] --> B5[B5 Kết quả]
    B5 --> B6[B6 Chi tiết booking]
    T3[T3 Chuyến đi] --> B6
    B6 -->|đã hoàn thành| R1[R1 Viết đánh giá]
    B6 -->|cần hỗ trợ| C1[C1 Tạo yêu cầu]
    T4[T4 Hộp thư] --> C2[C2 Chat]
    T4 -->|thông báo booking| B6
    D2 -.->|chưa đăng nhập| A1[A1 Đăng nhập]
    B1 -.->|chưa đăng nhập| A1
```

## 3. Trang dành cho khách (Guest / User)

### T1 – Khám phá (trang chủ)

- **Route:** `(tabs)/index.tsx` · **Ai dùng:** tất cả · **Ưu tiên:** MVP
- **Mục đích:** điểm bắt đầu khám phá; hiển thị nội dung theo mục 5 – Bước 1 của tài liệu nghiệp vụ.

**Hiển thị**

1. Lời chào (có tên nếu đã đăng nhập).
2. Ô tìm kiếm (chạm vào → mở D1).
3. Danh mục dạng chip cuộn ngang: Biển, Núi, Resort...
4. Băng chuyền "Nổi bật".
5. Danh sách "Phổ biến" và "Mới".
6. Badge số thông báo chưa đọc ở góc (nếu đã đăng nhập).

**API**

| Khối | Endpoint |
|---|---|
| Danh mục | `GET /api/categories` |
| Nổi bật | `GET /api/destinations?featured=true&sort=rating&limit=10` |
| Phổ biến | `GET /api/destinations?sort=popular&limit=10` |
| Mới | `GET /api/destinations?sort=newest&limit=10` |
| Badge | `GET /api/notifications/unread-count` (chỉ khi đã đăng nhập) |

**Thao tác**

| Người dùng | Hệ thống |
|---|---|
| Chạm ô tìm kiếm | Mở D1 với bàn phím bật sẵn |
| Chạm chip danh mục | Mở D1 với `categoryId` đã chọn |
| Chạm thẻ địa điểm | Mở D2 theo `slug` |
| Kéo xuống | Tải lại toàn bộ khối |

**Trạng thái:** mỗi khối có skeleton/loading riêng; một khối lỗi không làm hỏng cả trang (hiện nút "Thử lại" trong khối đó).

**Thẻ địa điểm** (dùng lại ở T1, T2, D1): ảnh, danh mục · khu vực, tên, sao + số đánh giá (hoặc "Chưa có đánh giá"), "Từ {minPrice}đ".

---

### D1 – Tìm kiếm và lọc

- **Route:** `search.tsx` · **Ai dùng:** tất cả · **Ưu tiên:** MVP
- **Mục đích:** mục 5 – Bước 2 và 3: tìm theo từ khóa, lọc, sắp xếp.

**Hiển thị:** ô tìm kiếm, nút "Bộ lọc" (kèm số bộ lọc đang bật), dòng "N kết quả", menu sắp xếp, danh sách thẻ địa điểm cuộn vô hạn.

**Bộ lọc** (bottom sheet trên mobile, cột bên trái trên web):

| Bộ lọc | Tham số API | Điều khiển gợi ý |
|---|---|---|
| Từ khóa | `q` | Ô nhập (tìm trong tên, khu vực, địa chỉ, tên danh mục) |
| Danh mục | `categoryId` | Chip chọn một |
| Khu vực | `location` | Ô nhập hoặc danh sách gợi ý |
| Khoảng giá | `minPrice`, `maxPrice` | Thanh trượt hai đầu |
| Rating tối thiểu | `minRating` | 3+ / 4+ / 4.5+ sao |
| Tiện ích | `facilityIds=1,2` | Checkbox (lấy từ `GET /api/facilities`) |
| Sắp xếp | `sort` = `popular` / `rating` / `price_asc` / `price_desc` / `newest` | Menu |

**API:** `GET /api/destinations?{bộ lọc}&page={n}&limit=20`; dùng `meta.totalPages` để biết còn trang tiếp không.

**Thao tác**

| Người dùng | Hệ thống |
|---|---|
| Gõ từ khóa | Chờ ngừng gõ ~400 ms (debounce) rồi mới gọi API |
| Áp dụng bộ lọc | Quay về trang 1, gọi lại API |
| Cuộn tới cuối | Tải trang kế tiếp, nối vào danh sách |
| "Xóa bộ lọc" | Đặt lại mặc định |

**Trạng thái rỗng:** "Không tìm thấy địa điểm phù hợp" + nút "Xóa bộ lọc".

---

### D2 – Chi tiết địa điểm

- **Route:** `destinations/[slug].tsx` · **Ai dùng:** tất cả · **Ưu tiên:** MVP
- **Mục đích:** mục 5 – Bước 4: mọi thông tin để khách quyết định đặt.

**Hiển thị** (theo thứ tự cuộn)

1. Thư viện ảnh vuốt ngang (`images`, nếu trống dùng `imageUrl`); nút quay lại, nút ♥, nút chia sẻ.
2. Tên, danh mục, khu vực, sao + số đánh giá.
3. Mô tả (thu gọn, "Xem thêm").
4. Tiện ích: lưới icon + tên.
5. **Các gói dịch vụ:** thẻ gồm tên, "3 ngày 2 đêm", quyền lợi (`inclusions`), giá, "Hủy miễn phí trước {freeCancellationHours} giờ".
6. **Loại phòng:** tên, sức chứa, giá/đêm.
7. Dịch vụ bổ sung có thu phí: tên, giá, đơn vị (/lượt, /khách, /đêm).
8. Địa chỉ + bản đồ (`latitude`, `longitude`); chạm để mở Google Maps.
9. Chính sách (`policy`) và liên hệ (`contactPhone` chạm để gọi, `contactEmail`).
10. 5 đánh giá mới nhất (`latestReviews`) + "Xem tất cả" → D3.
11. **Thanh cố định đáy:** "Từ {minPrice}đ" + nút **Đặt ngay**.

**API:** `GET /api/destinations/{slug}` (gửi kèm token nếu có để nhận đúng `isFavorite`).

**Thao tác**

| Người dùng | Hệ thống |
|---|---|
| Chạm ♥ khi chưa đăng nhập | Mở A1, đăng nhập xong quay lại D2 (BR-01) |
| Chạm ♥ khi đã đăng nhập | `POST /api/favorites/{id}/toggle`; đổi icon ngay (optimistic), lỗi thì hoàn tác |
| Chạm một thẻ gói | Mở B1 với gói đó được chọn sẵn |
| **Đặt ngay** | Mở B1 với gói rẻ nhất được chọn sẵn |

**Trạng thái:** 404 → "Địa điểm không tồn tại hoặc đã ngừng hoạt động" + nút về trang chủ.

---

### D3 – Tất cả đánh giá

- **Route:** `destinations/[slug]/reviews.tsx` · **Ai dùng:** tất cả · **Ưu tiên:** P2
- **Hiển thị:** điểm trung bình lớn, tổng số đánh giá, danh sách (avatar, tên, sao, ngày, nội dung), cuộn vô hạn.
- **API:** `GET /api/destinations/{id}/reviews?page=&limit=`
- **Quy tắc:** chỉ review đã được duyệt (`APPROVED`) mới hiện ở đây.
- **Đề xuất API bổ sung:** biểu đồ phân bố 1–5 sao cần endpoint thống kê (chưa có).

---

### T2 – Yêu thích

- **Route:** `(tabs)/favorites.tsx` · **Ai dùng:** User · **Ưu tiên:** MVP
- **Mục đích:** mục 7: xem lại địa điểm đã lưu.
- **Hiển thị:** danh sách thẻ địa điểm; mỗi thẻ có nút ♥ đầy để bỏ yêu thích.
- **API:** `GET /api/favorites`; bỏ yêu thích: `POST /api/favorites/{destinationId}/toggle`.

| Người dùng | Hệ thống |
|---|---|
| Chưa đăng nhập mở tab | "Đăng nhập để lưu địa điểm yêu thích" + nút Đăng nhập |
| Chạm ♥ trên thẻ | Gỡ thẻ khỏi danh sách; hiện snackbar "Đã bỏ yêu thích · Hoàn tác" |
| Chạm thẻ | Mở D2 |

**Rỗng:** "Bạn chưa có địa điểm yêu thích" + nút "Khám phá ngay" → T1.
**Quy tắc:** BR-01, BR-03. Địa điểm đã bị admin ẩn sẽ tự biến mất khỏi danh sách.

---

### T3 – Chuyến đi của tôi

- **Route:** `(tabs)/bookings.tsx` · **Ai dùng:** User · **Ưu tiên:** MVP
- **Mục đích:** mục 15: "My Booking / Lịch sử đặt".
- **Hiển thị:** tab con lọc theo trạng thái: **Sắp tới** (`PENDING` + `CONFIRMED`) · **Đã hoàn thành** · **Đã hủy**. Mỗi dòng: mã booking, badge trạng thái, ảnh + tên địa điểm, gói · phòng × số phòng, ngày nhận → trả, số khách, tổng tiền.
- **API:** `GET /api/bookings?status={PENDING|CONFIRMED|COMPLETED|CANCELLED}&page=`
  - Tab "Sắp tới" gọi 2 lần (PENDING và CONFIRMED) rồi ghép, hoặc đề xuất backend nhận nhiều status.

**Badge gợi ý**

| Trạng thái | Nhãn | Màu |
|---|---|---|
| `PENDING` + `UNPAID` online | Chờ thanh toán | Cam |
| `PENDING` + trả tại nơi ở | Chờ xác nhận | Vàng |
| `CONFIRMED` | Đã xác nhận | Xanh lá |
| `COMPLETED` | Đã hoàn thành | Xanh dương |
| `CANCELLED` | Đã hủy | Xám |

**Thao tác:** chạm một dòng → B6. Booking `COMPLETED` chưa có `review` hiện thêm nút nhỏ "Đánh giá" → R1.
**Rỗng:** "Bạn chưa có chuyến đi nào" + "Khám phá ngay".

---

### B1 – Chọn gói, ngày, phòng, số khách

- **Route:** `booking/options.tsx` · **Ai dùng:** User (Guest vẫn xem được giá) · **Ưu tiên:** MVP
- **Mục đích:** mục 8–10: chọn gói, loại phòng, ngày nhận/trả, số khách, số phòng.

**Hiển thị**

1. Tên địa điểm (nhỏ, trên cùng) + thanh tiến trình "Bước 1/4".
2. Chọn gói (radio card).
3. Chọn ngày nhận và ngày trả (date picker; gợi ý ngày trả = ngày nhận + số đêm của gói).
4. Chọn loại phòng (radio card), kèm "Còn {availableRooms} phòng".
5. Bộ đếm số khách và số phòng (+/−).
6. Thanh đáy: tạm tính + nút **Tiếp tục**.

**API**

| Mục đích | Endpoint |
|---|---|
| Dữ liệu gói/phòng | Lấy lại từ D2 (cache) hoặc `GET /api/destinations/{slug}` |
| Còn phòng | `GET /api/destinations/{id}/availability?roomTypeId=&checkInDate=&checkOutDate=` |
| Tạm tính | `POST /api/bookings/quote` mỗi khi đổi lựa chọn (debounce) |

**Kiểm tra trên giao diện** (backend kiểm tra lại lần nữa)

- Ngày nhận không ở quá khứ; ngày trả sau ngày nhận; tối đa 30 đêm.
- Số đêm ≥ số đêm của gói (gói 3N2Đ phải ở ít nhất 2 đêm).
- Số khách ≤ sức chứa phòng × số phòng → nếu vượt, gợi ý tăng số phòng.
- Loại phòng hết chỗ → làm mờ, ghi "Hết phòng".

**Thao tác:** **Tiếp tục** khi chưa đăng nhập → A1 rồi quay lại; đã đăng nhập → B2.
**Quy tắc:** BR-04 (không đặt quá số phòng còn trống).

Các lựa chọn của B1–B4 nên lưu trong một store tạm (ví dụ Zustand `booking-draft-store`) để quay lại bước trước không mất dữ liệu.

---

### B2 – Chọn dịch vụ bổ sung

- **Route:** `booking/services.tsx` · **Ai dùng:** User · **Ưu tiên:** MVP
- **Hiển thị:** danh sách `services` của địa điểm; mỗi dòng có checkbox, tên, giá + đơn vị, bộ đếm số lượng (khi được chọn), thành tiền của dòng. Thanh đáy: tạm tính cập nhật + **Tiếp tục** / "Bỏ qua".
- **API:** `POST /api/bookings/quote` với `services: [{ addonServiceId, quantity }]`.
- **Cách tính thành tiền** (hiển thị cho khách hiểu):
  - `PER_BOOKING`: giá × số lượng
  - `PER_GUEST`: giá × số khách × số lượng
  - `PER_NIGHT`: giá × số đêm × số lượng

---

### B3 – Thông tin liên hệ, voucher, phương thức thanh toán

- **Route:** `booking/contact.tsx` · **Ai dùng:** User · **Ưu tiên:** MVP

**Hiển thị**

1. Họ tên, số điện thoại, email người lưu trú (điền sẵn từ hồ sơ, sửa được).
2. Ghi chú (tùy chọn, tối đa 1000 ký tự).
3. Ô mã giảm giá + nút "Áp dụng".
4. Phương thức thanh toán: **Thanh toán online** (`ONLINE_MOCK`) / **Trả tại nơi lưu trú** (`PAY_AT_PROPERTY`).

**Kiểm tra:** họ tên ≥ 2 ký tự; số điện thoại dạng `0xxxxxxxxx` hoặc `+84...`; email hợp lệ.

**Voucher:** "Áp dụng" gọi `POST /api/bookings/quote` có `voucherCode`:

| Kết quả | Hiển thị |
|---|---|
| Thành công | Dòng "Giảm giá −{discountAmount}đ" màu xanh |
| `INVALID_VOUCHER` | "Mã không tồn tại hoặc đã hết hạn" |
| `VOUCHER_EXHAUSTED` | "Mã đã hết lượt sử dụng" |
| `VOUCHER_MIN_ORDER` | Hiện nguyên `message` từ API (có số tiền tối thiểu) |

---

### B4 – Xác nhận đơn

- **Route:** `booking/review.tsx` · **Ai dùng:** User · **Ưu tiên:** MVP
- **Mục đích:** mục 12: khách xem lại toàn bộ trước khi đặt.

**Hiển thị** – hóa đơn theo đúng công thức mục 11 của tài liệu nghiệp vụ:

```text
Đà Lạt Pine Hill Resort
Gói Premium · Deluxe Room × 1 · 2 khách
Nhận 20/11/2026 → Trả 22/11/2026 (2 đêm)
---------------------------------------------
Gói Premium                       2.000.000đ
Phòng (500.000đ × 2 đêm × 1)      1.000.000đ
Đưa đón sân bay                     200.000đ
---------------------------------------------
Tạm tính                          3.200.000đ
Giảm giá (WELCOME10)               −200.000đ
Thuế/phí (8%)                       240.000đ
---------------------------------------------
Tổng cộng                         3.240.000đ
```

Kèm thông tin liên hệ, phương thức thanh toán, chính sách hủy của gói, checkbox "Tôi đồng ý với chính sách", nút **Xác nhận đặt**.

**API:** `POST /api/bookings` (body = toàn bộ lựa chọn B1–B3).

| Kết quả | Xử lý |
|---|---|
| 201 | Xóa store tạm; `ONLINE_MOCK` → chuyển sang thanh toán; `PAY_AT_PROPERTY` → B5 |
| 409 `NOT_AVAILABLE` | "Dịch vụ không còn khả dụng trong khoảng thời gian bạn chọn" + nút quay về B1 chọn lại |
| 400 | Hiện lỗi, quay lại bước có trường sai |

Nút **Xác nhận đặt** phải bị khóa trong lúc chờ API để khách không bấm hai lần tạo hai booking.

---

### B5 – Kết quả đặt chỗ / thanh toán

- **Route:** `booking/result.tsx?bookingId=` · **Ai dùng:** User · **Ưu tiên:** MVP
- **Mục đích:** mục 13–14.

**Với `ONLINE_MOCK`** – trang thanh toán giả lập:

- Hiển thị mã booking, tổng tiền, nút **Thanh toán** và (chỉ để demo) nút "Mô phỏng thất bại".
- **API:** `POST /api/bookings/{id}/pay` với `{ "simulateFailure": false }`.
  - 200 → "Thanh toán thành công, booking đã được xác nhận" ✓
  - 402 `PAYMENT_FAILED` → "Thanh toán thất bại" + nút "Thử lại"

**Với `PAY_AT_PROPERTY`:** "Đặt chỗ thành công – đang chờ xác nhận" + mã booking.

Cả hai có nút "Xem booking" → B6 và "Về trang chủ". Nút back của hệ thống không được quay lại B4 (dùng `router.replace`).

---

### B6 – Chi tiết booking

- **Route:** `bookings/[id].tsx` · **Ai dùng:** User (chủ booking) · **Ưu tiên:** MVP
- **Hiển thị:** mã booking (chạm để sao chép), badge trạng thái, dòng thời gian (Đặt → Thanh toán → Xác nhận → Hoàn thành, hoặc → Hủy), thông tin địa điểm, gói, phòng, ngày, khách, hóa đơn chi tiết (`services`, `discountAmount`, `taxAmount`, `totalAmount`), thanh toán (`payment.method`, `payment.status`, `paidAt`), thông tin liên hệ, ghi chú.
- **API:** `GET /api/bookings/{id}`

**Nút hành động theo trạng thái**

| Điều kiện | Nút | API |
|---|---|---|
| `PENDING` + `ONLINE_MOCK` + chưa `PAID` | Thanh toán ngay | → B5 |
| `PENDING` hoặc `CONFIRMED`, trước giờ nhận phòng | Hủy booking | `POST /api/bookings/{id}/cancel` `{ reason }` |
| `COMPLETED` và `review = null` | Viết đánh giá | → R1 |
| `COMPLETED` và đã có review | Xem / sửa đánh giá | → R1 |
| Mọi trạng thái | Liên hệ CSKH | → C1 (gắn sẵn `bookingId`) |

**Hủy booking:** hộp thoại xác nhận hiển thị chính sách và ô lý do.

- Booking `CONFIRMED` đã thanh toán: báo trước "Khoản thanh toán sẽ được hoàn lại".
- Gần giờ nhận phòng hơn `freeCancellationHours`: nên ẩn hoặc làm mờ nút hủy, ghi "Đã quá hạn hủy miễn phí, vui lòng liên hệ CSKH". Nếu vẫn gọi, API trả 409 `CANCELLATION_NOT_ALLOWED`.

**Quy tắc:** BR-05, BR-06, BR-07, BR-10 (booking của người khác trả 404).

---

### R1 – Viết / sửa đánh giá

- **Route:** `reviews/new.tsx?bookingId=` (sửa: `?reviewId=`) · **Ai dùng:** User · **Ưu tiên:** MVP
- **Mục đích:** mục 16.
- **Hiển thị:** tên địa điểm + ngày đi, chọn 1–5 sao (bắt buộc), ô nhận xét (tối đa 2000 ký tự, có bộ đếm), nút **Gửi**.
- **API:** tạo `POST /api/reviews` `{ bookingId, rating, comment }`; sửa `PATCH /api/reviews/{id}`; xóa `DELETE /api/reviews/{id}`.

| Kết quả | Hiển thị |
|---|---|
| 201 | "Cảm ơn bạn! Đánh giá sẽ hiển thị sau khi được duyệt" |
| 409 `BOOKING_NOT_COMPLETED` | "Chỉ đánh giá được sau khi hoàn thành chuyến đi" |
| 409 `ALREADY_REVIEWED` | Chuyển sang chế độ sửa |

**Quy tắc:** BR-02, BR-08. Sửa review sẽ đưa nó về trạng thái chờ duyệt lại; nên ghi chú cho khách biết.

---

### T4 – Hộp thư

- **Route:** `(tabs)/inbox.tsx` · **Ai dùng:** User · **Ưu tiên:** MVP (Thông báo), P2 (Hỗ trợ)
- **Hiển thị:** 2 tab con.

**Tab "Thông báo"** (mục 18)

- Danh sách: icon theo `type`, tiêu đề, nội dung, thời gian tương đối ("5 phút trước"); thông báo chưa đọc có nền đậm.
- **API:** `GET /api/notifications?page=`; chạm một thông báo: `PATCH /api/notifications/{id}/read`; nút "Đánh dấu tất cả đã đọc": `PATCH /api/notifications/read-all`.
- **Điều hướng theo `data`:** có `bookingId` → B6; có `conversationId` → C2; có `destinationId` → D2.

**Tab "Hỗ trợ"** (mục 17)

- Danh sách hội thoại: tiêu đề, tin nhắn cuối, thời gian, trạng thái Mở/Đã đóng.
- **API:** `GET /api/conversations`. Nút "+ Yêu cầu hỗ trợ" → C1.

---

### C1 – Tạo yêu cầu hỗ trợ

- **Route:** `conversations/new.tsx?bookingId=` · **Ai dùng:** User · **Ưu tiên:** P2
- **Hiển thị:** chủ đề (gợi ý nhanh: "Thay đổi booking", "Thanh toán", "Hoàn tiền", "Khác"), chọn booking liên quan (tùy chọn), nội dung tin nhắn đầu tiên.
- **API:** `POST /api/conversations` `{ subject, content, bookingId? }` → mở C2.

### C2 – Màn hình chat

- **Route:** `conversations/[id].tsx` · **Ai dùng:** User, Staff · **Ưu tiên:** P2
- **Hiển thị:** bong bóng tin nhắn (của mình bên phải, của CSKH bên trái kèm tên), ô nhập + nút gửi; hội thoại đã đóng thì ẩn ô nhập và ghi "Cuộc trò chuyện đã kết thúc".
- **API:**
  - Tải tin: `GET /api/conversations/{id}/messages`
  - Lấy tin mới: gọi lại mỗi 5 giây với `?after={id tin cuối}` khi màn hình đang mở (polling)
  - Gửi: `POST /api/conversations/{id}/messages` `{ content }`
- **Trạng thái:** 409 `CONVERSATION_CLOSED` → khóa ô nhập.
- **Nâng cấp sau:** chuyển polling sang WebSocket (Socket.IO) để tin đến tức thì.

---

### T5 – Tài khoản

- **Route:** `(tabs)/profile.tsx` · **Ai dùng:** tất cả · **Ưu tiên:** MVP

**Chưa đăng nhập:** lời mời + nút **Đăng nhập** (A1) và **Tạo tài khoản** (A2).

**Đã đăng nhập:**

1. Avatar, tên, email, vai trò.
2. Menu: Sửa hồ sơ (P1) · Đổi mật khẩu (P2) · Đánh giá của tôi (P3) · Địa điểm yêu thích (T2) · Hỗ trợ (T4).
3. Nếu `role` là STAFF/ADMIN: mục **Trang quản trị** → M1.
4. Nút **Đăng xuất**: xóa token, xóa cache dữ liệu cá nhân, về T1.

**API:** `GET /api/auth/me`.

---

### A1 – Đăng nhập

- **Route:** `(auth)/login.tsx?redirect=` · **Ai dùng:** Guest · **Ưu tiên:** MVP
- **Hiển thị:** email, mật khẩu (nút hiện/ẩn), nút **Đăng nhập**, link "Chưa có tài khoản? Đăng ký".
- **API:** `POST /api/auth/login` `{ email, password }` → lưu `token` (SecureStore trên mobile, localStorage trên web) và `user`.

| Kết quả | Xử lý |
|---|---|
| 200 | Quay về trang trong `redirect` (hoặc T1) |
| 401 `INVALID_CREDENTIALS` | "Email hoặc mật khẩu không đúng" (không nói rõ sai cái nào) |
| 403 | "Tài khoản đã bị khóa, vui lòng liên hệ CSKH" |
| 429 `TOO_MANY_REQUESTS` | "Bạn thử quá nhiều lần, vui lòng thử lại sau" |

**Đề xuất API bổ sung:** "Quên mật khẩu" (chưa có, xem business-flows.md mục 7).

### A2 – Đăng ký

- **Route:** `(auth)/register.tsx` · **Ai dùng:** Guest · **Ưu tiên:** MVP
- **Mục đích:** mục 6: nhập thông tin → kiểm tra → kiểm tra email trùng → mã hóa mật khẩu → tạo tài khoản → thông báo thành công.
- **Hiển thị:** họ tên, email, số điện thoại (tùy chọn), ngày sinh (tùy chọn), mật khẩu, nhập lại mật khẩu, checkbox điều khoản.
- **Kiểm tra trên giao diện:** mật khẩu 8–72 ký tự, có chữ và số; hai ô mật khẩu khớp; email đúng định dạng.
- **API:** `POST /api/auth/register` → trả về `token` luôn, nên đăng nhập tự động sau khi đăng ký.
- **Lỗi:** 409 `EMAIL_TAKEN` → báo dưới ô email "Email đã được sử dụng"; 400 → hiển thị `details[].message` dưới đúng ô theo `details[].path`.

### P1 – Sửa hồ sơ · P2 – Đổi mật khẩu · P3 – Đánh giá của tôi

| Trang | Ưu tiên | Hiển thị | API |
|---|---|---|---|
| P1 `profile/edit.tsx` | P2 | Tên, số điện thoại, ngày sinh, URL avatar (email không sửa được) | `PATCH /api/auth/me` |
| P2 `profile/password.tsx` | P2 | Mật khẩu hiện tại, mật khẩu mới, nhập lại | `PATCH /api/auth/me/password` (204); 400 `INVALID_PASSWORD` → "Mật khẩu hiện tại không đúng" |
| P3 `profile/reviews.tsx` | P3 | Review của tôi kèm trạng thái: Chờ duyệt / Đã hiển thị / Bị từ chối + lý do | `GET /api/reviews/mine` |

## 4. Trang quản trị (Staff / Admin)

Khu `admin/` nên ưu tiên giao diện **web** (màn hình rộng, bảng dữ liệu, sidebar). Trên mobile vẫn dùng được nhưng có thể đơn giản hơn.

`admin/_layout.tsx` phải chặn theo vai trò: chưa đăng nhập → A1; `role = USER` → về T1. Đây chỉ là chặn ở giao diện; backend vẫn kiểm tra quyền ở từng API.

| Trang | STAFF | ADMIN |
|---|:---:|:---:|
| M1 Tổng quan | ✓ | ✓ |
| M2–M3 Booking | ✓ | ✓ |
| M4 Kiểm duyệt review | ✓ | ✓ |
| M5–M6 CSKH | ✓ | ✓ |
| M7–M8 Địa điểm, gói, phòng, dịch vụ | | ✓ |
| M9 Danh mục & tiện ích | | ✓ |
| M10 Voucher | | ✓ |
| M11 Người dùng | Xem | Xem, khóa/mở, đổi role |

### M1 – Tổng quan

- **Ưu tiên:** P2
- **Hiển thị:** thẻ số liệu: booking chờ xác nhận, review chờ duyệt, hội thoại đang mở; danh sách 5 booking mới nhất.
- **API hiện có:** `GET /api/bookings?status=PENDING&limit=5` (dùng `meta.total`), `GET /api/reviews/moderation?status=PENDING&limit=1`, `GET /api/conversations?status=OPEN&limit=1`.
- **Đề xuất API bổ sung:** `GET /api/admin/stats` cho doanh thu theo ngày/tháng, tỷ lệ hủy, top địa điểm (để vẽ biểu đồ).

### M2 – Quản lý booking · M3 – Xử lý booking

- **Ưu tiên:** MVP (cần có để chuyển booking sang `COMPLETED`, nếu không sẽ không demo được luồng review)
- **M2 hiển thị:** bảng gồm mã, khách, địa điểm, ngày nhận → trả, tổng tiền, thanh toán, trạng thái; lọc theo trạng thái, tìm theo mã.
  - **API:** `GET /api/bookings?status=&code=&page=` (Staff nhận tất cả booking).
- **M3 hiển thị:** như B6 cộng thêm thông tin khách (`user`).

**Nút hành động của Staff**

| Điều kiện | Nút | API |
|---|---|---|
| `PENDING` + trả tại nơi ở | Xác nhận | `PATCH /api/bookings/{id}/status` `{ "status": "CONFIRMED" }` |
| `PENDING` + online chưa trả | (khóa) "Chờ khách thanh toán" | API trả 409 `PAYMENT_REQUIRED` nếu cố xác nhận (BR-06) |
| `CONFIRMED`, từ ngày nhận phòng | Hoàn thành | `PATCH /api/bookings/{id}/status` `{ "status": "COMPLETED" }` |
| `PENDING` / `CONFIRMED` | Hủy (bắt buộc lý do) | `POST /api/bookings/{id}/cancel` – Staff được hủy kể cả khi quá hạn miễn phí |

Mỗi thao tác backend tự gửi thông báo cho khách; giao diện chỉ cần tải lại dữ liệu.

### M4 – Kiểm duyệt đánh giá

- **Ưu tiên:** MVP
- **Hiển thị:** tab Chờ duyệt / Đã duyệt / Đã từ chối; mỗi thẻ: khách, địa điểm, sao, nội dung, ngày; nút **Duyệt** / **Từ chối**.
- **API:** `GET /api/reviews/moderation?status=PENDING`; `PATCH /api/reviews/{id}/moderation` `{ status: "APPROVED" }` hoặc `{ status: "REJECTED", rejectReason }`.
- **Quy tắc:** từ chối bắt buộc nhập lý do (gợi ý nhanh: Spam, Quảng cáo, Ngôn từ không phù hợp, Không liên quan). Duyệt/từ chối sẽ tính lại rating của địa điểm và gửi thông báo cho khách.

### M5 – Hàng đợi CSKH · M6 – Trả lời khách

- **Ưu tiên:** P2
- **M5:** danh sách hội thoại sắp theo tin mới nhất, lọc Mở/Đã đóng, cột "Người phụ trách". **API:** `GET /api/conversations?status=OPEN`.
- **M6:** dùng lại giao diện C2, thêm: thông tin khách và booking liên quan ở cột phải, nút **Nhận xử lý** (`PATCH /api/conversations/{id}` `{ staffId }`) và **Đóng hội thoại** (`{ status: "CLOSED" }`).
- **Quy tắc:** nhân viên trả lời đầu tiên được tự gán phụ trách; khách nhận thông báo "CSKH đã trả lời".

### M7 – Danh sách địa điểm · M8 – Thêm / sửa địa điểm

- **Ưu tiên:** P2 (dữ liệu demo đã có sẵn nhờ seed)
- **M7:** bảng tên, khu vực, danh mục, giá từ, rating, Nổi bật (toggle), Hoạt động (toggle); nút "+ Thêm địa điểm".
  - **API:** `GET /api/destinations?includeInactive=true&page=`; toggle: `PATCH /api/destinations/{id}` `{ isFeatured }` / `{ isActive }`.
- **M8:** form nhiều tab:

| Tab | Trường | API |
|---|---|---|
| Thông tin | Tên, slug (tự sinh), danh mục, khu vực, địa chỉ, tọa độ, mô tả, chính sách, liên hệ, tiện ích, ảnh | `POST /api/destinations` · `PATCH /api/destinations/{id}` |
| Gói | Tên, mô tả, quyền lợi, số ngày/đêm, giá, giờ hủy miễn phí, hoạt động | `POST /api/packages` · `PATCH /api/packages/{id}` |
| Phòng | Tên, mô tả, sức chứa, giá/đêm, tổng số phòng, hoạt động | `POST /api/room-types` · `PATCH /api/room-types/{id}` |
| Dịch vụ | Tên, mô tả, giá, đơn vị tính, hoạt động | `POST /api/addon-services` · `PATCH /api/addon-services/{id}` |

- **Quy tắc:** xóa địa điểm đã có booking trả 409 → giao diện nên đề xuất "Ngừng hoạt động" thay vì xóa. Số đêm của gói không được lớn hơn số ngày.
- **Đề xuất API bổ sung:** chi tiết địa điểm hiện chỉ trả gói/phòng/dịch vụ đang hoạt động; trang quản trị cần thêm tham số để lấy cả mục đã tắt. Tải ảnh lên cần endpoint upload (hiện chỉ nhập URL).

### M9 – Danh mục & tiện ích · M10 – Voucher · M11 – Người dùng

| Trang | Ưu tiên | Hiển thị | API |
|---|---|---|---|
| M9 `catalog.tsx` | P3 | 2 bảng sửa trực tiếp: danh mục (tên, slug, icon, số địa điểm) và tiện ích (tên, icon) | `GET/POST/PATCH/DELETE /api/categories`, `/api/facilities` |
| M10 `vouchers.tsx` | P3 | Bảng mã, loại, giá trị, đã dùng / giới hạn, hiệu lực, hoạt động; form tạo/sửa | `GET/POST /api/vouchers`, `PATCH /api/vouchers/{id}` |
| M11 `users.tsx` | P2 | Bảng tên, email, SĐT, vai trò, trạng thái, số booking; tìm kiếm; xem lịch sử booking của user | `GET /api/users?q=&role=&status=`, `GET /api/users/{id}`, `GET /api/users/{id}/bookings`, `PATCH /api/users/{id}/status`, `PATCH /api/users/{id}/role` |

M11: Admin không tự khóa hoặc tự đổi quyền chính mình (API trả 400). Khóa tài khoản có hiệu lực ngay, kể cả khi người đó đang đăng nhập.

## 5. Thứ tự làm đề xuất

| Đợt | Trang | Kết quả demo được |
|---|---|---|
| 1 | Layout + 5 tab, T1, D2, A1, A2, T5 | Khám phá, xem chi tiết, đăng nhập/đăng ký |
| 2 | D1, T2 | Tìm kiếm, lọc, yêu thích |
| 3 | B1 → B5, T3, B6 | **Luồng đặt chỗ hoàn chỉnh** (nghiệp vụ quan trọng nhất) |
| 4 | M2, M3, M4, R1, T4 (thông báo) | Staff xác nhận/hoàn thành → khách đánh giá → staff duyệt |
| 5 | C1, C2, M5, M6, P1–P3, D3 | Chat CSKH, quản lý hồ sơ |
| 6 | M1, M7–M11 | Quản trị nội dung |

Tài khoản demo sau khi chạy `npm run db:seed` trong `be/` (mật khẩu `Password123`): `user@travelling.app`, `staff@travelling.app`, `admin@travelling.app`.
