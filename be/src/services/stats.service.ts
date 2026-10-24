import { Prisma } from "../generated/prisma/client.js";
import { badRequest } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthUser } from "../middlewares/auth.js";
import { parseDateOnly, todayInVietnam } from "./booking-rules.js";
import { unsettledSummary } from "./payout.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;
// Doanh thu chỉ tính booking đã chốt; PENDING chưa chắc thành, CANCELLED đã hoàn tiền.
const REVENUE_STATUSES = ["CONFIRMED", "COMPLETED"] as const;

export type StatsRange = { from?: string; to?: string };

// Khoảng ngày theo giờ Việt Nam [from, to] (gồm cả ngày to), mặc định 30 ngày gần nhất.
function resolveRange({ from, to }: StatsRange) {
  const toDay = to ? parseDateOnly(to) : todayInVietnam();
  const fromDay = from ? parseDateOnly(from) : new Date(toDay.getTime() - 29 * DAY_MS);
  const days = Math.round((toDay.getTime() - fromDay.getTime()) / DAY_MS) + 1;
  if (days < 1) throw badRequest("Ngày bắt đầu phải trước ngày kết thúc", "INVALID_RANGE");
  if (days > MAX_RANGE_DAYS) throw badRequest(`Chỉ thống kê tối đa ${MAX_RANGE_DAYS} ngày`, "INVALID_RANGE");
  return {
    fromDay,
    toDay,
    days,
    // Mốc UTC tương ứng 00:00 giờ Việt Nam để so với createdAt.
    start: new Date(fromDay.getTime() - VIETNAM_OFFSET_MS),
    end: new Date(toDay.getTime() + DAY_MS - VIETNAM_OFFSET_MS),
  };
}

const toNumber = (value: unknown) => Number(value ?? 0);
const toDayString = (value: unknown) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);

export async function getOverview(user: AuthUser, range: StatsRange) {
  const { fromDay, days, start, end } = resolveRange(range);
  const ownerId = user.role === "OWNER" ? user.id : undefined;
  const scope: Prisma.BookingWhereInput = ownerId ? { destination: { ownerId } } : {};
  const inRange: Prisma.BookingWhereInput = { ...scope, createdAt: { gte: start, lt: end } };
  const revenueWhere: Prisma.BookingWhereInput = { ...inRange, status: { in: [...REVENUE_STATUSES] } };

  const [byStatus, revenue, topRaw, paymentMethods, dailyRows] = await Promise.all([
    prisma.booking.groupBy({ by: ["status"], where: inRange, _count: { _all: true } }),
    prisma.booking.aggregate({
      where: revenueWhere,
      _count: { _all: true },
      _sum: { totalAmount: true, commissionAmount: true, ownerRevenue: true, discountAmount: true },
    }),
    prisma.booking.groupBy({
      by: ["destinationId"],
      where: revenueWhere,
      _count: { _all: true },
      _sum: { totalAmount: true, commissionAmount: true },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: 5,
    }),
    prisma.payment.groupBy({
      by: ["method"],
      where: { booking: revenueWhere },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.$queryRaw<{ day: unknown; bookings: unknown; gbv: unknown; commission: unknown; ownerRevenue: unknown }[]>`
      SELECT DATE(DATE_ADD(b.createdAt, INTERVAL 7 HOUR)) AS day,
             COUNT(*) AS bookings,
             SUM(b.totalAmount) AS gbv,
             SUM(b.commissionAmount) AS commission,
             SUM(b.ownerRevenue) AS ownerRevenue
      FROM Booking b
      JOIN Destination d ON d.id = b.destinationId
      WHERE b.status IN ('CONFIRMED', 'COMPLETED')
        AND b.createdAt >= ${start} AND b.createdAt < ${end}
        ${ownerId ? Prisma.sql`AND d.ownerId = ${ownerId}` : Prisma.empty}
      GROUP BY day
      ORDER BY day`,
  ]);

  const statusCounts = { PENDING: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0 };
  for (const row of byStatus) statusCounts[row.status] = row._count._all;
  const totalBookings = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

  // Điền 0 cho ngày không có booking để biểu đồ liền mạch.
  const dailyMap = new Map(dailyRows.map((row) => [toDayString(row.day), row]));
  const revenueByDay = Array.from({ length: days }, (_, index) => {
    const date = new Date(fromDay.getTime() + index * DAY_MS).toISOString().slice(0, 10);
    const row = dailyMap.get(date);
    return {
      date,
      bookings: toNumber(row?.bookings),
      grossBookingValue: toNumber(row?.gbv),
      commission: toNumber(row?.commission),
      ownerRevenue: toNumber(row?.ownerRevenue),
    };
  });

  const destinations = await prisma.destination.findMany({
    where: { id: { in: topRaw.map((row) => row.destinationId) } },
    select: { id: true, name: true, location: true, averageRating: true, reviewCount: true },
  });
  const topDestinations = topRaw.map((row) => ({
    ...destinations.find((destination) => destination.id === row.destinationId),
    bookings: row._count._all,
    grossBookingValue: row._sum.totalAmount ?? 0,
    commission: row._sum.commissionAmount ?? 0,
  }));

  const confirmedCount = revenue._count._all;
  const grossBookingValue = revenue._sum.totalAmount ?? 0;

  return {
    scope: ownerId ? "OWNER" : "PLATFORM",
    range: { from: fromDay.toISOString().slice(0, 10), to: revenueByDay.at(-1)?.date, days },
    summary: {
      // Tổng giá trị booking đã chốt (khách trả, gồm thuế/phí).
      grossBookingValue,
      // Doanh thu của sàn = hoa hồng.
      platformRevenue: revenue._sum.commissionAmount ?? 0,
      ownerRevenue: revenue._sum.ownerRevenue ?? 0,
      discountGiven: revenue._sum.discountAmount ?? 0,
      totalBookings,
      confirmedBookings: confirmedCount,
      cancellationRate: totalBookings ? Math.round((statusCounts.CANCELLED / totalBookings) * 1000) / 10 : 0,
      averageBookingValue: confirmedCount ? Math.round(grossBookingValue / confirmedCount) : 0,
      roomNightsSold: await roomNights(revenueWhere),
    },
    bookingsByStatus: statusCounts,
    revenueByDay,
    topDestinations,
    paymentMethods: paymentMethods.map((row) => ({ method: row.method, count: row._count._all, amount: row._sum.amount ?? 0 })),
    ...(ownerId ? await ownerExtras(ownerId) : await platformExtras(start, end)),
  };
}

// Số đêm phòng = Σ (đêm × số phòng); không lấy được từ aggregate nên cộng tay.
async function roomNights(where: Prisma.BookingWhereInput) {
  const rows = await prisma.booking.findMany({ where, select: { nights: true, roomsCount: true } });
  return rows.reduce((sum, row) => sum + row.nights * row.roomsCount, 0);
}

async function platformExtras(start: Date, end: Date) {
  const [newUsers, totalUsers, activeOwners, partnerApplications, listingsToReview, reviewsToModerate, bookingsToConfirm, openConversations] =
    await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: start, lt: end } } }),
      prisma.user.count(),
      prisma.partnerProfile.count({ where: { status: "APPROVED" } }),
      prisma.partnerProfile.count({ where: { status: "PENDING" } }),
      prisma.destination.count({ where: { listingStatus: "PENDING_REVIEW" } }),
      prisma.review.count({ where: { status: "PENDING" } }),
      prisma.booking.count({ where: { status: "PENDING", payment: { method: "PAY_AT_PROPERTY" } } }),
      prisma.conversation.count({ where: { status: "OPEN" } }),
    ]);
  return {
    users: { newUsers, totalUsers, activeOwners },
    // Việc cần xử lý: hiển thị dạng thẻ có nút dẫn tới trang tương ứng.
    pending: { partnerApplications, listingsToReview, reviewsToModerate, bookingsToConfirm, openConversations },
  };
}

async function ownerExtras(ownerId: number) {
  const [listings, bookingsToConfirm, upcomingCheckIns, rating, unsettled, pendingPayouts] = await Promise.all([
    prisma.destination.groupBy({ by: ["listingStatus"], where: { ownerId }, _count: { _all: true } }),
    prisma.booking.count({ where: { destination: { ownerId }, status: "PENDING", payment: { method: "PAY_AT_PROPERTY" } } }),
    prisma.booking.count({
      where: {
        destination: { ownerId },
        status: "CONFIRMED",
        checkInDate: { gte: todayInVietnam(), lt: new Date(todayInVietnam().getTime() + 7 * DAY_MS) },
      },
    }),
    prisma.review.aggregate({ where: { destination: { ownerId }, status: "APPROVED" }, _avg: { rating: true }, _count: { _all: true } }),
    unsettledSummary(ownerId),
    prisma.payout.aggregate({ where: { ownerId, status: "PENDING" }, _sum: { amount: true }, _count: { _all: true } }),
  ]);
  const listingCounts = { DRAFT: 0, PENDING_REVIEW: 0, APPROVED: 0, REJECTED: 0 };
  for (const row of listings) listingCounts[row.listingStatus] = row._count._all;
  return {
    listings: listingCounts,
    rating: { average: Math.round((rating._avg.rating ?? 0) * 10) / 10, reviews: rating._count._all },
    pending: { bookingsToConfirm, upcomingCheckIns },
    // Tiền của chủ: chưa vào kỳ đối soát / đã lập kỳ nhưng sàn chưa chuyển.
    payouts: {
      unsettledAmount: unsettled.amount,
      unsettledBookings: unsettled.bookingCount,
      pendingPayoutAmount: pendingPayouts._sum.amount ?? 0,
      pendingPayouts: pendingPayouts._count._all,
    },
  };
}
