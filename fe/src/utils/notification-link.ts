import type { Href } from "expo-router";

import type { NotificationData, Role } from "@/types/api";

// Hợp đồng T4 → trang đích (yeu-cau-frontend.md mục 7): mở đúng trang theo `data` của thông báo / push.
export function notificationHref(data: NotificationData | null | undefined, role: Role | undefined): Href | null {
  if (!data) return null;
  const staff = role === "STAFF" || role === "ADMIN";
  if (data.payoutId) return role === "OWNER" ? "/owner/payouts" : staff ? "/admin/payouts" : null;
  if (data.partnerProfileId) return role === "ADMIN" ? "/admin/partners" : "/profile/partner";
  if (data.conversationId) return staff ? `/admin/support/${data.conversationId}` : `/conversations/${data.conversationId}`;
  if (data.bookingId) {
    if (role === "OWNER") return `/owner/bookings/${data.bookingId}`;
    if (staff) return `/admin/bookings/${data.bookingId}`;
    return `/bookings/${data.bookingId}`;
  }
  if (data.reviewId && !data.destinationId) return "/profile/reviews";
  if (data.destinationId) return role === "OWNER" ? `/owner/destinations/${data.destinationId}/status` : `/destinations/${data.destinationId}`;
  return null;
}
