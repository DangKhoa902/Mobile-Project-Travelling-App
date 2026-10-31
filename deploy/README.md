# Triển khai lên `chantroixaxoi.xyz`

Bộ file trong thư mục này đã điền sẵn tên miền. Giải thích chi tiết từng bước: [docs/03-trien-khai/trien-khai-production.md](../docs/03-trien-khai/trien-khai-production.md).

| Địa chỉ | Dùng cho |
|---|---|
| `https://app.chantroixaxoi.xyz` | Bản web |
| `https://api.chantroixaxoi.xyz` | API + ảnh tải lên (app Android cũng gọi vào đây) |
| `https://chantroixaxoi.xyz` | Tự chuyển sang `app.` |

| File | Việc |
|---|---|
| `Caddyfile` | HTTPS tự động cho 3 tên miền trên |
| `../docker-compose.prod.yml` | Thêm Caddy vào docker compose |
| `env.production.example` | Mẫu `.env` cho VPS |
| `vps-setup.sh` | Cài Docker, tường lửa, swap trên VPS mới |
| `deploy.sh` | Build web + khởi động / cập nhật toàn bộ |
| `backup.sh` | Sao lưu DB + ảnh hằng ngày |
| `../fe/.env.production`, `../fe/eas.json` | Địa chỉ API cho bản web và APK |

## Bước 1 – Chờ tên miền được duyệt

Khi nhà cung cấp báo đã kích hoạt, kiểm tra trên trang quản lý tên miền: trạng thái **Active / Hoạt động**. Nếu nhà cung cấp gửi email yêu cầu **xác minh thông tin chủ thể** thì bấm link trong email (không xác minh trong ~15 ngày, tên miền có thể bị tạm khóa).

## Bước 2 – Thuê VPS

Ubuntu **24.04**, tối thiểu **1 vCPU / 2 GB RAM / 25 GB SSD**, có **IPv4**. Ghi lại **địa chỉ IP** và **mật khẩu root** (hoặc SSH key).

## Bước 3 – Tạo bản ghi DNS

Trong trang quản lý DNS của tên miền, thêm 4 bản ghi (thay `<IP>` bằng IP của VPS), TTL 300 hoặc mặc định:

| Loại | Tên (Host) | Giá trị |
|---|---|---|
| A | `api` | `<IP>` |
| A | `app` | `<IP>` |
| A | `@` | `<IP>` |
| A | `www` | `<IP>` |

Kiểm tra (vài phút đến vài giờ mới có hiệu lực) – phải ra đúng IP của VPS:

```bash
nslookup api.chantroixaxoi.xyz
```

## Bước 4 – Cài đặt trên VPS

```bash
ssh root@<IP>
git clone https://github.com/DangKhoa902/Mobile-Project-Travelling-App.git travelling
cd travelling
sh deploy/vps-setup.sh
cp deploy/env.production.example .env
nano .env            # điền các ô <...>; tạo chuỗi bí mật bằng: openssl rand -hex 32
sh deploy/deploy.sh
```

Repo đang để **public** thì clone thẳng; nếu **private** thì tạo Personal Access Token trên GitHub (quyền đọc repo) và dùng làm mật khẩu khi `git clone`.

## Bước 5 – Kiểm tra

```bash
curl https://api.chantroixaxoi.xyz/health        # {"status":"ok","database":"connected"}
docker compose logs -f caddy                     # không có lỗi lấy chứng chỉ
```

Mở `https://app.chantroixaxoi.xyz` trên trình duyệt, đăng ký một tài khoản. Bản demo: nạp dữ liệu mẫu bằng `docker compose exec api npm run db:seed` (tài khoản demo dùng mật khẩu `SEED_DEFAULT_PASSWORD` trong `.env`).

## Bước 6 – Sao lưu tự động

```bash
crontab -e
# thêm dòng:
0 3 * * * sh ~/travelling/deploy/backup.sh >> ~/travelling/backups/backup.log 2>&1
```

## Bước 7 – APK Android

Trên máy dev (đã có `fe/eas.json`, API trỏ về `https://api.chantroixaxoi.xyz/api`):

```bash
cd fe
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

## Cập nhật phiên bản mới

```bash
cd ~/travelling
sh deploy/backup.sh
git pull
sh deploy/deploy.sh
```

## Lỗi thường gặp

| Triệu chứng | Nguyên nhân / cách xử lý |
|---|---|
| Caddy báo lỗi lấy chứng chỉ, trình duyệt báo không an toàn | DNS chưa trỏ đúng IP (bước 3) hoặc cổng 80/443 bị chặn – kiểm tra `nslookup`, `ufw status`, tường lửa của nhà cung cấp VPS |
| Web hiện nhưng không tải được dữ liệu, lỗi CORS | `CORS_ORIGINS` trong `.env` phải đúng `https://app.chantroixaxoi.xyz`, rồi `docker compose ... up -d api` |
| Ảnh tải lên không hiện | `PUBLIC_BASE_URL` phải là `https://api.chantroixaxoi.xyz` |
| Build web / image bị "Killed" | VPS thiếu RAM – `vps-setup.sh` đã tạo swap 2 GB; kiểm tra `free -h` |
