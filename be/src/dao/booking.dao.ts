import type { Prisma } from "../generated/prisma/client.js";
import { prisma, type TransactionClient } from "../lib/prisma.js";
import { HOLDING_STATUSES } from "../services/booking-rules.js";

export const bookingListInclude = {
  destination: { select: { id: true, name: true, slug: true, location: true, imageUrl: true } },
  package: { select: { id: true, name: true } },
  roomType: { select: { id: true, name: true } },
  payment: { select: { method: true, status: true, paidAt: true } },
  review: { select: { id: true, rating: true, status: true } },
} as const satisfies Prisma.BookingInclude;

export const bookingDetailInclude = {
  ...bookingListInclude,
  user: { select: { id: true, name: true, email: true, phone: true } },
  package: {
    select: { id: true, name: true, durationDays: true, durationNights: true, freeCancellationHours: true },
  },
  roomType: { select: { id: true, name: true, capacity: true } },
  voucher: { select: { code: true, discountType: true, value: true } },
  services: { include: { addonService: { select: { id: true, name: true, pricingUnit: true } } } },
  payment: true,
} as const satisfies Prisma.BookingInclude;

export const bookingDao = {
  findMany(where: Prisma.BookingWhereInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.booking.findMany({ where, include: bookingListInclude, orderBy: { createdAt: "desc" }, skip, take }),
      prisma.booking.count({ where }),
    ]);
  },

  findById(id: number, db: TransactionClient | typeof prisma = prisma) {
    return db.booking.findUnique({ where: { id }, include: bookingDetailInclude });
  },

  // Booking đang giữ phòng và có giao với khoảng [checkIn, checkOut).
  findOverlapping(db: TransactionClient | typeof prisma, roomTypeId: number, checkIn: Date, checkOut: Date) {
    return db.booking.findMany({
      where: {
        roomTypeId,
        status: { in: HOLDING_STATUSES },
        checkInDate: { lt: checkOut },
        checkOutDate: { gt: checkIn },
      },
      select: { checkInDate: true, checkOutDate: true, roomsCount: true },
    });
  },
};
