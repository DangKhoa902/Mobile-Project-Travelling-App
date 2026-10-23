# Đề xuất kiến trúc Project React Native đa nền tảng

## 1. Mục tiêu project

Project được xây dựng bằng **React Native + Expo + TypeScript**, ưu tiên chạy chung codebase trên:

- Android
- iOS (nếu có điều kiện test)
- PC thông qua **Web / React Native Web**

> **Lưu ý về "PC":** tài liệu này hiểu PC là chạy ứng dụng bằng trình duyệt trên Windows/macOS/Linux. Đây là hướng phù hợp với sinh viên mới học React Native vì Expo Router hỗ trợ Android, iOS và Web với cùng cấu trúc route. Nếu giảng viên yêu cầu một **ứng dụng Windows native `.exe`**, nên tách riêng phương án React Native Windows; không nên thêm `react-native-windows` ngay từ đầu vì nó làm setup và dependency phức tạp hơn.

---

# 2. Stack công nghệ đề xuất

## 2.1. Công nghệ chính

| Thành phần | Đề xuất | Mục đích |
|---|---|---|
| Language | TypeScript | Type safety, coding standard |
| Framework | React Native | Xây dựng mobile UI |
| Toolchain | Expo | Setup/build/test thuận tiện |
| Routing | Expo Router | Điều hướng theo file, hỗ trợ mobile + web |
| Styling | NativeWind | Utility-first styling kiểu Tailwind |
| UI | React Native Paper | Button, Card, Dialog, TextInput... |
| State | Zustand | Quản lý state đơn giản |
| API | Axios | Gọi REST API |
| Server state | TanStack Query | Cache/loading/error của API |
| Validation | Zod | Validate dữ liệu |
| Lint | ESLint | Kiểm tra coding standard |
| Format | Prettier | Format code thống nhất |
| Git | Git + GitHub | Version control |

Không nhất thiết phải cài toàn bộ ngay ngày đầu. Có thể bắt đầu với:

```text
Expo
TypeScript
Expo Router
NativeWind
ESLint
Prettier
```

Sau khi có API mới thêm:

```text
Axios
TanStack Query
Zod
Zustand
```

---

# 3. Nên chọn thư viện CSS nào?

## 3.1. NativeWind — lựa chọn chính

**Khuyến nghị:** sử dụng NativeWind.

NativeWind cho phép viết style theo cách gần với Tailwind CSS:

```tsx
<View className="flex-1 bg-white px-4">
  <Text className="text-2xl font-bold text-blue-800">
    Xin chào
  </Text>
</View>
```

Ưu điểm:

- Dễ học nếu đã biết Tailwind.
- Code UI ngắn.
- Dễ chuẩn hóa spacing, màu sắc, typography.
- Phù hợp React Native + Web.
- Có thể dùng chung component giữa Android/iOS/Web.
- Dễ xây dựng Design System.

NativeWind hiện có bản v4 ổn định; v5 đang ở trạng thái pre-release/RC nên với project môn học nên ưu tiên **NativeWind v4** thay vì chạy theo bản preview.

## 3.2. React Native Paper — UI component

NativeWind chủ yếu giải quyết styling. Nếu project cần nhiều component UI như:

- Button
- TextInput
- Card
- Dialog
- Modal
- Snackbar
- Appbar
- Checkbox
- Radio
- Menu

có thể dùng thêm React Native Paper.

Ví dụ:

```tsx
import { Button } from "react-native-paper";

<Button mode="contained" onPress={handleLogin}>
  Đăng nhập
</Button>
```

### Có nên dùng NativeWind + React Native Paper?

**Có**, nhưng cần phân rõ trách nhiệm:

```text
NativeWind
    ↓
Layout / spacing / responsive / custom styling

React Native Paper
    ↓
UI component có hành vi phức tạp
```

Không nên cài 3–4 UI framework cùng lúc.

---

# 4. Vì sao không dùng CSS/Tailwind CSS thuần?

React Native không sử dụng HTML/CSS theo cách của React Web.

Ví dụ React Web:

```jsx
<div className="flex">
```

React Native:

```tsx
<View>
```

Expo cũng ghi rõ Tailwind CSS thông thường chỉ hỗ trợ web; muốn dùng utility styling cho React Native đa nền tảng nên dùng thư viện như NativeWind hoặc Uniwind.

Vì vậy:

```text
React Web
    ↓
Tailwind CSS

React Native + Web
    ↓
NativeWind / Uniwind
```

Đối với sinh viên mới học, **NativeWind** là lựa chọn dễ tiếp cận.

---

# 5. Tạo project từ đầu

## 5.1. Chuẩn bị môi trường

Khuyến nghị:

```text
Node.js LTS
npm
VS Code
Git
Android Studio
Android Emulator
Expo Go trên điện thoại
```

Kiểm tra:

```bash
node -v
npm -v
git --version
```

Không nên cài React Native CLI global kiểu cũ.

---

# 6. Tạo project Expo + TypeScript

Tạo project:

```bash
npx create-expo-app@latest MobileProject
```

Sau đó:

```bash
cd MobileProject
```

Khởi chạy:

```bash
npx expo start
```

Có thể chọn:

```text
a  → Android Emulator
w  → Web
```

hoặc quét QR bằng Expo Go trên điện thoại.

---

# 7. Cài Expo Router

Nếu sử dụng template Expo Router mới thì Router thường đã được cấu hình sẵn.

Kiểm tra:

```bash
npm list expo-router
```

Nếu cần cài thủ công:

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

Cho Web:

```bash
npx expo install react-native-web react-dom
```

Trong `app.json`/`app.config.*` cần sử dụng Metro cho Web:

```json
{
  "expo": {
    "web": {
      "bundler": "metro"
    }
  }
}
```

---

# 8. Cài NativeWind

Với project môn học, sử dụng **NativeWind v4 stable**.

Cài:

```bash
npm install nativewind@4.2.7 react-native-reanimated react-native-safe-area-context
```

Dev dependency:

```bash
npm install --save-dev tailwindcss@^3.4.17 prettier-plugin-tailwindcss@^0.5.11
```

Tạo:

```text
global.css
```

Ví dụ:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Cấu hình Metro:

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, {
  input: "./global.css",
});
```

Sau khi thay đổi cấu hình:

```bash
npx expo start --clear
```

> Không nên tự copy cấu hình của NativeWind v5 vào project v4. NativeWind v5 hiện là pre-release/RC và có cách cấu hình khác.

---

# 9. Cấu trúc thư mục đề xuất

Đề xuất kiến trúc:

```text
MobileProject/
│
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   │
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   │
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── products.tsx
│   │   ├── cart.tsx
│   │   └── profile.tsx
│   │
│   └── product/
│       └── [id].tsx
│
├── src/
│   │
│   ├── components/
│   │   ├── common/
│   │   ├── forms/
│   │   ├── layout/
│   │   └── product/
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── validation/
│   │   │
│   │   ├── product/
│   │   ├── cart/
│   │   └── profile/
│   │
│   ├── services/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   └── endpoints.ts
│   │   └── storage/
│   │
│   ├── store/
│   │   ├── authStore.ts
│   │   └── cartStore.ts
│   │
│   ├── hooks/
│   │
│   ├── types/
│   │
│   ├── constants/
│   │
│   ├── utils/
│   │
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   └── typography.ts
│   │
│   └── config/
│       └── env.ts
│
├── assets/
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── docs/
│   ├── sdlc/
│   │   ├── 01-planning.md
│   │   ├── 02-requirements.md
│   │   ├── 03-analysis.md
│   │   ├── 04-design.md
│   │   ├── 05-implementation.md
│   │   ├── 06-testing.md
│   │   └── 07-deployment.md
│   │
│   ├── diagrams/
│   ├── api/
│   └── screenshots/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example
├── .gitignore
├── app.json
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
├── global.css
├── eslint.config.js
├── prettier.config.js
├── package.json
├── tsconfig.json
└── README.md
```

---

# 10. Tại sao cấu trúc này phù hợp?

Có thể chia project thành 4 tầng chính:

```text
┌──────────────────────────────┐
│           app/               │
│       Route / Screen         │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│         components/          │
│        UI Components         │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│          features/           │
│   Business logic / Feature   │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ services / store / utils     │
│ API / State / Utility        │
└──────────────────────────────┘
```

Ví dụ chức năng đăng nhập:

```text
app/(auth)/login.tsx
        ↓
src/features/auth/components/LoginForm.tsx
        ↓
src/features/auth/hooks/useLogin.ts
        ↓
src/features/auth/services/authService.ts
        ↓
src/services/api/client.ts
        ↓
Backend API
```

Điều này giúp tránh tình trạng:

```text
login.tsx
    ├── UI
    ├── API call
    ├── validation
    ├── xử lý token
    ├── business logic
    └── navigation
```

tất cả nằm trong một file.

---

# 11. Quy tắc module

Mỗi feature nên tự quản lý những thứ liên quan trực tiếp đến nó.

Ví dụ:

```text
features/
└── product/
    ├── components/
    │   ├── ProductCard.tsx
    │   └── ProductFilter.tsx
    │
    ├── hooks/
    │   └── useProducts.ts
    │
    ├── services/
    │   └── productService.ts
    │
    ├── types/
    │   └── product.types.ts
    │
    └── validation/
        └── product.schema.ts
```

Không nên:

```text
components/
    ProductCard.tsx

hooks/
    useProducts.ts

services/
    productService.ts

types/
    product.types.ts
```

nếu project có rất nhiều feature, vì sau này khó xác định file thuộc module nào.

---

# 12. Quy tắc coding standard

## 12.1. TypeScript

Không sử dụng:

```tsx
const data: any = ...
```

Ưu tiên:

```tsx
interface Product {
  id: string;
  name: string;
  price: number;
}
```

hoặc:

```tsx
type Product = {
  id: string;
  name: string;
  price: number;
};
```

---

## 12.2. Naming

Component:

```text
ProductCard.tsx
LoginForm.tsx
Header.tsx
```

Hook:

```text
useProducts.ts
useAuth.ts
useCart.ts
```

Service:

```text
productService.ts
authService.ts
```

Store:

```text
authStore.ts
cartStore.ts
```

Constant:

```text
appConstants.ts
```

Function:

```tsx
getProducts()
handleLogin()
calculateTotal()
```

Boolean:

```tsx
isLoading
isAuthenticated
hasPermission
```

---

# 13. Component standard

Không nên viết:

```tsx
export default function A() {
  ...
}
```

Nên:

```tsx
export default function ProductCard() {
  ...
}
```

Một component nên có trách nhiệm rõ ràng.

Ví dụ:

```tsx
<ProductCard product={product} onPress={handlePress} />
```

Không nên để `ProductCard` tự gọi API.

---

# 14. Styling standard

Không viết màu rải rác:

```tsx
className="bg-[#1e3a8a]"
```

ở hàng chục file.

Nên định nghĩa Design System:

```text
src/theme/
├── colors.ts
├── spacing.ts
└── typography.ts
```

Ví dụ:

```ts
export const colors = {
  primary: "#1E3A8A",
  background: "#F8FAFC",
  text: "#0F172A",
  danger: "#DC2626",
};
```

Mục tiêu:

```text
UI
 ↓
Design System
 ↓
Consistent UI
```

---

# 15. Responsive cho Mobile + PC

Không nên thiết kế:

```text
Mobile = một giao diện
PC = phóng to giao diện Mobile
```

Nên xác định breakpoint:

```text
Small
  ↓
Mobile

Medium
  ↓
Tablet

Large
  ↓
PC/Web
```

Ví dụ:

```tsx
<View className="w-full px-4 md:px-8 lg:px-12">
```

Có thể dùng layout:

```text
Mobile
┌───────────────┐
│ Header        │
├───────────────┤
│ Content       │
│               │
│               │
├───────────────┤
│ Bottom Tab    │
└───────────────┘
```

PC:

```text
┌───────────────────────────────────┐
│ Header                            │
├────────────┬──────────────────────┤
│ Sidebar    │ Content              │
│            │                      │
│            │                      │
└────────────┴──────────────────────┘
```

Có thể dùng platform detection khi thực sự cần:

```tsx
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";
```

Không nên lạm dụng `Platform.OS` nếu có thể giải quyết bằng responsive layout.

---

# 16. State management

Ban đầu chỉ cần:

```text
useState
useReducer
```

Khi project lớn hơn:

```text
Zustand
```

Ví dụ:

```ts
type CartStore = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
};
```

Không nên đưa toàn bộ dữ liệu của app vào một global store.

Phân biệt:

```text
UI State
    ↓
useState

Global Client State
    ↓
Zustand

Server State
    ↓
TanStack Query
```

---

# 17. API architecture

Nếu backend REST API:

```text
React Native
     ↓
Axios
     ↓
API Service
     ↓
Backend
```

Ví dụ:

```text
src/
└── services/
    └── api/
        ├── client.ts
        └── endpoints.ts
```

`client.ts`:

```ts
import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
});
```

Feature:

```ts
export async function getProducts() {
  const response = await apiClient.get("/products");
  return response.data;
}
```

Component không gọi Axios trực tiếp.

---

# 18. Environment

Không hard-code:

```ts
const API_URL = "http://192.168.1.100:8080";
```

Nên:

```text
.env
.env.example
```

Ví dụ:

```env
EXPO_PUBLIC_API_URL=http://localhost:8080/api
```

`localhost` trên Android Emulator không luôn trỏ về máy host. Khi test Android Emulator, thường cần dùng địa chỉ host phù hợp với môi trường emulator.

Không commit secret/API key vào Git.

---

# 19. Testing

Tối thiểu project nên có:

```text
tests/
├── unit/
├── integration/
└── e2e/
```

### Unit test

Test:

```text
calculateTotal()
validateEmail()
formatCurrency()
```

### Integration test

Test:

```text
Login form
    ↓
Validation
    ↓
API
    ↓
State
```

### E2E

Test các flow quan trọng:

```text
Mở app
   ↓
Đăng nhập
   ↓
Xem sản phẩm
   ↓
Thêm giỏ hàng
   ↓
Thanh toán
```

Nếu môn học không yêu cầu test tự động quá sâu, có thể ưu tiên unit test + test case thủ công cho MVP.

---

# 20. Triển khai/test

## Android Emulator

Cài:

```text
Android Studio
Android SDK
Android Emulator
```

Sau đó:

```bash
npx expo start
```

Nhấn:

```text
a
```

---

## Điện thoại thật

Cài:

```text
Expo Go
```

Sau đó:

```bash
npx expo start
```

Quét QR.

Điện thoại và máy tính cần kết nối mạng phù hợp để development server có thể được truy cập.

---

## PC/Web

Chạy:

```bash
npx expo start --web
```

hoặc:

```bash
npx expo start
```

sau đó nhấn:

```text
w
```

---

# 21. Production Web build

Build:

```bash
npx expo export --platform web
```

Kết quả:

```text
dist/
```

Có thể deploy thư mục web này lên hosting phù hợp.

---

# 22. Git workflow

Ngay từ đầu nên dùng Git.

```bash
git init
git add .
git commit -m "chore: initialize project"
```

Branch:

```text
main
develop
feature/login
feature/product
feature/cart
fix/login-validation
```

Ví dụ:

```bash
git checkout -b feature/login
```

Commit nên rõ ràng:

```text
feat: add login screen
feat: add product list
fix: validate login form
refactor: extract product card
docs: add installation guide
test: add cart unit tests
```

---

# 23. SDLC nên tổ chức như thế nào?

Thư mục:

```text
docs/sdlc/
├── 01-planning.md
├── 02-requirements.md
├── 03-analysis.md
├── 04-design.md
├── 05-implementation.md
├── 06-testing.md
└── 07-deployment.md
```

## Giai đoạn 1 — Planning

Ghi:

- Tên project
- Thành viên
- Mục tiêu
- Phạm vi
- Công nghệ
- Timeline
- Phân công

---

## Giai đoạn 2 — Requirements

Ghi:

- Functional requirements
- Non-functional requirements
- Actor
- Use case
- User story
- Business rules

---

## Giai đoạn 3 — Analysis

Có thể làm:

```text
Use Case Diagram
Activity Diagram
Sequence Diagram
Class Diagram
ERD
```

---

## Giai đoạn 4 — Design

Thiết kế:

```text
Architecture
Database
API
UI/UX
Navigation
Component
Responsive layout
```

---

## Giai đoạn 5 — Implementation

Ghi:

- Project structure
- Coding standard
- Module
- API
- State management
- Authentication
- UI implementation

---

## Giai đoạn 6 — Testing

Ghi:

- Test plan
- Test case
- Unit test
- Integration test
- UI test
- Cross-platform test
- Bug report

---

## Giai đoạn 7 — Deployment

Ghi:

- Environment
- Installation
- Build
- Android testing
- Web testing
- Deployment
- Troubleshooting

---

# 24. README.md tối thiểu

README nên có:

```text
# Project Name

## 1. Introduction

## 2. Features

## 3. Technology Stack

## 4. Requirements

## 5. Installation

## 6. Configuration

## 7. Run Development

## 8. Run Android

## 9. Run Web

## 10. Build

## 11. Project Structure

## 12. Coding Standard

## 13. Testing

## 14. SDLC Documentation

## 15. Contributors
```

---

# 25. Definition of Done cho MVP

Một chức năng chỉ được xem là hoàn thành khi:

```text
[ ] UI hoàn thành
[ ] Responsive
[ ] TypeScript không có lỗi
[ ] ESLint không có lỗi nghiêm trọng
[ ] Format bằng Prettier
[ ] API hoạt động
[ ] Loading state
[ ] Error state
[ ] Empty state
[ ] Test case
[ ] Test Android
[ ] Test Web
[ ] Commit Git
```

---

# 26. Roadmap thực hiện project

## Phase 1 — Setup

```text
Day 1
 ↓
Node + Git + VS Code
 ↓
Expo
 ↓
TypeScript
 ↓
Expo Router
 ↓
NativeWind
 ↓
ESLint + Prettier
 ↓
Git
```

## Phase 2 — Architecture

```text
Tạo folders
 ↓
Theme
 ↓
Components
 ↓
Features
 ↓
Services
 ↓
Store
```

## Phase 3 — UI Prototype

```text
Login
 ↓
Home
 ↓
List
 ↓
Detail
 ↓
Cart
 ↓
Profile
```

## Phase 4 — Backend/API

```text
API client
 ↓
Authentication
 ↓
CRUD
 ↓
Error handling
```

## Phase 5 — Testing

```text
Unit
 ↓
Integration
 ↓
Manual test
 ↓
Android
 ↓
Web
```

## Phase 6 — Documentation

```text
SDLC
 ↓
README
 ↓
Installation
 ↓
Architecture
 ↓
Test report
 ↓
Deployment
```

---

# 27. Stack cuối cùng nên dùng

Đối với sinh viên mới học React Native, không nên bắt đầu với quá nhiều thư viện.

### Bộ khởi đầu

```text
React Native
      +
Expo
      +
TypeScript
      +
Expo Router
      +
NativeWind
      +
ESLint
      +
Prettier
      +
Git
```

### Khi MVP bắt đầu có backend

```text
Axios
      +
TanStack Query
      +
Zustand
      +
Zod
```

### UI component nếu cần

```text
React Native Paper
```

---

# 28. Kiến trúc tổng thể

```text
                         ┌─────────────────┐
                         │     User        │
                         └────────┬────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │      React Native         │
                    │      + Expo Router        │
                    └─────────────┬─────────────┘
                                  │
             ┌────────────────────┼────────────────────┐
             │                    │                    │
             ▼                    ▼                    ▼
        Components           Features             Store
             │                    │                    │
             │              Business Logic             │
             │                    │                    │
             └────────────────────┼────────────────────┘
                                  │
                          ┌───────▼────────┐
                          │ Service / API  │
                          │ Axios / Query  │
                          └───────┬────────┘
                                  │
                          ┌───────▼────────┐
                          │    Backend     │
                          └────────────────┘


      Styling:
      NativeWind + Design System

      Documentation:
      docs/sdlc/

      Quality:
      TypeScript + ESLint + Prettier + Tests

      Platforms:
      Android + iOS + Web
```

---

# 29. Kết luận đề xuất

Với project môn học này, nên ưu tiên **kiến trúc rõ ràng và khả năng hoàn thành MVP** thay vì cố sử dụng thật nhiều thư viện.

Bộ công nghệ đề xuất:

```text
Expo
├── React Native
├── TypeScript
├── Expo Router
├── NativeWind
├── React Native Paper (optional)
├── Zustand
├── Axios
├── TanStack Query
├── Zod
├── ESLint
├── Prettier
└── Git/GitHub
```

Trong đó:

```text
Expo
→ môi trường phát triển

Expo Router
→ navigation

NativeWind
→ styling

React Native Paper
→ UI components

Zustand
→ client state

TanStack Query
→ server state

Axios
→ REST API

Zod
→ validation

TypeScript + ESLint + Prettier
→ coding standard
```

**Thứ tự nên làm:** tạo project → chạy Android/Web thành công → cấu hình Router → cấu hình NativeWind → tạo architecture → tạo Design System → tạo prototype → kết nối API → testing → documentation → deployment.

---

## Tài liệu tham khảo chính

- Expo Router: https://docs.expo.dev/router/introduction/
- Expo Web: https://docs.expo.dev/workflow/web/
- Expo Tailwind: https://docs.expo.dev/guides/tailwind/
- NativeWind: https://www.nativewind.dev/docs/getting-started/installation
- React Native Windows: https://microsoft.github.io/react-native-windows/
