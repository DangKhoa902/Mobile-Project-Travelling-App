# Đo và giám sát app khi đang hoạt động

Tài liệu này trả lời: **app có đang chạy không, chạy nhanh hay chậm, có lỗi gì, và đang được dùng ra sao** – cho API, web và app Android. Mỗi mục ghi rõ cái gì **đã có sẵn** trong code và cái gì **cần thêm**.

Triển khai: [trien-khai-production.md](trien-khai-production.md). Kiểm thử chức năng trước khi phát hành: [kiem-thu.md](kiem-thu.md).

## 1. Đo cái gì – chỉ tiêu mục tiêu

| Nhóm | Chỉ số | Mục tiêu cho đồ án | Đo bằng |
|---|---|---|---|
| Sẵn sàng | API trả lời `/health` | ≥ 99% thời gian trong tháng | Uptime monitor (mục 2) |
| Tốc độ API | Thời gian phản hồi p95 các API đọc (danh sách, chi tiết) | ≤ 300 ms | Log request trên dữ liệu thật (mục 3); `curl`, autocannon, k6 (mục 4) |
| | p95 tạo booking (`POST /bookings`) | ≤ 800 ms | k6 |
| Lỗi API | Tỷ lệ phản hồi 5xx | < 1% | Log request (mục 3), Sentry (mục 8) |
| Tài nguyên | CPU VPS / RAM / ổ đĩa | < 70% / < 80% / < 80% | `docker stats`, `df -h` (mục 5) |
| Web | LCP / INP / CLS (Core Web Vitals) | ≤ 2,5 s / ≤ 200 ms / ≤ 0,1 | Lighthouse, PageSpeed Insights (mục 6) |
| Android | Thời gian mở app lạnh | ≤ 3 s trên máy tầm trung | `adb` (mục 7) |
| | Khung hình khi cuộn danh sách | ≥ 55 fps, ít khung "jank" | `adb shell dumpsys gfxinfo`, Perf Monitor |
| | Crash | Không có crash ở luồng demo | Logcat; Sentry cho app (đề xuất, mục 8) |
| Nghiệp vụ | Booking, tỷ lệ hủy, doanh thu, việc tồn đọng | Theo dõi xu hướng | `/api/stats/overview`, M1 (mục 9) |

## 2. Có đang chạy không (uptime)

**Đã có:**

- `GET /health` – trả `{"status":"ok","database":"connected"}` (200) hoặc `disconnected` (503) khi mất kết nối DB.
- Docker `HEALTHCHECK` gọi `/health` mỗi 30 giây; `docker compose ps` hiện `healthy` / `unhealthy`; `restart: unless-stopped` tự khởi động lại container khi tiến trình chết.

**Cần bật thêm (miễn phí, không sửa code):** một dịch vụ kiểm tra từ bên ngoài – UptimeRobot, Better Stack Uptime hoặc Uptime Kuma (tự host).

| Monitor | URL | Chu kỳ | Báo khi |
|---|---|---|---|
| API | `https://api.example.com/health` | 1–5 phút | Không phải 200 hoặc không có chữ `connected` (kiểu "Keyword") |
| Web | `https://app.example.com/` | 5 phút | Không phải 200 |
| Chứng chỉ HTTPS | cả hai domain | 1 ngày | Còn < 14 ngày hết hạn (Caddy tự gia hạn; báo nghĩa là gia hạn lỗi) |

Đặt kênh báo: email + Telegram/Discord của nhóm.

## 3. Log – chuyện gì đã xảy ra

**Đã có:**

| Log | Nội dung | Xem bằng |
|---|---|---|
| **Mỗi request API** (`REQUEST_LOG=true`, mặc định bật) | Một dòng JSON: thời điểm, level, mã request, method, route (số đã thay bằng `:id`), status, thời gian xử lý (ms), id người dùng nếu đã đăng nhập. Không ghi `/health`, query string, body, header `Authorization` | `docker compose logs api` |
| Request chậm | Cùng dòng trên với `"level":"warn"` khi `ms ≥ SLOW_REQUEST_MS` (mặc định 1000) | `grep '"level":"warn"'` |
| Lỗi 500 | Dòng JSON `"level":"error"` có mã request và route, rồi stack trace; response cho client chỉ có "Lỗi hệ thống" + `requestId` | `grep '"level":"error"'` |
| Khởi động | `API server listening on port 3000 (production)`; lỗi biến môi trường in rõ biến nào sai | `docker compose logs api` |
| Job nền | `expireOverdueBookings failed`, `dispatchPendingPush failed` khi lỗi (cũng gửi Sentry) | như trên |
| Email (chế độ console) | Nội dung email gửi đi | như trên |
| Caddy | Request HTTP ở tầng proxy (bật `log` trong Caddyfile để có đủ) | `docker compose logs caddy` |
| Nhật ký quản trị | Ai làm gì trong khu quản trị | M15 / `GET /api/audit-logs` |

Ví dụ dòng log thật (đo trên máy dev):

```json
{"t":"2026-10-24T15:29:17.443Z","level":"warn","id":"85646b4c-a06a-4566-beac-ca5f05f2ba42","method":"GET","route":"/api/destinations","status":200,"ms":126}
{"t":"2026-10-24T15:29:17.658Z","level":"info","id":"67586db1-93d7-4aed-81d9-0a920a61d249","method":"GET","route":"/api/bookings/:id","status":401,"ms":3}
```

**Mã request (`X-Request-Id`):** mọi response có header này; lỗi 500 trả thêm `requestId` trong body. Người dùng báo lỗi kèm mã → `docker compose logs api | grep <mã>` ra đúng request, và tìm được sự kiện tương ứng trên Sentry (tag `request_id`). Proxy / client có thể tự gửi `X-Request-Id` (8–64 ký tự chữ, số, `.`, `_`, `-`), API giữ nguyên để nối log hai tầng.

Lệnh hay dùng (cần `jq`: `apt install jq`):

```bash
docker compose logs -f --since 10m api                                  # theo dõi trực tiếp
L() { docker compose logs --since 24h --no-log-prefix api | grep '^{"t"'; }   # các dòng log request trong 24 giờ

L | jq -s 'length'                                                       # số request
L | jq -s '[.[] | select(.status >= 500)] | length'                      # số lỗi 5xx
L | jq -s '[.[].ms] | sort | .[(length * 0.95 | floor)]'                 # p95 toàn bộ (ms)
L | jq -s 'group_by(.route) | map({route: .[0].route, n: length, p95: ([.[].ms] | sort | .[(length * 0.95 | floor)])}) | sort_by(-.p95) | .[:10]'   # 10 route chậm nhất
L | jq -c 'select(.level == "warn")' | tail -20                          # 20 request chậm gần nhất
```

Log được xoay vòng (10 MB × 5 file) theo `docker-compose.prod.yml`, không làm đầy ổ đĩa. Muốn giữ lâu hơn hoặc tìm kiếm trên giao diện: đẩy log Docker sang Better Stack Logs / Grafana Loki.

## 4. Tốc độ API

### 4.1. Đo nhanh một request

```bash
curl -s -o /dev/null -w "status=%{http_code} ttfb=%{time_starttransfer}s total=%{time_total}s\n" "https://api.example.com/api/destinations?sort=popular"
```

`ttfb` = thời gian máy chủ xử lý + mạng; chạy từ chính VPS (`http://127.0.0.1:3000`) để tách phần mạng ra.

### 4.2. Đo chịu tải với autocannon (không cần cài)

```bash
npx autocannon@8 -c 20 -d 10 "http://127.0.0.1:3000/api/destinations?sort=popular"
```

**Số liệu nền đã đo** (25/10/2026, máy dev Windows, API chạy bằng `tsx`, MariaDB local, dữ liệu seed):

| API | Kết nối đồng thời | Request/giây | p50 | p97,5 | p99 | Lỗi |
|---|---|---|---|---|---|---|
| `GET /api/destinations?sort=popular` | 20 | ~408 | 42 ms | 92 ms | 120 ms | 0 |
| `GET /health` (1 request) | 1 | – | 5 ms | – | – | 0 |

Đo lại cùng lệnh trên VPS sau khi triển khai để có số liệu thật; so sánh mỗi lần phát hành để phát hiện chậm đi.

### 4.3. Kịch bản tải nhiều bước với k6

Cài k6 (`winget install k6` hoặc `choco install k6` trên Windows, `apt install k6` trên Ubuntu theo k6.io). Lưu thành `be/loadtest/browse.js`:

```js
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 20 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<300"],
    http_req_failed: ["rate<0.01"],
  },
};

const BASE = __ENV.BASE_URL || "http://127.0.0.1:3000";
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

export default function () {
  const list = http.get(`${BASE}/api/destinations?sort=popular`);
  check(list, { "danh sách 200": (r) => r.status === 200 });

  const detail = http.get(`${BASE}/api/destinations/da-lat-pine-hill-resort`);
  check(detail, { "chi tiết 200": (r) => r.status === 200 });

  const pkg = detail.json("data.packages.0.id");
  const room = detail.json("data.roomTypes.0.id");
  const quote = http.post(
    `${BASE}/api/bookings/quote`,
    JSON.stringify({ packageId: pkg, roomTypeId: room, checkInDate: day(40), checkOutDate: day(42), guests: 2, roomsCount: 1 }),
    { headers: { "Content-Type": "application/json" } },
  );
  check(quote, { "báo giá 200": (r) => r.status === 200 });
  sleep(1);
}
```

```bash
k6 run -e BASE_URL=https://api.example.com be/loadtest/browse.js
```

k6 báo đạt/không đạt theo `thresholds`. **Không chạy tải vào API production lúc có người dùng**, và không chạy kịch bản đăng nhập/đăng ký (bị giới hạn 20 lần / 15 phút / IP, và tạo rác trong DB).

### 4.4. Khi API chậm – tìm nguyên nhân

| Dấu hiệu | Kiểm tra | Hướng xử lý |
|---|---|---|
| Mọi API chậm | `docker stats` CPU API ~100% | VPS mạnh hơn; xem có job nào chạy liên tục |
| Chỉ API có DB chậm | Slow query log (mục 5.2) | Thêm index; giảm dữ liệu trả về (`select`) |
| Chậm theo đợt | `SHOW STATUS LIKE 'Threads_connected'` gần `DATABASE_CONNECTION_LIMIT` | Tăng `DATABASE_CONNECTION_LIMIT` (mặc định 5) |
| Tìm kiếm chậm khi dữ liệu lớn | Tìm `LIKE '%...%'` trên `searchText` không dùng được index | Chấp nhận với dữ liệu đồ án; dữ liệu lớn → máy tìm kiếm riêng (Meilisearch) |

## 5. Máy chủ và database

### 5.1. Tài nguyên

```bash
docker stats --no-stream                         # CPU, RAM từng container
df -h /                                          # ổ đĩa
du -sh /var/lib/docker/volumes/*                 # dung lượng DB, uploads
free -h
```

### 5.2. MariaDB

```bash
# Vào MariaDB
docker compose exec db sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" travelling_app'
```

```sql
-- Số kết nối và truy vấn đang chạy
SHOW STATUS LIKE 'Threads_connected';
SHOW FULL PROCESSLIST;

-- Dung lượng từng bảng
SELECT table_name, ROUND((data_length + index_length) / 1024 / 1024, 1) AS mb
FROM information_schema.tables WHERE table_schema = 'travelling_app' ORDER BY mb DESC;

-- Bật log truy vấn chậm hơn 0,5 giây (mất khi khởi động lại DB)
SET GLOBAL slow_query_log = 1;
SET GLOBAL long_query_time = 0.5;
```

Xem log chậm: `docker compose exec db sh -c 'cat /var/lib/mysql/*-slow.log'`. Muốn bật cố định: thêm `--slow-query-log=1 --long-query-time=0.5` vào `command` của service `db`.

### 5.3. Hàng đợi trong DB cần để ý

| Câu SQL | Bình thường | Bất thường |
|---|---|---|
| `SELECT COUNT(*) FROM Notification WHERE pushedAt IS NULL;` | ~0 khi `PUSH_ENABLED=true` | Tăng dần → job push lỗi (xem log `dispatchPendingPush failed`) |
| `SELECT COUNT(*) FROM Booking WHERE status='PENDING' AND paymentDueAt < NOW();` | 0–vài dòng | Tăng dần → job hủy booking quá hạn không chạy |
| `SELECT COUNT(*) FROM RefreshToken WHERE revokedAt IS NULL AND expiresAt > NOW();` | ≈ số thiết bị đang đăng nhập | Tăng rất nhanh → client làm mới token sai cách (mỗi request một phiên) |

## 6. Web

**Lighthouse** (Chrome DevTools → Lighthouse → Mobile → Analyze) hoặc **PageSpeed Insights** (pagespeed.web.dev, dùng được khi web đã có domain thật):

| Trang đo | Vì sao |
|---|---|
| `/` (T1) | Trang vào đầu tiên |
| `/destinations/da-lat-pine-hill-resort` (D2) | Nhiều ảnh nhất |
| `/search?q=da lat` (D1) | Danh sách dài |

| Chỉ số | Tốt | Cần cải thiện | Thường do |
|---|---|---|---|
| LCP – nội dung lớn nhất hiện ra | ≤ 2,5 s | > 4 s | Ảnh to: tải ảnh đã nén, `expo-image` |
| INP – độ trễ khi chạm/bấm | ≤ 200 ms | > 500 ms | Render lại cả danh sách khi gõ: debounce, `FlatList` |
| CLS – bố cục nhảy | ≤ 0,1 | > 0,25 | Ảnh không đặt sẵn tỷ lệ: luôn đặt `aspectRatio` |

Kích thước bundle: sau `npx expo export --platform web`, xem `du -sh dist/_expo/static/js/web/*` (Windows: Explorer → Properties). Ghi lại mỗi lần phát hành; tăng đột biến = vừa thêm thư viện nặng.

Lỗi JavaScript phía người dùng web: DevTools → Console khi tự thử; thu thập tự động từ người dùng thật cần Sentry (mục 8).

## 7. App Android

### 7.1. Đo bằng `adb` trên máy thật

Bật "Tùy chọn nhà phát triển" → "Gỡ lỗi USB", cắm máy, cài APK bản `preview`/`production` (không đo trên bản dev: chậm hơn nhiều).

```bash
adb devices                                                         # thấy máy
# Thời gian mở lạnh (đóng hẳn app trước): xem dòng TotalTime (ms)
adb shell am force-stop com.travellingapp.app
adb shell am start -W -n com.travellingapp.app/.MainActivity

# Bộ nhớ đang dùng: xem dòng TOTAL PSS
adb shell dumpsys meminfo com.travellingapp.app

# Khung hình: reset, cuộn danh sách T1 khoảng 10 giây, rồi đọc "Janky frames" và các percentile
adb shell dumpsys gfxinfo com.travellingapp.app reset
adb shell dumpsys gfxinfo com.travellingapp.app

# Log lỗi JavaScript / crash native
adb logcat *:E ReactNativeJS:V
```

Đo mỗi chỉ số 3–5 lần, lấy trung vị; ghi vào bảng dưới cho mỗi bản phát hành:

| Phiên bản | Máy | Dung lượng APK | Mở lạnh (TotalTime) | RAM (TOTAL PSS) | Janky frames khi cuộn T1 |
|---|---|---|---|---|---|
| 1.0.0 | | | | | |

### 7.2. Công cụ khác

| Công cụ | Dùng khi |
|---|---|
| **Perf Monitor** (development build → lắc máy / `adb shell input keyevent 82` → Perf Monitor) | Xem FPS luồng JS và luồng UI trực tiếp khi thao tác |
| **Android Studio → Profiler** | Xem CPU, bộ nhớ, mạng theo thời gian khi nghi rò rỉ bộ nhớ |
| **React DevTools Profiler** (`j` trong terminal Metro để mở DevTools) | Tìm component render lại quá nhiều |
| **Flashlight** (github.com/bamlab/flashlight) | Chấm điểm hiệu năng app React Native trên Android, so sánh giữa các bản |

### 7.3. Thử trong điều kiện xấu

| Tình huống | Cách tạo | Mong đợi |
|---|---|---|
| Mạng chậm | Emulator → Extended controls → Cellular → Network type "EDGE" | Có loading, không treo, không gửi trùng booking |
| Mất mạng giữa chừng | Bật chế độ máy bay khi đang ở B4 | Báo lỗi + nút Thử lại; không tạo booking 2 lần |
| App bị hệ điều hành đóng | Bật "Không giữ hoạt động" trong tùy chọn nhà phát triển, chuyển app khác rồi quay lại | Quay về đúng trang, nháp đặt chỗ còn |
| Token hết hạn | Đặt `JWT_EXPIRES_IN=1m` trên API thử, để app 2 phút rồi thao tác | Tự làm mới token, không bị đăng xuất |

## 8. Thu thập lỗi bằng Sentry

**Backend – đã có.** Đặt `SENTRY_DSN` (tạo project Node.js trên sentry.io, gói miễn phí) là API gửi lên Sentry mọi lỗi 500 và lỗi của job nền; để trống thì không gửi gì.

| Biến | Gợi ý |
|---|---|
| `SENTRY_DSN` | Lấy ở Sentry → Project Settings → Client Keys |
| `SENTRY_ENVIRONMENT` | `production`, `staging` (mặc định = `NODE_ENV`) |
| `SENTRY_RELEASE` | Tag git đang chạy, ví dụ `v1.1.0` – để biết lỗi xuất hiện từ bản nào |
| `SENTRY_TRACES_SAMPLE_RATE` | `0` = chỉ thu lỗi (mặc định); `0.1` = đo hiệu năng 10% request (tốn hạn mức) |

Mỗi sự kiện có: stack trace, tag `request_id`, `route`, `http.method` hoặc `job`, id người dùng (không có email, tên). Không gửi cookie, body, query string, header `Authorization` (cấu hình `dataCollection` + `beforeSend` trong `be/src/lib/monitoring.ts`).

Đã kiểm chứng với máy nhận Sentry giả lập trên máy dev: sự kiện có thông báo lỗi, mã request, id người dùng, phiên bản, không có header `Authorization`. **Chưa gửi thử lên sentry.io thật** – sau khi đặt DSN trên VPS, kiểm tra bằng cách tạm đổi `DATABASE_URL` sai trên bản thử, gọi một API rồi xem sự kiện trên Sentry.

Trên Sentry nên đặt **Alert**: "A new issue is created" → email/Discord; "Number of events > 20 trong 5 phút" → báo khẩn.

**App + web – cần thêm (đề xuất):** `@sentry/react-native` (có config plugin cho Expo) bắt crash, lỗi JavaScript, thời gian mở app, kèm phiên bản app và đời máy; cấu hình tương tự: không gửi token, đặt `environment`, `release` = `version` trong `app.json`. Khi đưa lên Google Play, mục **Android vitals** trong Play Console cũng báo tỷ lệ crash và ANR.

## 9. Số liệu nghiệp vụ

**Đã có:** `GET /api/stats/overview?from=&to=` (trang M1 cho admin, O1 cho chủ địa điểm).

| Câu hỏi vận hành | Lấy ở |
|---|---|
| Hôm nay có bao nhiêu booking, doanh thu bao nhiêu? | `revenueByDay` |
| Tỷ lệ hủy có tăng bất thường không? | `summary.cancellationRate` |
| Có việc nào tồn đọng? | `pending`: hồ sơ đối tác, tin đăng, đánh giá chờ duyệt; booking chờ xác nhận; hội thoại mở |
| Bao nhiêu tiền còn nợ chủ địa điểm? | `GET /api/payouts/preview`, `/api/payouts?status=PENDING` |
| Ai vừa đổi giá, khóa tài khoản, duyệt đối tác? | `GET /api/audit-logs` (M15) |

Ngưỡng nên theo dõi: booking `PENDING` trả tại nơi ở chờ xác nhận quá 24 giờ; hồ sơ đối tác chờ duyệt quá 3 ngày; tỷ lệ hủy tuần này cao gấp đôi tuần trước.

## 10. Lịch kiểm tra định kỳ

| Tần suất | Việc |
|---|---|
| Hằng ngày (2 phút) | Uptime monitor xanh; `docker compose ps` healthy; số lỗi 5xx và p95 trong 24 giờ (lệnh `jq` mục 3); issue mới trên Sentry; thẻ "Việc cần xử lý" ở M1 |
| Hằng tuần | `df -h`, dung lượng DB; bản sao lưu mới nhất tồn tại và có dung lượng hợp lý; chạy autocannon so với số liệu nền |
| Mỗi lần phát hành | Chạy `npm test` + Postman; Lighthouse 3 trang; đo APK theo bảng mục 7.1; ghi kết quả vào [nhat-ky-thay-doi.md](../04-quan-ly-du-an/nhat-ky-thay-doi.md) |
| Hằng tháng | Lập kỳ đối soát cho chủ địa điểm; thử khôi phục bản sao lưu; cập nhật hệ điều hành VPS (`apt upgrade`) và image Docker |

## 11. Xử lý sự cố thường gặp

| Sự cố | Kiểm tra | Xử lý |
|---|---|---|
| `/health` trả `disconnected` | `docker compose ps db`, `docker compose logs db` | Ổ đầy → dọn log/backups cũ; DB chết → `docker compose restart db` |
| API không lên sau cập nhật | `docker compose logs api` | Lỗi biến môi trường: sửa `.env`; migration lỗi: khôi phục DB + quay lại tag cũ ([trien-khai-production.md](trien-khai-production.md) mục 8) |
| Web báo lỗi CORS | Console trình duyệt | `CORS_ORIGINS` chưa có domain web (đúng `https://`, không có `/` cuối) |
| Người dùng không nhận email | Log API khi gọi quên mật khẩu | `EMAIL_TRANSPORT=smtp`; App Password Gmail; xem thư mục Spam; đặt SPF/DKIM nếu dùng domain riêng |
| Không nhận push | `SELECT COUNT(*) FROM Notification WHERE pushedAt IS NULL`; log `dispatchPendingPush failed` | `PUSH_ENABLED=true`; FCM V1 đã tải lên EAS; app đã gọi `POST /api/devices` |
| Ảnh tải lên không hiện | Mở URL ảnh trực tiếp | `PUBLIC_BASE_URL` sai domain; volume `uploads` chưa gắn; dùng S3 thì `S3_PUBLIC_URL` sai |
| Người dùng bị đăng xuất liên tục | Số dòng `RefreshToken` tăng nhanh; log 401 dồn dập | Client gọi `/auth/refresh` song song; sửa interceptor ([yeu-cau-frontend.md](yeu-cau-frontend.md) mục 5.3) |
| HTTPS lỗi | `docker compose logs caddy` | DNS chưa trỏ đúng IP; cổng 80/443 bị chặn |
