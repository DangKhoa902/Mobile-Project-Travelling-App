# Tài liệu dự án Travelling App

Tài liệu được sắp theo thứ tự làm một dự án: **đặc tả** (làm gì) → **thiết kế** (dữ liệu, API, giao diện) → **triển khai** (code, kiểm thử, deploy) → **quản lý dự án**.

```text
docs/
├── 01-dac-ta/                  HỆ THỐNG LÀM GÌ
│   ├── tong-quan.md            Mục tiêu, mô hình môi giới, 5 actor, use case, phạm vi
│   ├── tai-khoan-va-dang-ky.md Trường bắt buộc / tùy chọn: đăng ký, hồ sơ, đối tác, tin đăng
│   ├── quy-tac-nghiep-vu.md    BR-01 → BR-27 và chỗ code thực thi
│   ├── luong-nghiep-vu.md      Luồng chi tiết + sơ đồ + bảng mã lỗi
│   └── thanh-toan-gia-lap.md   Cổng thanh toán giả lập, hạn 15 phút, hoàn tiền
│
├── 02-thiet-ke/                THIẾT KẾ
│   ├── co-so-du-lieu.md        ERD, 27 bảng, enum, index, công thức giá và hoa hồng
│   ├── api.md                  Toàn bộ endpoint theo module và quyền
│   └── giao-dien.md            Sitemap + đặc tả từng trang (khách, chủ địa điểm, admin)
│
├── 03-trien-khai/              LÀM VÀ CHẠY
│   ├── backend.md              Kiến trúc lớp, cấu trúc file, quy ước, thêm chức năng, migration
│   ├── frontend-web-mobile.md  Một codebase cho Web + Mobile: breakpoint, kỹ thuật, tiến trình
│   ├── kiem-thu.md             Unit, integration, Postman, kịch bản demo
│   └── deploy.md               Chạy local, biến môi trường, Docker, build web / Android
│
├── 04-quan-ly-du-an/
│   ├── lo-trinh.md             Giai đoạn, trạng thái, đề xuất sau đồ án
│   ├── nhat-ky-thay-doi.md     Thay đổi theo từng đợt: lớp nào, vì sao
│   └── git.md                  Quy trình nhánh, commit, PR
│
└── tham-khao/
    ├── Mô tả hệ thống (bản gốc).docx   Tài liệu nghiệp vụ ban đầu của nhóm
    ├── cong-nghe.md                    Công nghệ sử dụng
    └── huong-dan-react-native-expo.md  Hướng dẫn chung React Native + Expo
```

## Đọc theo vai trò

| Bạn là | Đọc theo thứ tự |
|---|---|
| Thành viên mới | [tong-quan.md](01-dac-ta/tong-quan.md) → [deploy.md](03-trien-khai/deploy.md) mục 1 → [git.md](04-quan-ly-du-an/git.md) |
| Làm giao diện | [frontend-web-mobile.md](03-trien-khai/frontend-web-mobile.md) → [giao-dien.md](02-thiet-ke/giao-dien.md) → [luong-nghiep-vu.md](01-dac-ta/luong-nghiep-vu.md) → [api.md](02-thiet-ke/api.md) |
| Làm backend | [backend.md](03-trien-khai/backend.md) → [quy-tac-nghiep-vu.md](01-dac-ta/quy-tac-nghiep-vu.md) → [co-so-du-lieu.md](02-thiet-ke/co-so-du-lieu.md) → [api.md](02-thiet-ke/api.md) |
| Kiểm thử / demo | [kiem-thu.md](03-trien-khai/kiem-thu.md) |
| Viết báo cáo đồ án | [tong-quan.md](01-dac-ta/tong-quan.md) (phân tích yêu cầu) → [co-so-du-lieu.md](02-thiet-ke/co-so-du-lieu.md) (thiết kế) → [nhat-ky-thay-doi.md](04-quan-ly-du-an/nhat-ky-thay-doi.md) (quá trình) → [kiem-thu.md](03-trien-khai/kiem-thu.md) (kết quả) |

## Quy ước viết tài liệu

- Viết tiếng Việt; tên file không dấu, chữ thường, nối bằng `-`.
- Mỗi thông tin chỉ ghi ở **một** nơi; nơi khác dẫn link (ví dụ quy tắc nghiệp vụ chỉ ở `quy-tac-nghiep-vu.md`).
- Mã trang (`T1`, `B4`, `O3`, `M12`), mã quy tắc (`BR-xx`) và mã lỗi (`PAYMENT_EXPIRED`) dùng thống nhất giữa các file.
- Sơ đồ viết bằng Mermaid (hiển thị trực tiếp trên GitHub và VS Code).
- Khi thay đổi code ảnh hưởng nghiệp vụ, API hoặc DB: cập nhật tài liệu tương ứng **và** thêm một mục vào [nhat-ky-thay-doi.md](04-quan-ly-du-an/nhat-ky-thay-doi.md).
