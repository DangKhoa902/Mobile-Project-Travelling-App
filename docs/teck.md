# 🌍 Travelling App

> **Môn học:** Lập trình thiết bị di động
> **Trạng thái:** 🚧 Đang trong quá trình phát triển
> **Phiên bản:** Development / Prototype

## 📌 Giới thiệu

**Travelling App** là dự án được phát triển cho môn **Lập trình thiết bị di động**, hướng đến việc xây dựng một ứng dụng du lịch đa nền tảng.

Dự án hiện vẫn đang trong quá trình phát triển và **chưa phải phiên bản chính thức (Production Release)**. Các công nghệ, kiến trúc và chức năng có thể tiếp tục được điều chỉnh trong quá trình phát triển.

---

# 🛠️ Technology Stack

Hệ thống được xây dựng theo mô hình **Frontend – Backend – Database**, kết hợp với các công cụ phục vụ phát triển và kiểm thử.

```text
┌─────────────────────────────────────────────┐
│                 Travelling App              │
├─────────────────────────────────────────────┤
│                                             │
│  Frontend                                   │
│  React Native + Expo + TypeScript           │
│                                             │
│              │ HTTP / REST API              │
│              ▼                              │
│  Backend                                    │
│  Node.js + Express + TypeScript             │
│                                             │
│              │ Prisma ORM                   │
│              ▼                              │
│  Database                                   │
│  MariaDB                                    │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🎨 Frontend

Frontend chịu trách nhiệm xây dựng giao diện người dùng và xử lý các tương tác trên ứng dụng.

| Công nghệ              | Mục đích                                               |
| ---------------------- | ------------------------------------------------------ |
| **React Native**       | Xây dựng ứng dụng đa nền tảng                          |
| **Expo**               | Môi trường phát triển và chạy ứng dụng React Native    |
| **TypeScript**         | Cung cấp kiểu dữ liệu và hỗ trợ phát triển an toàn hơn |
| **Expo Router**        | Quản lý routing và điều hướng giữa các màn hình        |
| **NativeWind**         | Styling giao diện theo hướng utility-first             |
| **Axios**              | Gửi HTTP request đến Backend API                       |
| **Zustand**            | Quản lý state của ứng dụng                             |
| **@expo/vector-icons** | Cung cấp hệ thống icon cho giao diện                   |

### Các công nghệ chính

#### React Native

Được sử dụng để xây dựng giao diện ứng dụng mobile dựa trên React.

```text
React Native
     │
     ├── Android
     │
     └── iOS
```

#### Expo

Expo cung cấp môi trường và các công cụ hỗ trợ phát triển React Native, giúp quá trình chạy thử và phát triển ứng dụng đơn giản hơn.

#### TypeScript

TypeScript được sử dụng thay cho JavaScript nhằm:

- Kiểm tra kiểu dữ liệu.
- Hạn chế lỗi trong quá trình phát triển.
- Hỗ trợ IntelliSense.
- Dễ bảo trì source code.
- Phù hợp với dự án có nhiều module.

#### Expo Router

Expo Router được sử dụng để quản lý navigation và routing của ứng dụng.

Ví dụ cấu trúc:

```text
src/
└── app/
    ├── index.tsx
    ├── login.tsx
    ├── register.tsx
    └── profile.tsx
```

#### NativeWind

NativeWind được sử dụng để styling giao diện theo cách tiếp cận tương tự Tailwind CSS.

Ví dụ:

```tsx
<View className="flex-1 items-center justify-center">
  <Text className="text-xl font-bold">Travelling App</Text>
</View>
```

> Có thể thay thế NativeWind bằng một thư viện styling khác nếu yêu cầu kỹ thuật hoặc kiến trúc dự án thay đổi.

#### Axios

Axios được sử dụng để giao tiếp giữa Frontend và Backend thông qua REST API.

```text
React Native
      │
      │ Axios
      ▼
Backend REST API
```

#### Zustand

Zustand được sử dụng để quản lý các state dùng chung trong ứng dụng.

Ví dụ các state có thể được quản lý:

- Thông tin người dùng.
- Trạng thái đăng nhập.
- Danh sách địa điểm yêu thích.
- Giỏ đặt vé.
- Các thiết lập của ứng dụng.

#### @expo/vector-icons

Thư viện icon được sử dụng để cung cấp các icon cho giao diện ứng dụng.

Ví dụ:

```tsx
import { Ionicons } from "@expo/vector-icons";

<Ionicons name="heart-outline" size={24} />;
```

---

# ⚙️ Backend

Backend chịu trách nhiệm xử lý business logic, xác thực người dùng, cung cấp API và giao tiếp với cơ sở dữ liệu.

| Công nghệ      | Mục đích                                      |
| -------------- | --------------------------------------------- |
| **Node.js**    | Runtime cho Backend                           |
| **Express**    | Xây dựng REST API                             |
| **TypeScript** | Kiểm soát kiểu dữ liệu và tổ chức source code |
| **Prisma ORM** | Giao tiếp với cơ sở dữ liệu                   |
| **MariaDB**    | Hệ quản trị cơ sở dữ liệu                     |
| **Zod**        | Validation dữ liệu đầu vào                    |
| **JWT**        | Authentication / Authorization                |
| **bcrypt**     | Hash mật khẩu                                 |

---

## Node.js

Node.js được sử dụng làm runtime cho Backend.

Backend sẽ tiếp nhận request từ ứng dụng React Native, xử lý nghiệp vụ và trả kết quả thông qua REST API.

```text
Mobile App
    │
    │ HTTP Request
    ▼
Node.js / Express
    │
    │ Business Logic
    ▼
Prisma
    │
    ▼
MariaDB
```

---

## Express

Express được sử dụng để xây dựng REST API.

Ví dụ các nhóm API dự kiến:

```text
/api/auth
/api/users
/api/places
/api/categories
/api/favorites
/api/bookings
```

---

## Prisma ORM

Prisma được sử dụng làm ORM để Backend giao tiếp với MariaDB.

Vai trò:

- Khai báo database schema.
- Truy vấn dữ liệu.
- Thực hiện CRUD.
- Quản lý migration.
- Hỗ trợ TypeScript.

Mô hình:

```text
Express
   │
   ▼
Service
   │
   ▼
Prisma ORM
   │
   ▼
MariaDB
```

---

## MariaDB

MariaDB được sử dụng làm hệ quản trị cơ sở dữ liệu chính của hệ thống.

Database dự kiến lưu trữ các nhóm dữ liệu như:

- Users
- Roles
- Tourist Places
- Categories
- Favorites
- Bookings
- Tickets / Packages
- Các dữ liệu liên quan khác

> Cấu trúc database có thể tiếp tục thay đổi trong quá trình phân tích và phát triển hệ thống.

---

## Zod

Zod được sử dụng để kiểm tra và validation dữ liệu đầu vào từ client.

Ví dụ:

```text
Client Request
      │
      ▼
Zod Validation
      │
 ┌────┴────┐
 │         │
Valid    Invalid
 │         │
 ▼         ▼
Service   Error
```

Zod có thể được sử dụng để kiểm tra:

- Email.
- Password.
- Số điện thoại.
- Thông tin đăng ký.
- Thông tin đăng nhập.
- Dữ liệu đặt vé.
- Request body và query parameters.

---

## JWT

JWT được sử dụng cho cơ chế xác thực người dùng.

Luồng cơ bản:

```text
User
 │
 │ Login
 ▼
Backend
 │
 │ Verify credentials
 ▼
JWT Token
 │
 ▼
Client
 │
 │ Authorization: Bearer <token>
 ▼
Protected API
```

JWT có thể được sử dụng để:

- Xác thực người dùng.
- Xác định user hiện tại.
- Bảo vệ các API yêu cầu đăng nhập.
- Phân quyền dựa trên role.

---

## bcrypt

bcrypt được sử dụng để hash mật khẩu trước khi lưu vào database.

```text
Password
    │
    ▼
  bcrypt
    │
    ▼
Password Hash
    │
    ▼
 MariaDB
```

> Mật khẩu người dùng không được lưu trực tiếp dưới dạng plaintext trong database.

---

# 🔧 Development Tools

Các công cụ hỗ trợ quá trình phát triển dự án:

| Công cụ              | Mục đích                               |
| -------------------- | -------------------------------------- |
| **Git**              | Quản lý phiên bản source code          |
| **GitHub**           | Lưu trữ repository và cộng tác         |
| **VS Code**          | IDE / Code Editor                      |
| **Postman**          | Kiểm thử REST API                      |
| **Android Studio**   | Phát triển và quản lý Android Emulator |
| **Android Emulator** | Chạy thử ứng dụng Android              |

---

## Git & GitHub

Git được sử dụng để quản lý phiên bản source code.

GitHub được sử dụng để:

- Lưu trữ source code.
- Quản lý repository.
- Làm việc nhóm.
- Review code.
- Quản lý branch.
- Theo dõi lịch sử thay đổi.

Quy trình cơ bản:

```text
Developer
    │
    ▼
git add
    │
    ▼
git commit
    │
    ▼
git push
    │
    ▼
GitHub Repository
```

---

## VS Code

VS Code được sử dụng làm môi trường phát triển chính cho:

- React Native.
- Expo.
- TypeScript.
- Node.js.
- Express.
- Prisma.

---

## Postman

Postman được sử dụng để kiểm thử Backend API độc lập với Frontend.

Ví dụ:

```text
POST /api/auth/login

Request
{
    "email": "user@example.com",
    "password": "123456"
}

Response
{
    "success": true,
    "token": "..."
}
```

Postman giúp kiểm tra:

- HTTP method.
- Request body.
- Query parameters.
- Headers.
- Authentication.
- HTTP status code.
- Response data.
- Error handling.

---

## Android Studio / Android Emulator

Android Studio được sử dụng để cài đặt và quản lý Android Emulator.

Ứng dụng React Native có thể được chạy thử trên:

```text
React Native / Expo
        │
        ▼
Android Emulator
        │
        ▼
Testing
```

---

# 🧪 Testing

Dự án sử dụng nhiều công cụ kiểm thử ở các mức khác nhau.

| Công cụ       | Phạm vi                                     |
| ------------- | ------------------------------------------- |
| **Jest**      | Unit Testing                                |
| **Supertest** | Kiểm thử HTTP/API Backend                   |
| **Postman**   | Kiểm thử API thủ công / Integration Testing |

---

## Jest

Jest được sử dụng cho Unit Testing.

Có thể kiểm thử:

- Utility functions.
- Business logic.
- Service.
- Validation.
- Các module độc lập.

Ví dụ:

```text
Function
   │
   ▼
 Jest Test
   │
 ┌─┴─┐
 │   │
Pass Fail
```

---

## Supertest

Supertest được sử dụng để kiểm thử các HTTP endpoint của Backend.

Ví dụ:

```text
Test
 │
 ▼
Supertest
 │
 ▼
Express API
 │
 ▼
Response
```

Có thể kiểm thử:

```text
POST /api/auth/login
GET  /api/places
POST /api/favorites
GET  /api/bookings
```

---

## Postman Testing

Postman được sử dụng để kiểm thử API thủ công trong quá trình phát triển.

Các nội dung có thể kiểm tra:

- API endpoint.
- Request / Response.
- Authentication.
- JWT.
- Validation.
- HTTP status code.
- Error response.
- CRUD operations.

---

# 🏗️ Tổng quan kiến trúc

Kiến trúc tổng thể của dự án:

```text
                    ┌───────────────────┐
                    │    User / Client  │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │   React Native    │
                    │      + Expo       │
                    │    TypeScript     │
                    └─────────┬─────────┘
                              │
                       Axios / REST API
                              │
                              ▼
                    ┌───────────────────┐
                    │ Node.js + Express │
                    │    TypeScript     │
                    └─────────┬─────────┘
                              │
                 ┌────────────┼────────────┐
                 │            │            │
                 ▼            ▼            ▼
              Zod          JWT         bcrypt
                 │            │            │
                 └────────────┼────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │   Prisma ORM      │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │      MariaDB      │
                    └───────────────────┘
```

---

# 📦 Technology Stack Summary

```text
Frontend
├── React Native
├── Expo
├── TypeScript
├── Expo Router
├── NativeWind
├── Axios
├── Zustand
└── @expo/vector-icons

Backend
├── Node.js
├── Express
├── TypeScript
├── Prisma ORM
├── MariaDB
├── Zod
├── JWT
└── bcrypt

Development
├── Git
├── GitHub
├── VS Code
├── Postman
└── Android Studio / Android Emulator

Testing
├── Jest
├── Supertest
└── Postman
```

---

## 🚧 Project Status

> **Development**

Dự án hiện đang được phát triển trong phạm vi môn **Lập trình thiết bị di động**.

Các công nghệ và kiến trúc được liệt kê trong tài liệu này là **Technology Stack dự kiến/đang sử dụng** tại thời điểm phát triển và có thể được thay đổi khi yêu cầu hệ thống hoặc kiến trúc dự án được điều chỉnh.

**Dự án chưa phải phiên bản Production chính thức.**
