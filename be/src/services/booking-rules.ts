import { randomBytes } from "node:crypto";
import type { BookingStatus } from "../generated/prisma/enums.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
// Giờ nhận phòng chuẩn 14:00 giờ Việt Nam = 07:00 UTC.
const CHECK_IN_HOUR_UTC = 7;

// Các trạng thái đang giữ phòng, dùng khi tính số phòng còn trống (BR-04).
export const HOLDING_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED"];

const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

// "2026-12-01" -> Date ở 00:00 UTC, khớp với cột @db.Date.
export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function todayInVietnam(now = new Date()): Date {
  const local = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
}

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / DAY_MS);
}

export function checkInMoment(checkInDate: Date): Date {
  return new Date(checkInDate.getTime() + CHECK_IN_HOUR_UTC * 60 * 60 * 1000);
}

export type CancellationCheck = { allowed: true } | { allowed: false; reason: string };

// BR-07: booking PENDING được hủy bất kỳ lúc nào trước giờ nhận phòng;
// booking CONFIRMED chỉ được khách tự hủy khi còn đủ số giờ hủy miễn phí của gói.
export function checkCustomerCancellation(
  booking: { status: BookingStatus; checkInDate: Date },
  freeCancellationHours: number,
  now = new Date(),
): CancellationCheck {
  if (!canTransition(booking.status, "CANCELLED")) {
    return { allowed: false, reason: `Booking in status ${booking.status} cannot be cancelled` };
  }

  const hoursUntilCheckIn = (checkInMoment(booking.checkInDate).getTime() - now.getTime()) / (60 * 60 * 1000);
  if (hoursUntilCheckIn <= 0) {
    return { allowed: false, reason: "Booking cannot be cancelled after check-in time" };
  }
  if (booking.status === "CONFIRMED" && hoursUntilCheckIn < freeCancellationHours) {
    return {
      allowed: false,
      reason: `Free cancellation is only available at least ${freeCancellationHours} hours before check-in. Please contact support.`,
    };
  }
  return { allowed: true };
}

// Mã booking dạng TA261021-7K3F9Q, đủ ngắn để đọc qua điện thoại.
export function generateBookingCode(now = new Date()): string {
  const local = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  const datePart = local.toISOString().slice(2, 10).replace(/-/g, "");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = Array.from(randomBytes(6), (byte) => alphabet[byte % alphabet.length]).join("");
  return `TA${datePart}-${random}`;
}
