# Travelling App – Frontend

Một codebase Expo (SDK 57) cho Android, iOS và Web. Cách chạy cả project (backend + frontend, tài khoản demo): [README ở thư mục gốc](../README.md).

```bash
npm install
npm run web        # http://localhost:8081
npm run android    # Android Emulator
npm start          # quét QR bằng Expo Go
```

| Việc | Lệnh |
|---|---|
| Typecheck | `npx tsc --noEmit` |
| Lint | `npx expo lint` |
| Build web | `npx expo export --platform web` (ra `dist/`) |
| Cài thư viện Expo | `npx expo install <tên>` (không dùng `npm install` cho thư viện native) |

Địa chỉ API: tự chọn theo nền tảng ([src/config/env.ts](src/config/env.ts)); đặt `EXPO_PUBLIC_API_URL` trong `fe/.env` để trỏ tới API khác.

Kiến trúc, quy ước, danh sách trang: [docs/03-trien-khai/yeu-cau-frontend.md](../docs/03-trien-khai/yeu-cau-frontend.md) và [docs/02-thiet-ke/giao-dien.md](../docs/02-thiet-ke/giao-dien.md).
