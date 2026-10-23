# Thiết kế giao diện cho cả Web và Mobile

Frontend (`fe/`) dùng **một codebase** Expo + React Native + Expo Router cho Android, iOS và Web (React Native Web). Tài liệu này trả lời: *làm sao để một giao diện chạy tốt trên cả điện thoại lẫn trình duyệt, và nên triển khai theo thứ tự nào.*

Đặc tả từng trang và điểm khác nhau Web/Mobile của từng trang: [../02-thiet-ke/giao-dien.md](../02-thiet-ke/giao-dien.md).

## 1. Nguyên tắc chọn nền tảng theo người dùng

| Người dùng | Nền tảng chính | Lý do |
|---|---|---|
| Khách du lịch | **Mobile trước**, Web đầy đủ | Khách tìm và đặt trên điện thoại; web phục vụ người tìm trên máy tính và SEO |
| Chủ địa điểm | **Web trước**, Mobile rút gọn | Quản lý tin, bảng giá, form dài, biểu đồ cần màn hình rộng; mobile để xác nhận booking gấp |
| Staff / Admin | **Web** | Bảng dữ liệu, kiểm duyệt hàng loạt, dashboard |

Không cần làm hai giao diện riêng. Cùng một màn hình, bố cục thay đổi theo **chiều rộng** (không theo loại thiết bị): tablet ngang hay cửa sổ trình duyệt hẹp đều dùng đúng bố cục phù hợp.

## 2. Breakpoint

| Tên | Chiều rộng | Thiết bị điển hình | Bố cục |
|---|---|---|---|
| `sm` | < 768px | Điện thoại | 1 cột, tab dưới đáy, nút hành động cố định đáy |
| `md` | 768–1023px | Tablet, cửa sổ hẹp | 2 cột cho danh sách thẻ, tab dưới đáy hoặc thanh trên |
| `lg` | ≥ 1024px | Laptop, PC | Thanh điều hướng trên cùng (khách) hoặc sidebar (chủ/admin), nội dung tối đa 1200px giữa màn hình |

Tailwind/NativeWind dùng `md:` và `lg:` theo đúng các mốc này. Khai báo một lần trong `fe/tailwind.config.js` để cả nhóm dùng chung:

```js
theme: {
  screens: { md: "768px", lg: "1024px" },
}
```

## 3. Ba kỹ thuật, dùng theo thứ tự ưu tiên

### 3.1. Responsive bằng className (dùng nhiều nhất)

Phần lớn khác biệt chỉ là số cột, khoảng cách, kích thước chữ:

```tsx
<View className="flex-col gap-4 px-4 lg:flex-row lg:px-8">
  <View className="w-full lg:w-2/3">{/* nội dung chính */}</View>
  <View className="w-full lg:w-1/3">{/* tóm tắt đơn, cố định bên phải trên web */}</View>
</View>
```

### 3.2. Hook `useBreakpoint` khi cần đổi cấu trúc

Khi số cột của `FlatList` hay loại component phải khác nhau (bảng trên web, thẻ trên mobile):

```ts
// fe/src/hooks/use-breakpoint.ts
import { useWindowDimensions } from "react-native";

export function useBreakpoint() {
  const { width } = useWindowDimensions();
  return { isSm: width < 768, isMd: width >= 768 && width < 1024, isLg: width >= 1024 };
}
```

```tsx
const { isLg } = useBreakpoint();
return isLg ? <BookingTable data={data} /> : <BookingCardList data={data} />;
```

`useWindowDimensions` tự cập nhật khi xoay máy hoặc kéo giãn cửa sổ trình duyệt.

### 3.3. File riêng theo nền tảng – chỉ khi API khác nhau

Expo tự chọn `ten.web.tsx` cho web và `ten.tsx` cho native. Repo đã dùng cách này cho thanh tab (`app-tabs.tsx` dùng `NativeTabs`, `app-tabs.web.tsx` dùng `expo-router/ui`) và lưu token (`token-storage.ts` dùng SecureStore, `token-storage.web.ts` dùng localStorage).

Chỉ tách file khi **thư viện hoặc API khác nhau**, không tách chỉ vì bố cục khác (dùng 3.1/3.2). Các chỗ nên tách:

| Chức năng | Native | Web |
|---|---|---|
| Thanh điều hướng | `NativeTabs` (tab đáy) | Thanh trên / sidebar |
| Lưu token | `expo-secure-store` | `localStorage` |
| Chọn ngày | Date picker hệ thống | `<input type="date">` |
| Bản đồ | `react-native-maps` | Ảnh tĩnh / iframe Google Maps |
| Biểu đồ dashboard | Thư viện chart cho RN (ví dụ `victory-native`) hoặc `react-native-svg` | Có thể dùng chung nếu thư viện hỗ trợ web |

Tránh rải `Platform.OS === "web"` khắp nơi; nếu cần hơn 2 lần trong một component thì tách file.

## 4. Điều hướng trên từng nền tảng

```text
Khách (mobile)                     Khách (web lg)
┌──────────────────┐               ┌──────────────────────────────────────────┐
│ Nội dung         │               │ Logo  Khám phá  Yêu thích  Chuyến đi  👤 │
│                  │               ├──────────────────────────────────────────┤
│                  │               │          Nội dung (tối đa 1200px)         │
├──────────────────┤               │                                          │
│ 🧭  ♥  🧳  ✉  👤 │               └──────────────────────────────────────────┘
└──────────────────┘

Chủ địa điểm / Admin (web lg)       Chủ địa điểm (mobile)
┌────────────┬─────────────────────┐ ┌──────────────────┐
│ Tổng quan  │                     │ │ ← Quản lý cơ sở  │
│ Tin đăng   │   Nội dung / bảng   │ │ [Thẻ chỉ số]     │
│ Booking    │                     │ │ [Booking chờ: 2] │
│ Hồ sơ      │                     │ │ [Lưới nút tắt]   │
└────────────┴─────────────────────┘ └──────────────────┘
```

- Khu `owner/` và `admin/` dùng `_layout.tsx` riêng: `lg` hiện sidebar (Expo Router `Slot` bên cạnh menu), `sm` dùng `Stack`.
- Layout phải **chặn theo vai trò** (`useAuthStore().user.role`) và chuyển trang nếu sai quyền. Backend vẫn kiểm tra lại, đây chỉ để giao diện không hiện trang người dùng không dùng được.

## 5. Quy tắc giao diện chung cho cả hai nền tảng

| Chủ đề | Quy tắc |
|---|---|
| Vùng chạm | Nút tối thiểu 44×44 (iOS) / 48×48 (Android); trên web giữ nguyên để dùng được trên tablet |
| Hover | Web thêm `hover:` (`hover:opacity-80`); mobile dùng `active:` |
| Bàn phím | Mobile: `KeyboardAvoidingView`, `keyboardType` đúng (email, số điện thoại); Web: Enter để gửi form, Tab chuyển ô |
| An toàn tai thỏ | `SafeAreaView` trên mobile; web không cần |
| Chiều rộng nội dung | Web giới hạn `max-w` (form 480px, nội dung 1200px) để chữ không trải quá dài |
| Ảnh | `expo-image` với `contentFit="cover"` và tỷ lệ cố định (16:9 thẻ, 4:3 chi tiết) |
| Trạng thái | Mọi màn có gọi API phải có loading / rỗng / lỗi (component `StateView`) |
| Màu, chữ | Dùng token trong `tailwind.config.js` (`brand`, `surface`, `muted`...) thay vì mã màu rải rác |

## 6. Tiến trình triển khai đề xuất

| Bước | Việc | Kiểm tra trên |
|---|---|---|
| 1 | **Nền tảng:** NativeWind (đã có `babel.config.js`), import `global.css` trong `_layout.tsx`, `QueryClientProvider`, khôi phục đăng nhập, breakpoint trong `tailwind.config.js`, hook `useBreakpoint` | Android + Web |
| 2 | **Design system nhỏ:** `Button`, `Input`, `Card`, `Badge`, `StateView`, `Screen` – mỗi component tự responsive | Android + Web ở 375px và 1280px |
| 3 | **Khung điều hướng:** 5 tab khách (`app-tabs.tsx` / `.web.tsx`), layout `owner/` và `admin/` có sidebar ở `lg` | Android + Web |
| 4 | **Luồng khách theo đợt 1–3** của [giao-dien.md](../02-thiet-ke/giao-dien.md) mục 6, làm **mobile trước** rồi chỉnh `lg:` | Android trước, Web sau |
| 5 | **Khu chủ địa điểm và admin (đợt 4–6)**, làm **web trước** rồi rút gọn cho mobile | Web trước, Android sau |
| 6 | **Hoàn thiện:** kiểm tra 3 kích thước (375, 768, 1280), xoay ngang, chế độ tối nếu bật, đọc bằng trình đọc màn hình cơ bản | Cả hai |

**Cách test nhanh nhiều kích thước:** chạy `npm run web` trong `fe/`, mở DevTools của trình duyệt (F12) → chế độ thiết bị, chuyển giữa iPhone (375), iPad (768), Desktop (1280). Sau đó chạy `npm run android` để kiểm tra cử chỉ, bàn phím, tai thỏ trên máy thật/emulator.

## 7. Cấu trúc thư mục frontend đề xuất

```text
fe/src/
├── app/                    Route (mỗi file = một trang); _layout.tsx = khung điều hướng
│   ├── (tabs)/ (auth)/ booking/ owner/ admin/ ...    xem sitemap trong giao-dien.md
├── components/
│   ├── ui/                 Button, Input, Card, Badge... (design system)
│   ├── layout/             Screen, Sidebar, TopNav
│   └── <feature>/          DestinationCard, BookingRow, StatCard, RevenueChart...
├── hooks/                  use-breakpoint, use-theme, use-color-scheme(.web)
├── services/               api/client.ts (Axios), travel.service.ts, token-storage(.web).ts
├── store/                  auth-store.ts, booking-draft-store.ts (Zustand)
├── types/                  api.ts (khớp response backend)
├── config/                 env.ts (địa chỉ API theo nền tảng)
└── utils/                  format.ts (tiền, ngày, nhãn trạng thái)
```

Lớp gọi API, store đăng nhập, kiểu dữ liệu và `StateView` đã có sẵn trong repo để tham khảo. Cấu hình địa chỉ API cho emulator/điện thoại thật/web: [deploy.md](deploy.md) mục 3.
