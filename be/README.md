# Travelling App – Backend

REST API cho Travelling App: Node.js, Express 5, TypeScript, Prisma 7, MariaDB.

```bash
npm install
cp .env.example .env    # sửa DATABASE_URL, JWT_SECRET
npm run db:deploy       # tạo bảng
npm run db:seed         # dữ liệu demo
npm run dev             # http://localhost:3000, GET /health kiểm tra DB
npm test                # unit + integration test
```

Tài liệu:

- Kiến trúc, cấu trúc file, quy ước, thêm chức năng, migration: [../docs/03-trien-khai/backend.md](../docs/03-trien-khai/backend.md)
- Danh sách API: [../docs/02-thiet-ke/api.md](../docs/02-thiet-ke/api.md)
- Cơ sở dữ liệu: [../docs/02-thiet-ke/co-so-du-lieu.md](../docs/02-thiet-ke/co-so-du-lieu.md)
- Kiểm thử và Postman: [../docs/03-trien-khai/kiem-thu.md](../docs/03-trien-khai/kiem-thu.md)
- Biến môi trường, Docker: [../docs/03-trien-khai/deploy.md](../docs/03-trien-khai/deploy.md)
