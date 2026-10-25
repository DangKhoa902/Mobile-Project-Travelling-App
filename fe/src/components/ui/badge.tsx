import { Text, View } from "react-native";

import type { Booking, ListingStatus, PartnerStatus, PayoutStatus, ReviewStatus } from "@/types/api";
import {
  BOOKING_STATUS_LABEL,
  LISTING_STATUS_LABEL,
  PARTNER_STATUS_LABEL,
  PAYOUT_STATUS_LABEL,
  REVIEW_STATUS_LABEL,
} from "@/utils/format";

export type Tone = "green" | "blue" | "orange" | "yellow" | "gray" | "red";

const tones: Record<Tone, string> = {
  green: "bg-brand-soft text-brand",
  blue: "bg-info-soft text-info",
  orange: "bg-danger-soft text-danger",
  yellow: "bg-accent-soft text-[#8A5A12]",
  gray: "bg-[#ECEEEC] text-muted",
  red: "bg-danger-soft text-danger",
};

export function Badge({ label, tone = "gray" }: { label: string; tone?: Tone }) {
  const [bg, fg] = tones[tone].split(" ");
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${bg}`}>
      <Text className={`text-xs font-semibold ${fg}`}>{label}</Text>
    </View>
  );
}

// Badge booking theo bảng ở giao-dien.md (T3): online chưa trả = "Chờ thanh toán" (cam).
export function BookingStatusBadge({ booking }: { booking: Pick<Booking, "status" | "payment"> }) {
  if (booking.status === "PENDING" && booking.payment?.method === "ONLINE_MOCK" && booking.payment.status !== "PAID") {
    return <Badge label="Chờ thanh toán" tone="orange" />;
  }
  const tone: Record<Booking["status"], Tone> = { PENDING: "yellow", CONFIRMED: "green", COMPLETED: "blue", CANCELLED: "gray" };
  return <Badge label={BOOKING_STATUS_LABEL[booking.status]} tone={tone[booking.status]} />;
}

export function ListingBadge({ status }: { status: ListingStatus }) {
  const tone: Record<ListingStatus, Tone> = { DRAFT: "gray", PENDING_REVIEW: "yellow", APPROVED: "green", REJECTED: "red" };
  return <Badge label={LISTING_STATUS_LABEL[status]} tone={tone[status]} />;
}

export function ReviewBadge({ status }: { status: ReviewStatus }) {
  const tone: Record<ReviewStatus, Tone> = { PENDING: "yellow", APPROVED: "green", REJECTED: "red" };
  return <Badge label={REVIEW_STATUS_LABEL[status]} tone={tone[status]} />;
}

export function PartnerBadge({ status }: { status: PartnerStatus }) {
  const tone: Record<PartnerStatus, Tone> = { PENDING: "yellow", APPROVED: "green", REJECTED: "red", SUSPENDED: "gray" };
  return <Badge label={PARTNER_STATUS_LABEL[status]} tone={tone[status]} />;
}

export function PayoutBadge({ status }: { status: PayoutStatus }) {
  const tone: Record<PayoutStatus, Tone> = { PENDING: "yellow", PAID: "green", CANCELLED: "gray" };
  return <Badge label={PAYOUT_STATUS_LABEL[status]} tone={tone[status]} />;
}
