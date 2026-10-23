# Lộ trình phát triển ứng dụng du lịch

Tài liệu này ghi nhận trạng thái nhìn thấy trong repository và các mục tiêu phát triển tiếp theo. Các giai đoạn tương lai là kế hoạch, chưa được xem là tính năng đã hoàn thành.

## Tầm nhìn sản phẩm

Xây dựng ứng dụng du lịch chạy trên Android, iOS và web, giúp người dùng tìm cảm hứng, khám phá điểm đến và lên kế hoạch cho chuyến đi.

## Giai đoạn 1 — Khởi tạo nền tảng ứng dụng

**Mục tiêu:** Tạo frontend đa nền tảng có thể mở rộng.

**Đã đạt được:**

- Expo, React Native và TypeScript.
- Expo Router với các route đặt trong `fe/src/app`.
- Cấu hình chạy web và native trong cùng codebase.
- Cấu trúc component, theme và cấu hình dự án nằm trong `fe`.

**Kết quả mong đợi:** Có nền tảng để phát triển các màn hình sản phẩm trên nhiều nền tảng.

## Giai đoạn 2 — Xây dựng trải nghiệm khám phá ban đầu

**Mục tiêu:** Thay nội dung hướng dẫn mặc định bằng giao diện phù hợp với ứng dụng du lịch.

**Đã đạt được:**

- Trang chính có lời chào, ô tìm kiếm giao diện, banner cảm hứng và thẻ điểm đến mẫu.
- Trang danh mục có gợi ý tuần và nhóm khám phá theo sở thích.
- Tab web và native có nhãn tiếng Việt.
- Theme sáng dùng tông màu thiên nhiên; cấu hình splash dùng màu nền của ứng dụng.
- Loại bỏ nội dung giới thiệu Expo và badge Expo khỏi giao diện đang dùng.

**Giới hạn hiện tại:** Nội dung điểm đến đang là dữ liệu tĩnh minh họa; ô tìm kiếm và các nút/thẻ chưa kết nối tới dữ liệu hoặc luồng nghiệp vụ.

## Giai đoạn 3 — Hoàn thiện thiết kế và điều hướng

**Mục tiêu:** Chuyển giao diện ban đầu thành luồng sản phẩm nhất quán.

**Các mục tiêu cần thực hiện:**

- Chuẩn hóa design system: màu sắc, chữ, khoảng cách, trạng thái tương tác.
- Hoàn thiện responsive layout cho điện thoại, máy tính bảng và trình duyệt desktop.
- Xây dựng chi tiết điểm đến, tìm kiếm, lọc và điều hướng giữa các màn hình.
- Bổ sung trạng thái tải, rỗng, lỗi và accessibility.
- Thay emoji/đồ họa tạm bằng ảnh và tài nguyên thương hiệu phù hợp.

**Tiêu chí hoàn thành đề xuất:** Người dùng có thể đi từ danh sách/gợi ý tới trang chi tiết điểm đến trên cả web và mobile; giao diện hoạt động tốt ở các kích thước màn hình mục tiêu.

## Giai đoạn 4 — Dữ liệu và backend

**Mục tiêu:** Phục vụ nội dung du lịch từ nguồn dữ liệu thực.

**Trạng thái:** Chưa thấy backend được triển khai trong thư mục `be` tại thời điểm ghi tài liệu.

**Các mục tiêu cần thực hiện:**

- Chọn và ghi lại API/backend, cấu trúc dữ liệu điểm đến, địa điểm và chuyến đi.
- Tích hợp gọi API, quản lý trạng thái tải/lỗi và cache phù hợp.
- Lưu cấu hình nhạy cảm trong biến môi trường; không commit secret.
- Xác định cách phân trang, tìm kiếm, lọc và xử lý dữ liệu thiếu.

**Tiêu chí hoàn thành đề xuất:** Màn hình sản phẩm lấy dữ liệu qua API và trình bày được cả trạng thái thành công, rỗng, tải và lỗi.

## Giai đoạn 5 — Tài khoản và lập kế hoạch chuyến đi

**Mục tiêu:** Cá nhân hóa nội dung và cho phép người dùng quản lý chuyến đi.

**Các mục tiêu cần thực hiện:**

- Xác định yêu cầu đăng nhập, hồ sơ và quyền riêng tư.
- Cho phép lưu điểm đến yêu thích.
- Tạo, xem và chỉnh sửa hành trình.
- Đồng bộ dữ liệu người dùng giữa các thiết bị nếu backend hỗ trợ.

**Tiêu chí hoàn thành đề xuất:** Người dùng có thể lưu địa điểm và quản lý hành trình của mình qua các phiên sử dụng.

## Giai đoạn 6 — Kiểm thử, phát hành và vận hành

**Mục tiêu:** Tăng độ tin cậy và chuẩn bị phát hành.

**Các mục tiêu cần thực hiện:**

- Thiết lập lint, typecheck và kiểm thử phù hợp với cấu trúc dự án.
- Kiểm tra các luồng chính trên web và thiết bị/emulator Android; kiểm tra iOS khi có môi trường.
- Kiểm tra cấu hình build, icon, splash, quyền truy cập, hiệu năng và accessibility.
- Viết hướng dẫn phát hành, theo dõi lỗi và quy trình cập nhật.

**Tiêu chí hoàn thành đề xuất:** Quy trình build có thể lặp lại; các luồng chính được kiểm tra trên nền tảng mục tiêu; có hướng dẫn phát hành và xử lý lỗi.

## Cập nhật tiến độ

Khi một mục tiêu được hoàn thành, cập nhật mục tương ứng với ngày, thay đổi cụ thể và bằng chứng trong repository. Giữ rõ sự khác biệt giữa phần đã triển khai và phần còn là kế hoạch.
