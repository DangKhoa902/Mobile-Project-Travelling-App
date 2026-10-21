import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { bookingDao } from "../dao/booking.dao.js";
import type { Prisma } from "../generated/prisma/client.js";
import type { BookingStatus } from "../generated/prisma/enums.js";
import { badRequest, conflict, HttpError, notFound } from "../lib/http-error.js";
import { toSkipTake } from "../lib/pagination.js";
import { prisma, type TransactionClient } from "../lib/prisma.js";
import { type AuthUser, isStaff } from "../middlewares/auth.js";
import type { CreateBookingInput, ListBookingsInput, QuoteBookingInput } from "../validators/booking.schema.js";
import {
  canTransition,
  checkCustomerCancellation,
  generateBookingCode,
  nightsBetween,
  parseDateOnly,
  todayInVietnam,
} from "./booking-rules.js";
import { createNotification } from "./notification.service.js";
import { calculateBookingPrice } from "./pricing.js";

type Db = TransactionClient | typeof prisma;

const MAX_NIGHTS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export const UNAVAILABLE_MESSAGE = "Dịch vụ không còn khả dụng trong khoảng thời gian bạn chọn.";

function validateStayDates(checkInValue: string, checkOutValue: string, now = new Date()) {
  const checkIn = parseDateOnly(checkInValue);
  const checkOut = parseDateOnly(checkOutValue);
  if (checkIn < todayInVietnam(now)) throw badRequest("Ngày nhận phòng không được ở quá khứ", "INVALID_DATES");
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) throw badRequest("Ngày trả phòng phải sau ngày nhận phòng", "INVALID_DATES");
  if (nights > MAX_NIGHTS) throw badRequest(`Chỉ đặt tối đa ${MAX_NIGHTS} đêm mỗi lần`, "INVALID_DATES");
  return { checkIn, checkOut, nights };
}

// Số phòng còn trống = tổng phòng - số phòng bị giữ ở đêm đông nhất trong khoảng ở.
export async function getAvailableRooms(db: Db, roomType: { id: number; totalRooms: number }, checkIn: Date, checkOut: Date) {
  const overlapping = await bookingDao.findOverlapping(db, roomType.id, checkIn, checkOut);
  let maxBooked = 0;
  for (let night = checkIn.getTime(); night < checkOut.getTime(); night += DAY_MS) {
    const booked = overlapping
      .filter((booking) => booking.checkInDate.getTime() <= night && booking.checkOutDate.getTime() > night)
      .reduce((sum, booking) => sum + booking.roomsCount, 0);
    maxBooked = Math.max(maxBooked, booked);
  }
  return Math.max(0, roomType.totalRooms - maxBooked);
}

export async function checkAvailability(destinationId: number, roomTypeId: number, checkInValue: string, checkOutValue: string) {
  const { checkIn, checkOut, nights } = validateStayDates(checkInValue, checkOutValue);
  const roomType = await prisma.roomType.findFirst({
    where: { id: roomTypeId, destinationId, isActive: true },
    select: { id: true, name: true, totalRooms: true, pricePerNight: true, capacity: true },
  });
  if (!roomType) throw notFound("Loại phòng");
  const availableRooms = await getAvailableRooms(prisma, roomType, checkIn, checkOut);
  return { roomType, nights, availableRooms, isAvailable: availableRooms > 0 };
}

async function buildQuote(db: Db, input: QuoteBookingInput) {
  const { checkIn, checkOut, nights } = validateStayDates(input.checkInDate, input.checkOutDate);

  const pkg = await db.package.findFirst({
    where: { id: input.packageId, isActive: true, destination: { isActive: true } },
    include: { destination: { select: { id: true, name: true, slug: true, imageUrl: true, location: true } } },
  });
  if (!pkg) throw notFound("Gói dịch vụ");

  const roomType = await db.roomType.findFirst({
    where: { id: input.roomTypeId, destinationId: pkg.destinationId, isActive: true },
  });
  if (!roomType) throw badRequest("Loại phòng không thuộc địa điểm của gói đã chọn", "INVALID_ROOM_TYPE");

  if (nights < pkg.durationNights) {
    throw badRequest(`Gói ${pkg.name} yêu cầu tối thiểu ${pkg.durationNights} đêm`, "INVALID_DATES");
  }
  if (input.guests > roomType.capacity * input.roomsCount) {
    throw badRequest(
      `${input.roomsCount} phòng ${roomType.name} chỉ chứa tối đa ${roomType.capacity * input.roomsCount} khách`,
      "CAPACITY_EXCEEDED",
    );
  }

  const serviceIds = input.services.map((service) => service.addonServiceId);
  if (new Set(serviceIds).size !== serviceIds.length) throw badRequest("Dịch vụ bổ sung bị trùng", "DUPLICATE_SERVICE");
  const addonServices = serviceIds.length
    ? await db.addonService.findMany({ where: { id: { in: serviceIds }, destinationId: pkg.destinationId, isActive: true } })
    : [];
  if (addonServices.length !== serviceIds.length) {
    throw badRequest("Có dịch vụ bổ sung không hợp lệ hoặc không thuộc địa điểm này", "INVALID_SERVICE");
  }

  const services = input.services.map((selected) => {
    const service = addonServices.find((item) => item.id === selected.addonServiceId)!;
    return { id: service.id, name: service.name, price: service.price, pricingUnit: service.pricingUnit, quantity: selected.quantity };
  });

  let voucher = null;
  if (input.voucherCode) {
    voucher = await db.voucher.findUnique({ where: { code: input.voucherCode } });
    const now = new Date();
    if (!voucher || !voucher.isActive || voucher.startsAt > now || voucher.endsAt < now) {
      throw badRequest("Mã giảm giá không tồn tại hoặc đã hết hạn", "INVALID_VOUCHER");
    }
    if (voucher.usageLimit != null && voucher.usedCount >= voucher.usageLimit) {
      throw badRequest("Mã giảm giá đã hết lượt sử dụng", "VOUCHER_EXHAUSTED");
    }
  }

  const priceWithoutVoucher = calculateBookingPrice({
    packagePrice: pkg.price,
    roomPricePerNight: roomType.pricePerNight,
    nights,
    roomsCount: input.roomsCount,
    guests: input.guests,
    services,
    taxRate: env.BOOKING_TAX_RATE,
  });
  if (voucher && priceWithoutVoucher.subtotal < voucher.minOrderValue) {
    throw badRequest(
      `Mã giảm giá yêu cầu đơn tối thiểu ${voucher.minOrderValue.toLocaleString("vi-VN")} VNĐ`,
      "VOUCHER_MIN_ORDER",
    );
  }
  const price = voucher
    ? calculateBookingPrice({
        packagePrice: pkg.price,
        roomPricePerNight: roomType.pricePerNight,
        nights,
        roomsCount: input.roomsCount,
        guests: input.guests,
        services,
        voucher,
        taxRate: env.BOOKING_TAX_RATE,
      })
    : priceWithoutVoucher;

  const availableRooms = await getAvailableRooms(db, roomType, checkIn, checkOut);

  return {
    destination: pkg.destination,
    package: { id: pkg.id, name: pkg.name, durationDays: pkg.durationDays, durationNights: pkg.durationNights },
    roomType: { id: roomType.id, name: roomType.name, capacity: roomType.capacity, pricePerNight: roomType.pricePerNight },
    services: services.map((service, index) => ({ ...service, totalPrice: price.services[index].totalPrice })),
    voucher: voucher ? { id: voucher.id, code: voucher.code } : null,
    checkIn,
    checkOut,
    nights,
    guests: input.guests,
    roomsCount: input.roomsCount,
    availableRooms,
    isAvailable: availableRooms >= input.roomsCount,
    taxRate: env.BOOKING_TAX_RATE,
    price,
  };
}

export async function quoteBooking(input: QuoteBookingInput) {
  const quote = await buildQuote(prisma, input);
  const { voucher, ...rest } = quote;
  return { ...rest, voucherCode: voucher?.code ?? null };
}

export async function createBooking(user: AuthUser, input: CreateBookingInput) {
  const booking = await prisma.$transaction(async (tx) => {
    // Khóa dòng loại phòng để các request đặt cùng lúc phải chờ nhau, tránh overbooking.
    await tx.$queryRaw`SELECT id FROM RoomType WHERE id = ${input.roomTypeId} FOR UPDATE`;
    if (input.voucherCode) await tx.$queryRaw`SELECT id FROM Voucher WHERE code = ${input.voucherCode} FOR UPDATE`;

    const quote = await buildQuote(tx, input);
    if (!quote.isAvailable) throw new HttpError(409, UNAVAILABLE_MESSAGE, "NOT_AVAILABLE", { availableRooms: quote.availableRooms });

    if (quote.voucher) await tx.voucher.update({ where: { id: quote.voucher.id }, data: { usedCount: { increment: 1 } } });

    const created = await tx.booking.create({
      data: {
        code: generateBookingCode(),
        userId: user.id,
        destinationId: quote.destination.id,
        packageId: quote.package.id,
        roomTypeId: quote.roomType.id,
        voucherId: quote.voucher?.id,
        checkInDate: quote.checkIn,
        checkOutDate: quote.checkOut,
        nights: quote.nights,
        guests: input.guests,
        roomsCount: input.roomsCount,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        note: input.note,
        packagePrice: quote.price.packagePrice,
        roomPrice: quote.price.roomPrice,
        servicesPrice: quote.price.servicesPrice,
        subtotal: quote.price.subtotal,
        discountAmount: quote.price.discountAmount,
        taxAmount: quote.price.taxAmount,
        totalAmount: quote.price.totalAmount,
        services: { create: quote.price.services },
        payment: { create: { method: input.paymentMethod, amount: quote.price.totalAmount } },
      },
    });

    await createNotification(
      {
        userId: user.id,
        type: "BOOKING",
        title: "Đặt chỗ thành công",
        body:
          input.paymentMethod === "ONLINE_MOCK"
            ? `Booking ${created.code} tại ${quote.destination.name} đã được tạo. Vui lòng thanh toán để xác nhận.`
            : `Booking ${created.code} tại ${quote.destination.name} đã được tạo và đang chờ xác nhận.`,
        data: { bookingId: created.id, code: created.code },
      },
      tx,
    );

    return created;
  });

  return bookingDao.findById(booking.id);
}

export async function listBookings(user: AuthUser, query: ListBookingsInput) {
  const where: Prisma.BookingWhereInput = {
    // BR-10: user thường chỉ thấy booking của chính mình.
    ...(isStaff(user) ? {} : { userId: user.id }),
    ...(query.status ? { status: query.status } : {}),
    ...(query.code ? { code: { contains: query.code } } : {}),
  };
  const { skip, take } = toSkipTake(query);
  const [data, total] = await bookingDao.findMany(where, skip, take);
  return { data, total };
}

async function getAccessibleBooking(user: AuthUser, id: number, db: Db = prisma) {
  const booking = await bookingDao.findById(id, db);
  if (!booking) throw notFound("Booking");
  if (!isStaff(user) && booking.userId !== user.id) throw notFound("Booking");
  return booking;
}

export const getBooking = (user: AuthUser, id: number) => getAccessibleBooking(user, id);

export async function cancelBooking(user: AuthUser, id: number, reason?: string) {
  await prisma.$transaction(async (tx) => {
    const booking = await getAccessibleBooking(user, id, tx);

    if (isStaff(user)) {
      if (!canTransition(booking.status, "CANCELLED")) {
        throw conflict(`Không thể hủy booking ở trạng thái ${booking.status}`, "INVALID_STATUS");
      }
    } else {
      const check = checkCustomerCancellation(booking, booking.package.freeCancellationHours);
      if (!check.allowed) throw conflict(check.reason, "CANCELLATION_NOT_ALLOWED");
    }

    const now = new Date();
    await tx.booking.update({
      where: { id },
      data: { status: "CANCELLED", cancelledAt: now, cancelReason: reason },
    });
    if (booking.payment?.status === "PAID") {
      await tx.payment.update({ where: { bookingId: id }, data: { status: "REFUNDED", refundedAt: now } });
    }
    if (booking.voucherId) {
      await tx.voucher.update({ where: { id: booking.voucherId }, data: { usedCount: { decrement: 1 } } });
    }
    await createNotification(
      {
        userId: booking.userId,
        type: "BOOKING",
        title: "Booking đã bị hủy",
        body:
          booking.payment?.status === "PAID"
            ? `Booking ${booking.code} đã được hủy. Khoản thanh toán sẽ được hoàn lại.`
            : `Booking ${booking.code} đã được hủy.`,
        data: { bookingId: id, code: booking.code },
      },
      tx,
    );
  });
  return bookingDao.findById(id);
}

export async function updateBookingStatus(id: number, status: Extract<BookingStatus, "CONFIRMED" | "COMPLETED">) {
  await prisma.$transaction(async (tx) => {
    const booking = await bookingDao.findById(id, tx);
    if (!booking) throw notFound("Booking");
    if (!canTransition(booking.status, status)) {
      throw conflict(`Không thể chuyển booking từ ${booking.status} sang ${status}`, "INVALID_STATUS");
    }

    const now = new Date();
    if (status === "CONFIRMED") {
      // BR-06: booking thanh toán online phải được thanh toán trước khi xác nhận.
      if (booking.payment?.method === "ONLINE_MOCK" && booking.payment.status !== "PAID") {
        throw conflict("Booking chưa được thanh toán", "PAYMENT_REQUIRED");
      }
      await tx.booking.update({ where: { id }, data: { status, confirmedAt: now } });
    } else {
      if (todayInVietnam(now) < booking.checkInDate) {
        throw conflict("Chỉ hoàn thành booking từ ngày nhận phòng trở đi", "INVALID_STATUS");
      }
      await tx.booking.update({ where: { id }, data: { status, completedAt: now } });
      // Khách thanh toán tại nơi lưu trú: ghi nhận đã thu tiền khi hoàn thành.
      if (booking.payment && booking.payment.status === "UNPAID") {
        await tx.payment.update({ where: { bookingId: id }, data: { status: "PAID", paidAt: now } });
      }
    }

    await createNotification(
      {
        userId: booking.userId,
        type: "BOOKING",
        title: status === "CONFIRMED" ? "Booking đã được xác nhận" : "Chuyến đi đã hoàn thành",
        body:
          status === "CONFIRMED"
            ? `Booking ${booking.code} tại ${booking.destination.name} đã được xác nhận.`
            : `Cảm ơn bạn đã trải nghiệm ${booking.destination.name}. Hãy để lại đánh giá cho chuyến đi nhé!`,
        data: { bookingId: id, code: booking.code },
      },
      tx,
    );
  });
  return bookingDao.findById(id);
}

// Thanh toán giả lập: không gọi cổng thanh toán thật, chỉ đổi trạng thái.
export async function payBooking(user: AuthUser, id: number, simulateFailure: boolean) {
  await prisma.$transaction(async (tx) => {
    const booking = await bookingDao.findById(id, tx);
    if (!booking || booking.userId !== user.id) throw notFound("Booking");
    if (booking.status !== "PENDING") throw conflict("Chỉ thanh toán được booking đang chờ", "INVALID_STATUS");
    if (!booking.payment || booking.payment.method !== "ONLINE_MOCK") {
      throw conflict("Booking này thanh toán tại nơi lưu trú", "INVALID_PAYMENT_METHOD");
    }
    if (booking.payment.status === "PAID") throw conflict("Booking đã được thanh toán", "ALREADY_PAID");

    const now = new Date();
    if (simulateFailure) {
      await tx.payment.update({ where: { bookingId: id }, data: { status: "FAILED" } });
      await createNotification(
        { userId: user.id, type: "PAYMENT", title: "Thanh toán thất bại", body: `Thanh toán cho booking ${booking.code} không thành công. Vui lòng thử lại.`, data: { bookingId: id } },
        tx,
      );
      return;
    }

    await tx.payment.update({
      where: { bookingId: id },
      data: { status: "PAID", paidAt: now, transactionRef: `MOCK-${randomUUID()}` },
    });
    await tx.booking.update({ where: { id }, data: { status: "CONFIRMED", confirmedAt: now } });
    await createNotification(
      {
        userId: user.id,
        type: "PAYMENT",
        title: "Thanh toán thành công",
        body: `Đã nhận ${booking.totalAmount.toLocaleString("vi-VN")} VNĐ cho booking ${booking.code}. Booking đã được xác nhận.`,
        data: { bookingId: id, code: booking.code },
      },
      tx,
    );
  });

  const booking = await bookingDao.findById(id);
  if (booking?.payment?.status === "FAILED") {
    throw new HttpError(402, "Thanh toán thất bại", "PAYMENT_FAILED", { bookingId: id });
  }
  return booking;
}
