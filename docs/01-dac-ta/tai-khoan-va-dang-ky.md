# Tài khoản, đăng ký và hồ sơ đối tác

Tài liệu này quy định **trường nào bắt buộc, trường nào tùy chọn** và cách kiểm tra từng trường. Giao diện kiểm tra trước để báo lỗi sớm; backend luôn kiểm tra lại (file `be/src/validators/auth.schema.ts`, `be/src/routes/partner.routes.ts`).

Ký hiệu: **Bắt buộc** · Tùy chọn · *Hệ thống tự sinh*.

## 1. Đăng ký tài khoản khách hàng

`POST /api/auth/register` – trang A2.

| Trường | Bắt buộc | Quy tắc | Lý do |
|---|---|---|---|
| `name` – Họ tên | **Bắt buộc** | 2–100 ký tự, tự bỏ khoảng trắng đầu/cuối | Hiển thị và in trên booking |
| `email` | **Bắt buộc** | Đúng định dạng email, lưu chữ thường, **không trùng** | Dùng để đăng nhập, nhận thông tin booking |
| `password` – Mật khẩu | **Bắt buộc** | 8–72 ký tự, có ít nhất 1 chữ cái và 1 chữ số | Bảo mật (BR-09); 72 là giới hạn của bcrypt |
| Nhập lại mật khẩu | **Bắt buộc** (chỉ trên giao diện) | Phải trùng `password`; không gửi lên API | Tránh gõ nhầm |
| `acceptTerms` – Đồng ý điều khoản | **Bắt buộc** | Phải là `true` | Đồng ý xử lý dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP |
| `phone` – Số điện thoại | Tùy chọn | `0xxxxxxxxx` hoặc `+84xxxxxxxxx` (10–11 số) | Điền sẵn khi đặt chỗ; có thể bổ sung sau |
| `dateOfBirth` – Ngày sinh | Tùy chọn | `YYYY-MM-DD` | Cá nhân hóa, không dùng cho nghiệp vụ |
| `avatarUrl` | Không có lúc đăng ký | Cập nhật ở trang Sửa hồ sơ | |
| `role` | *Tự sinh* = `USER` | Người dùng không chọn được | Chống tự cấp quyền |
| `status` | *Tự sinh* = `ACTIVE` | | |

**Vì sao số điện thoại không bắt buộc khi đăng ký?** Giảm số bước để khách đăng ký nhanh. Số điện thoại vẫn **bắt buộc khi đặt chỗ** (trường `contactPhone` của booking), lúc đó khách mới thật sự cần nhập.

**Luồng xử lý:**

```text
Nhập thông tin → Kiểm tra định dạng → Kiểm tra email trùng (409 EMAIL_TAKEN)
→ Hash mật khẩu (bcrypt) → Tạo tài khoản USER → Trả token (đăng nhập luôn)
```

Lỗi định dạng trả 400 `VALIDATION_ERROR` với `details[].path` là tên trường, để giao diện hiển thị lỗi ngay dưới ô tương ứng.

## 2. Đăng nhập

`POST /api/auth/login` – trang A1.

| Trường | Bắt buộc | Quy tắc |
|---|---|---|
| `email` | **Bắt buộc** | Định dạng email |
| `password` | **Bắt buộc** | 1–72 ký tự |

- Sai email hoặc mật khẩu đều trả **cùng một thông báo** (401 `INVALID_CREDENTIALS`), để không lộ email nào đã đăng ký.
- Tài khoản bị khóa: 403.
- Tối đa 20 lần đăng nhập/đăng ký mỗi 15 phút cho một IP (429).

## 3. Sửa hồ sơ và đổi mật khẩu

`PATCH /api/auth/me` – mọi trường đều tùy chọn, chỉ gửi trường muốn đổi.

| Trường | Sửa được | Ghi chú |
|---|---|---|
| `name` | Có | 2–100 ký tự |
| `phone` | Có | Gửi `null` để xóa |
| `dateOfBirth` | Có | Gửi `null` để xóa |
| `avatarUrl` | Có | URL hợp lệ, tối đa 500 ký tự |
| `email` | **Không** | Email là định danh đăng nhập |
| `role`, `status` | **Không** | Chỉ admin đổi |

`PATCH /api/auth/me/password`: `currentPassword` (**bắt buộc**), `newPassword` (**bắt buộc**, cùng quy tắc mật khẩu khi đăng ký).

## 4. Hồ sơ đối tác (trở thành chủ địa điểm)

`POST /api/partners/apply` – trang P4. Phải đăng nhập bằng tài khoản `USER`.

| Trường | Bắt buộc khi nộp | Bắt buộc khi được duyệt | Quy tắc |
|---|---|---|---|
| `businessName` – Tên cơ sở / doanh nghiệp | **Bắt buộc** | | 2–191 ký tự |
| `businessAddress` – Địa chỉ kinh doanh | **Bắt buộc** | | 5–500 ký tự |
| `contactPhone` – SĐT liên hệ | **Bắt buộc** | | Cùng quy tắc số điện thoại |
| `acceptPartnerTerms` – Đồng ý điều khoản đối tác | **Bắt buộc** | | Phải là `true` (đồng ý mức hoa hồng, chính sách hủy, chịu trách nhiệm nội dung đăng) |
| `taxCode` – Mã số thuế | Tùy chọn | Tùy chọn | 10 số hoặc `10 số-3 số`; hộ cá nhân cho thuê homestay có thể chưa có |
| `description` – Giới thiệu | Tùy chọn | Tùy chọn | Tối đa 2000 ký tự |
| `bankName` – Ngân hàng | Tùy chọn | **Bắt buộc** | 2–100 ký tự |
| `bankAccountNumber` – Số tài khoản | Tùy chọn | **Bắt buộc** | 6–20 chữ số |
| `bankAccountName` – Chủ tài khoản | Tùy chọn | **Bắt buộc** | 2–100 ký tự |
| `commissionRate` | *Admin đặt* khi duyệt | | 0–0.5, mặc định 0.15 |
| `status` | *Tự sinh* = `PENDING` | | |

**Vì sao tài khoản ngân hàng không bắt buộc khi nộp nhưng bắt buộc khi duyệt?** Cho phép đối tác nộp hồ sơ nhanh để sàn liên hệ trước; nhưng sàn không được duyệt đối tác mà không có tài khoản để chuyển doanh thu (409 `PARTNER_BANK_REQUIRED`). Đối tác bổ sung qua `PATCH /api/partners/me`.

**Không thu số CCCD/CMND:** đây là dữ liệu cá nhân nhạy cảm; đồ án không cần nên không lưu. Khi triển khai thật, xác minh danh tính nên làm qua dịch vụ eKYC thay vì tự lưu.

## 5. Tin đăng địa điểm (chủ địa điểm tạo)

`POST /api/destinations` – trang O3.

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| `name` | **Bắt buộc** | 2–191 ký tự |
| `location` – Khu vực / thành phố | **Bắt buộc** | Dùng để lọc |
| `slug` | Tùy chọn | Tự sinh từ tên nếu bỏ trống, ví dụ `hue-garden-homestay` |
| `categoryId`, `address`, `latitude`, `longitude`, `description`, `policy`, `contactPhone`, `contactEmail`, `imageUrl`, `images`, `facilityIds` | Tùy chọn khi lưu nháp | Nên đủ trước khi gửi duyệt; admin có thể từ chối nếu thiếu |
| `isActive` | Tùy chọn | Chủ tự tạm ngưng nhận khách |
| `isFeatured`, `ownerId` | **Chủ không đặt được** | Chỉ admin; nếu gửi lên sẽ bị bỏ qua |
| `listingStatus` | *Tự sinh* = `DRAFT` | |

**Điều kiện gửi duyệt** (`POST /api/destinations/:id/submit`): có ít nhất **1 gói dịch vụ** và **1 loại phòng** đang mở bán (400 `LISTING_INCOMPLETE` nếu thiếu).
