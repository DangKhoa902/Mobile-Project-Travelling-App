import type { BookingStatus, ListingStatus, PartnerStatus, PaymentMethod, PaymentStatus, PayoutStatus, PricingUnit, ReviewStatus, Role } from "@/types/api";

export function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString("vi-VN")}đ`;
}

// Số tiền gọn cho thẻ chỉ số và trục biểu đồ: 12.500.000 -> "12,5 tr".
export function formatShortVnd(amount: number): string {
  if (Math.abs(amount) >= 1e9) return `${(amount / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`;
  if (Math.abs(amount) >= 1e6) return `${(amount / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
  if (Math.abs(amount) >= 1e3) return `${Math.round(amount / 1e3)}k`;
  return String(amount);
}

// "2026-12-01T00:00:00.000Z" (cột DATE) -> "01/12/2026". Cắt chuỗi, không qua Date để khỏi lệch múi giờ.
export function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

// Cột DATETIME hiển thị theo giờ máy.
export function formatDateTime(value: string): string {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function relativeTime(value: string): string {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "Vừa xong";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
  if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)} ngày trước`;
  return formatDateTime(value).slice(6);
}

export function formatPercent(rate: number): string {
  return `${(rate * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}

// ---------- Ngày dạng YYYY-MM-DD (giờ Việt Nam) ----------

export function todayIso(): string {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso.slice(0, 10)}T00:00:00Z`) - Date.parse(`${fromIso.slice(0, 10)}T00:00:00Z`)) / 86400000);
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

// Giờ nhận phòng = 14:00 giờ Việt Nam (07:00 UTC), giống backend (booking-rules.ts).
export function checkInMoment(checkInDate: string): number {
  return Date.parse(`${checkInDate.slice(0, 10)}T07:00:00Z`);
}

export function maskAccount(value: string | null): string {
  if (!value) return "Chưa có";
  return `•••• ${value.slice(-4)}`;
}

// ---------- Nhãn tiếng Việt ----------

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  COMPLETED: "Đã hoàn thành",
  CANCELLED: "Đã hủy",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  ONLINE_MOCK: "Thanh toán online",
  PAY_AT_PROPERTY: "Trả tại nơi lưu trú",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: "Chưa thanh toán",
  PAID: "Đã thanh toán",
  REFUNDED: "Đã hoàn tiền",
  FAILED: "Thất bại",
};

export const CHANNEL_LABEL = { CARD: "Thẻ", EWALLET: "Ví điện tử", BANK_TRANSFER: "Chuyển khoản" } as const;

export const LISTING_STATUS_LABEL: Record<ListingStatus, string> = {
  DRAFT: "Nháp",
  PENDING_REVIEW: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
};

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã hiển thị",
  REJECTED: "Bị từ chối",
};

export const PARTNER_STATUS_LABEL: Record<PartnerStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
  SUSPENDED: "Tạm ngưng",
};

export const PAYOUT_STATUS_LABEL: Record<PayoutStatus, string> = {
  PENDING: "Chờ chuyển",
  PAID: "Đã chuyển",
  CANCELLED: "Đã hủy",
};

export const ROLE_LABEL: Record<Role, string> = {
  USER: "Khách hàng",
  OWNER: "Chủ địa điểm",
  STAFF: "Nhân viên CSKH",
  ADMIN: "Quản trị viên",
};

export const PRICING_UNIT_LABEL: Record<PricingUnit, string> = {
  PER_BOOKING: "/lượt",
  PER_GUEST: "/khách",
  PER_NIGHT: "/đêm",
};

// Nhãn tiếng Việt cho nhật ký quản trị (M15); hành động chưa có nhãn hiện nguyên mã.
export const AUDIT_ACTION_LABEL: Record<string, string> = {
  "user.lock": "Khóa tài khoản",
  "user.unlock": "Mở khóa tài khoản",
  "user.role_change": "Đổi vai trò",
  "partner.approve": "Duyệt đối tác",
  "partner.reject": "Từ chối đối tác",
  "partner.suspend": "Tạm ngưng đối tác",
  "partner.reinstate": "Mở lại đối tác",
  "partner.commission_change": "Đổi hoa hồng",
  "listing.approve": "Duyệt tin đăng",
  "listing.reject": "Từ chối tin đăng",
  "booking.confirm": "Xác nhận booking",
  "booking.complete": "Hoàn thành booking",
  "booking.cancel": "Hủy booking",
  "review.approve": "Duyệt đánh giá",
  "review.reject": "Từ chối đánh giá",
  "payout.create": "Lập kỳ đối soát",
  "payout.pay": "Xác nhận đã chuyển",
  "payout.cancel": "Hủy kỳ đối soát",
  "voucher.create": "Tạo voucher",
  "voucher.update": "Sửa voucher",
  "package.price_change": "Đổi giá gói",
  "room_type.price_change": "Đổi giá phòng",
  "room_rate.create": "Thêm giá mùa",
  "room_rate.update": "Sửa giá mùa",
  "room_rate.delete": "Xóa giá mùa",
};
