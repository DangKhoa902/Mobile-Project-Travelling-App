# Git workflow và chạy dự án

Hướng dẫn làm việc với repository Travelling App. Frontend Expo nằm trong thư mục `fe` ở repository gốc.

Viết comment theo mô tả
[Link hướng dẫn viết comment: ](https://leaf-mall-f97.notion.site/Commit-Github-33dead77c31180139393d2f32e5a9e6c)

Ví dụ:

- feat: add login screen
- feat: add product list
- fix: validate login form
- refactor: extract product card
- docs: add installation guide
- test: add cart unit tests

## Yêu cầu

- Git.
- Node.js tương thích với Expo SDK của dự án.
- npm (repository frontend có `fe/package-lock.json`).
- Expo Go hoặc Android Emulator nếu muốn chạy trên Android. Web có thể chạy bằng trình duyệt.

Kiểm tra công cụ:

```bash
git --version
node --version
npm --version
```

## Clone hoặc pull repository

Clone repo một lần bằng URL Git do nhóm cung cấp:

```bash
git clone <REPOSITORY_URL>
cd <REPOSITORY_FOLDER>
```

Nếu thư mục repo đã tồn tại, vào đúng thư mục gốc và kiểm tra remote/nhánh:

```bash
git remote -v
git branch --show-current
git status
```

Lấy thay đổi mới nhất từ remote cho nhánh hiện tại:

```bash
git pull --rebase
```

Nếu repository chưa có remote, thêm URL được nhóm cung cấp rồi xác nhận nhánh mặc định trước khi pull:

```bash
git remote add origin <REPOSITORY_URL>
git fetch origin
git branch -r
```

Sau đó checkout nhánh làm việc tương ứng, ví dụ:

```bash
git switch -c <BRANCH_NAME> --track origin/<BRANCH_NAME>
```

Không dùng `git reset --hard` để xử lý xung đột nếu chưa sao lưu thay đổi local; lệnh đó có thể xóa công việc chưa commit.

## Cài dependency và chạy ứng dụng

Các lệnh frontend chạy từ `fe`:

```bash
cd fe
npm ci
npm run start
```

Expo mở menu dev server. Nhấn `w` để mở web, hoặc `a` để mở Android emulator. Có thể chạy trực tiếp:

```bash
npm run web
npm run android
```

Để chạy trên iOS simulator, cần macOS và môi trường iOS phù hợp:

```bash
npm run ios
```

`npm ci` cài đúng phiên bản theo lockfile. Dùng `npm install` khi chủ động thay đổi dependency để cập nhật lockfile tương ứng.

## Nhánh và commit

Tạo nhánh cho từng thay đổi thay vì commit trực tiếp lên nhánh mặc định:

```bash
git switch -c <type>/<short-description>
```

Ví dụ: `feat/destination-search`, `fix/tab-layout`, `docs/git-workflow`.

Kiểm tra thay đổi trước khi commit:

```bash
git status
git diff
git diff --check
```

Stage các file liên quan và commit với thông điệp mô tả kết quả:

```bash
git add <FILE_OR_DIRECTORY>
git commit -m "docs: add repository workflow"
```

Một số tiền tố thường dùng: `feat` (tính năng), `fix` (sửa lỗi), `docs` (tài liệu), `refactor` (tái cấu trúc), `chore` (bảo trì).

## Push và tạo comment cho nhóm xem xét

Push nhánh hiện tại lần đầu:

```bash
git push -u origin <BRANCH_NAME>
```

Các lần tiếp theo:

```bash
git push
```

Sau khi push, mở nền tảng Git nhóm đang dùng (ví dụ GitHub/GitLab) và tạo Pull Request hoặc Merge Request vào nhánh đích. Nếu remote chưa được cấu hình, hãy lấy URL và quy trình review từ nhóm thay vì đoán.

### Comment trong Pull Request / Merge Request

1. Mở PR/MR của nhánh vừa push.
2. Viết phần mô tả ngắn: thay đổi gì, vì sao, cách kiểm tra và điều còn hạn chế.
3. Dùng comment tổng quát cho thảo luận; dùng review comment trên dòng code cụ thể khi góp ý về dòng đó.
4. Đề cập người phụ trách bằng tính năng mention của nền tảng khi cần họ phản hồi.
5. Trả lời các góp ý, cập nhật code, commit và push tiếp lên cùng nhánh; PR/MR sẽ nhận commit mới.
6. Chỉ merge theo quy trình và quyền của repository nhóm.

Mẫu mô tả PR/MR:

```markdown
## Thay đổi

- Mô tả phần đã cập nhật.

## Kiểm tra

- Ghi lệnh hoặc thao tác đã chạy.

## Lưu ý

- Ghi giới hạn hoặc việc cần làm tiếp; nếu không có thì ghi "Không có".
```

### Comment qua Git CLI

Git CLI có thể tạo commit comment/thông điệp commit, nhưng không tự đăng review comment lên hosting. Để comment trong PR/MR, dùng giao diện hoặc CLI chính thức của nền tảng sau khi đã được cấu hình và xác thực. Tránh đưa token hoặc thông tin đăng nhập vào lệnh, file được commit hay comment công khai.

## Nếu có xung đột khi pull/rebase

Git sẽ liệt kê file xung đột. Mở từng file, chọn nội dung đúng và xóa dấu đánh dấu xung đột. Sau đó:

```bash
git add <RESOLVED_FILES>
git rebase --continue
```

Nếu cần quay lại trước khi rebase hoàn tất:

```bash
git rebase --abort
```

Sau rebase, push nhánh của mình bằng `git push --force-with-lease` chỉ khi cần cập nhật lịch sử đã rebase và chính sách nhóm cho phép. Không force push nhánh dùng chung.
