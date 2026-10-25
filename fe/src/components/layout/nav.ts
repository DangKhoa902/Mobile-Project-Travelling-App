import type { NavItem } from "@/components/layout/manage-shell";

// Mục điều hướng khu chủ địa điểm (O1–O8).
export const OWNER_NAV: NavItem[] = [
  { href: "/owner", label: "Tổng quan", icon: "speedometer-outline", exact: true },
  { href: "/owner/destinations", label: "Tin đăng", icon: "home-outline" },
  { href: "/owner/bookings", label: "Booking", icon: "calendar-outline" },
  { href: "/owner/payouts", label: "Đối soát", icon: "cash-outline" },
  { href: "/owner/profile", label: "Hồ sơ đối tác", icon: "briefcase-outline" },
];

// Mục điều hướng khu quản trị (M1–M15); `roles` ẩn mục Staff không có quyền.
export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Tổng quan", icon: "speedometer-outline", exact: true },
  { href: "/admin/bookings", label: "Booking", icon: "calendar-outline" },
  { href: "/admin/reviews", label: "Kiểm duyệt đánh giá", icon: "star-outline" },
  { href: "/admin/support", label: "CSKH", icon: "chatbubbles-outline" },
  { href: "/admin/partners", label: "Đối tác", icon: "briefcase-outline", roles: ["ADMIN"] },
  { href: "/admin/listings", label: "Duyệt tin đăng", icon: "checkmark-done-outline", roles: ["ADMIN"] },
  { href: "/admin/destinations", label: "Địa điểm", icon: "map-outline", roles: ["ADMIN"] },
  { href: "/admin/payouts", label: "Đối soát", icon: "cash-outline", roles: ["ADMIN"] },
  { href: "/admin/users", label: "Người dùng", icon: "people-outline" },
  { href: "/admin/catalog", label: "Danh mục & tiện ích", icon: "pricetags-outline", roles: ["ADMIN"] },
  { href: "/admin/vouchers", label: "Voucher", icon: "ticket-outline", roles: ["ADMIN"] },
  { href: "/admin/audit-logs", label: "Nhật ký", icon: "document-text-outline", roles: ["ADMIN"] },
];
