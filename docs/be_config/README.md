# Hướng dẫn phát triển backend

Backend nằm trong thư mục `be/`, dùng Node.js, TypeScript, Express 5, Prisma 7 và MariaDB. Tài liệu này mô tả cấu trúc hiện tại, chỉ rõ code thuộc file nào, và hướng dẫn các thao tác thường dùng.

## Cấu trúc file

```text
be/
├── .env                         # Cấu hình local; không commit
├── .env.example                 # Mẫu biến môi trường
├── package.json                 # Dependencies và lệnh npm
├── prisma.config.ts             # Prisma CLI: schema, migrations, DATABASE_URL
├── prisma/
│   ├── schema.prisma            # Models, fields, relations, types
│   └── migrations/              # SQL migration được Prisma tạo
├── src/
│   ├── app.ts                   # Middleware và mount router
│   ├── server.ts                # Port, listen và shutdown
│   ├── routes/                  # HTTP routes, tách riêng theo resource/bảng
│   │   ├── user.routes.ts
│   │   ├── destination.routes.ts
│   │   └── booking.routes.ts
│   ├── dao/                     # Truy vấn Prisma, tách riêng theo bảng
│   │   ├── user.dao.ts
│   │   ├── destination.dao.ts
│   │   └── booking.dao.ts
│   ├── lib/
│   │   └── prisma.ts            # Khởi tạo Prisma Client + MariaDB adapter
│   └── generated/prisma/        # Prisma Client được generate; không sửa tay
└── tsconfig.json                # Cấu hình TypeScript
```

## Luồng của một request

```text
HTTP client
  → src/server.ts (lắng nghe port)
  → src/app.ts (middleware và mount router)
  → src/routes/<resource>.routes.ts (HTTP endpoint)
  → src/dao/<model>.dao.ts (truy vấn Prisma)
  → src/lib/prisma.ts (Prisma Client)
  → MariaDB
```

- `prisma/schema.prisma`: mô tả database bằng Prisma Schema Language.
- `prisma.config.ts`: cho Prisma CLI biết đường dẫn schema, thư mục migrations và URL database.
- `src/lib/prisma.ts`: tạo adapter kết nối MariaDB và export một Prisma Client dùng chung.
- `src/app.ts`: cấu hình middleware và mount router; giữ file này gọn.
- `src/server.ts`: chạy HTTP server; không đặt truy vấn hoặc định nghĩa model ở đây.
- `src/routes/*.routes.ts`: khai báo endpoint HTTP theo resource/bảng, kiểm tra input cơ bản, gọi DAO và trả response.
- `src/dao/*.dao.ts`: chứa truy vấn Prisma cho từng model/bảng; không xử lý HTTP ở đây.

## 1. Cấu hình môi trường

Trong `be/.env`, đặt URL kết nối và port. Giữ file này ở local, không đưa mật khẩu thật vào Git.

```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/travelling_app"
PORT=3000
```

`mysql://` là scheme Prisma dùng cho MariaDB. Nếu username hoặc password có ký tự đặc biệt trong URL (ví dụ `@`, `#`, `/`), hãy URL-encode ký tự đó. Mẫu biến nằm trong `be/.env.example`; không đặt URL connection thứ hai trong code.

`be/prisma.config.ts` đọc `DATABASE_URL` để chạy các lệnh Prisma. Ứng dụng runtime cũng đọc biến này trong `be/src/lib/prisma.ts` và chuyển thông tin URL cho `PrismaMariaDb` adapter.

## 2. Thêm hoặc chỉnh sửa bảng/model

Sửa `be/prisma/schema.prisma`. Model tương ứng với bảng; field tương ứng với cột. Ví dụ model hiện có:

```prisma
model Destination {
  id          Int       @id @default(autoincrement())
  name        String
  description String?   @db.Text
  location    String
  imageUrl    String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  bookings Booking[]
}
```

Ví dụ thêm một model `Review` có quan hệ tới `User` và `Destination`:

```prisma
model Review {
  id            Int         @id @default(autoincrement())
  rating        Int
  comment       String?     @db.Text
  userId        Int
  destinationId Int
  createdAt     DateTime    @default(now())

  user        User        @relation(fields: [userId], references: [id])
  destination Destination @relation(fields: [destinationId], references: [id])
}
```

Khi thêm model có quan hệ ngược, thêm field quan hệ vào model hiện có, ví dụ `reviews Review[]` trong `User` và `Destination`. Với field bắt buộc mới trên bảng đã có dữ liệu, đặt giá trị mặc định hoặc triển khai migration theo nhiều bước để dữ liệu cũ cũng hợp lệ.

Tạo và áp dụng migration trong môi trường phát triển:

```bash
cd be
npm run db:migrate -- --name add_review
```

Prisma sẽ tạo SQL dưới `be/prisma/migrations/`, áp dụng migration lên MariaDB và generate lại Prisma Client. Nếu chỉ sửa schema và cần generate client mà chưa migrate:

```bash
npm run db:generate
```

Không chỉnh tay `src/generated/prisma/`; thư mục đó là output được sinh từ schema. Không xóa hay sửa migration đã được chia sẻ/áp dụng ở môi trường chung; tạo migration mới để thay đổi tiếp.

## 3. Tách route và DAO theo bảng

`src/app.ts` không chứa toàn bộ endpoint. File này cấu hình middleware và mount router theo prefix:

```ts
app.use("/api/users", userRouter);
app.use("/api/destinations", destinationRouter);
app.use("/api/bookings", bookingRouter);
```

Mỗi bảng có hai file riêng:

| Phần | File hiện tại | Trách nhiệm |
|---|---|---|
| HTTP routes | `be/src/routes/user.routes.ts` | URL, HTTP status, đọc/kiểm tra params, gọi DAO, trả response |
| User queries | `be/src/dao/user.dao.ts` | Truy vấn Prisma cho model `User` |
| HTTP routes | `be/src/routes/destination.routes.ts` | Endpoint địa điểm |
| Destination queries | `be/src/dao/destination.dao.ts` | Truy vấn Prisma cho model `Destination` |
| HTTP routes | `be/src/routes/booking.routes.ts` | Endpoint đặt chỗ |
| Booking queries | `be/src/dao/booking.dao.ts` | Truy vấn Prisma cho model `Booking` |

Các endpoint mẫu hiện có:

- `GET /api/users` và `GET /api/users/:id`
- `GET /api/destinations` và `GET /api/destinations/:id`
- `GET /api/bookings` và `GET /api/bookings/:id`

Route chi tiết nhận và kiểm tra ID, gọi DAO rồi trả JSON hoặc status `400`/`404`. Ví dụ, `user.routes.ts` gọi `userDao.findById(id)`; câu Prisma `findUnique` nằm trong `user.dao.ts`.

Khi thêm endpoint cho bảng hiện có, đặt HTTP handler vào router tương ứng và câu query vào DAO tương ứng. Khi thêm model mới, tạo `<model>.dao.ts` và `<resource>.routes.ts`, export router rồi mount router mới trong `src/app.ts`. Đặt route cụ thể như `/search` trước route tham số `/:id`.

DAO chỉ truy cập database; route chỉ xử lý HTTP. Không truyền trực tiếp `request.body` vào Prisma: validate input và chỉ chọn các field được phép. Khi thêm chức năng ghi, tạo phương thức DAO riêng như `create`, `update`, `delete` cùng endpoint phù hợp.

## 4. Truy vấn database bằng Prisma

DAO import singleton từ `be/src/lib/prisma.ts`; route nên gọi DAO thay vì tự truy vấn database:

```ts
import { prisma } from "../lib/prisma.js";
```

Đường dẫn import tùy vị trí file. Không tạo `new PrismaClient()` cho mỗi request.

### Đọc nhiều bản ghi

```ts
const destinations = await prisma.destination.findMany({
  where: { location: "Đà Nẵng" },
  orderBy: { name: "asc" },
  take: 20,
  select: { id: true, name: true, location: true, imageUrl: true },
});
```

### Đọc một bản ghi theo khóa chính hoặc điều kiện duy nhất

```ts
const destination = await prisma.destination.findUnique({
  where: { id: 1 },
});
```

`findUnique` cần field có `@id` hoặc `@unique`. Dùng `findFirst` cho điều kiện không duy nhất.

### Thêm bản ghi

```ts
const destination = await prisma.destination.create({
  data: {
    name: "Bãi biển Mỹ Khê",
    location: "Đà Nẵng",
    description: "Bãi biển tại Đà Nẵng",
    imageUrl: null,
  },
});
```

### Cập nhật và xóa

```ts
const updated = await prisma.destination.update({
  where: { id: 1 },
  data: { name: "Tên mới" },
});

const deleted = await prisma.destination.delete({
  where: { id: 1 },
});
```

`update` và `delete` theo unique key sẽ báo lỗi nếu không tìm thấy bản ghi. Hãy xử lý lỗi đó ở tầng route/service để trả HTTP status phù hợp.

### Lấy dữ liệu quan hệ

```ts
const booking = await prisma.booking.findUnique({
  where: { id: 1 },
  include: {
    user: { select: { id: true, name: true, email: true } },
    destination: { select: { id: true, name: true, location: true } },
  },
});
```

Dùng `select` để chỉ trả field cần thiết. Model `User` có field `password`, vì vậy không trả toàn bộ User ra API; tuyệt đối không trả password/hash về client.

### Transaction cho nhiều thao tác liên quan

```ts
const result = await prisma.$transaction(async (tx) => {
  const booking = await tx.booking.create({
    data: {
      bookingDate: new Date("2026-12-01T00:00:00.000Z"),
      userId: 1,
      destinationId: 1,
    },
  });

  // Thêm các thao tác cần cùng thành công/thất bại vào đây.
  return booking;
});
```

Nếu một thao tác trong transaction thất bại, Prisma rollback các thao tác thuộc transaction đó.

## 5. Tên Prisma model và tên bảng MariaDB

Theo mặc định, Prisma ánh xạ model `Destination` sang bảng database tương ứng theo quy ước của Prisma. Nếu database hiện có dùng tên bảng/cột khác, dùng `@@map("table_name")` trên model hoặc `@map("column_name")` trên field trong `schema.prisma`, sau đó tạo migration phù hợp. Kiểm tra migration SQL trước khi áp dụng vào database có dữ liệu.

## 6. Các lệnh thường dùng

Chạy từ thư mục `be/`:

| Lệnh | Công dụng |
|---|---|
| `npm run dev` | Chạy API development, tự reload khi sửa TypeScript |
| `npm run build` | Biên dịch TypeScript vào `dist/` |
| `npm start` | Chạy bản đã build |
| `npm run db:generate` | Generate Prisma Client từ schema |
| `npm run db:migrate -- --name ten_migration` | Tạo và áp dụng migration development |
| `npm run db:studio` | Mở giao diện xem/sửa dữ liệu database |

Health check hiện có tại `GET /health`; `GET /` xác nhận API đang chạy.

## 7. Vị trí đặt code khi bổ sung tính năng

Khi thêm ví dụ `GET /api/destinations`:

1. **Model và quan hệ:** `be/prisma/schema.prisma`.
2. **Thay đổi cấu trúc MariaDB:** migration do `npm run db:migrate` tạo trong `be/prisma/migrations/`.
3. **Kết nối DB:** tiếp tục dùng client singleton ở `be/src/lib/prisma.ts`.
4. **Truy vấn DB:** thêm phương thức trong DAO tương ứng, ví dụ `be/src/dao/destination.dao.ts`.
5. **HTTP endpoint:** khai báo trong router tương ứng, ví dụ `be/src/routes/destination.routes.ts`.
6. **Đăng ký router mới:** mount trong `be/src/app.ts`. Bảng mới cần DAO và router riêng.
7. **Startup/port:** `be/src/server.ts`; thường không cần sửa khi thêm endpoint.
8. **Biến môi trường:** thêm tên biến cần thiết vào `.env.example`, đọc giá trị thật từ `.env`; không commit bí mật.
9. **Sinh client và chạy:** `npm run db:generate` nếu schema đổi, sau đó `npm run dev`.
