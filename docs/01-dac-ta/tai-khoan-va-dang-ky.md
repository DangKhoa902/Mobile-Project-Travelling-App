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

### Đăng nhập / đăng ký bằng Google

`POST /api/auth/google` – nút ở A1 và A2. Body: `idToken` (bắt buộc), `acceptTerms: true` (bắt buộc – bấm nút nghĩa là đồng ý điều khoản), `deviceName` (tùy chọn). Không cần nhập họ tên, mật khẩu: lấy tên, email, ảnh từ Google; email coi như đã xác thực. Email trùng tài khoản đã có thì liên kết vào tài khoản đó. Chi tiết và cách cấu hình: [dang-nhap-google.md](../03-trien-khai/dang-nhap-google.md).

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

## 6. Xác thực email, quên mật khẩu, phiên đăng nhập

| Thao tác | Trường | Bắt buộc | Quy tắc |
|---|---|---|---|
| Xác thực email (A5) | `token` | **Bắt buộc** | Lấy từ link trong email; hiệu lực 24 giờ, dùng một lần |
| Gửi lại email xác thực | — | | Phải đăng nhập; 409 nếu đã xác thực |
| Quên mật khẩu (A3) | `email` | **Bắt buộc** | Định dạng email. Luôn trả cùng thông báo, kể cả email chưa đăng ký |
| Đặt mật khẩu mới (A4) | `token` | **Bắt buộc** | Từ link email; hiệu lực 30 phút, dùng một lần |
| | `newPassword` | **Bắt buộc** | Cùng quy tắc mật khẩu khi đăng ký |
| Đăng nhập | `deviceName` | Tùy chọn | Tối đa 100 ký tự, hiện ở danh sách thiết bị (P5) |
| Làm mới phiên | `refreshToken` | **Bắt buộc** | Chuỗi nhận được khi đăng nhập / làm mới lần trước |

- **Email chưa xác thực** vẫn đăng nhập, đặt chỗ, đánh giá bình thường; chỉ không nộp được hồ sơ đối tác.
- Tài khoản tạo trước ngày 25/10/2026 và tài khoản demo được coi là đã xác thực.
- Đặt lại mật khẩu thành công cũng đánh dấu email đã xác thực (đã mở được link trong hộp thư) và đăng xuất mọi thiết bị.
