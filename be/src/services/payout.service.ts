import type { Prisma } from "../generated/prisma/client.js";
import { badRequest, conflict, notFound } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthUser } from "../middlewares/auth.js";
import { audit } from "./audit.service.js";
import { parseDateOnly, todayInVietnam } from "./booking-rules.js";
import { createNotification } from "./notification.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

// Booking đủ điều kiện đối soát: đã hoàn thành, đã thu tiền, chưa thuộc kỳ nào,
// hoàn thành trong [periodStart, periodEnd] theo giờ Việt Nam.
function eligibleWhere(ownerId: number, periodStart: string, periodEnd: string): Prisma.BookingWhereInput {
  const start = new Date(parseDateOnly(periodStart).getTime() - VIETNAM_OFFSET_MS);
  const end = new Date(parseDateOnly(periodEnd).getTime() + DAY_MS - VIETNAM_OFFSET_MS);
  return {
    destination: { ownerId },
    status: "COMPLETED",
    payment: { status: "PAID" },
    payoutId: null,
    completedAt: { gte: start, lt: end },
  };
}

function validatePeriod(periodStart: string, periodEnd: string) {
  if (periodEnd < periodStart) throw badRequest("Ngày kết thúc kỳ phải sau ngày bắt đầu", "INVALID_RANGE");
  if (parseDateOnly(periodEnd) >= todayInVietnam()) throw badRequest("Chỉ đối soát kỳ đã kết thúc", "INVALID_RANGE");
}

async function summarize(where: Prisma.BookingWhereInput) {
  const totals = await prisma.booking.aggregate({
    where,
    _count: { _all: true },
    _sum: { totalAmount: true, commissionAmount: true, ownerRevenue: true },
  });
  return {
    bookingCount: totals._count._all,
    grossAmount: totals._sum.totalAmount ?? 0,
    commissionAmount: totals._sum.commissionAmount ?? 0,
    amount: totals._sum.ownerRevenue ?? 0,
  };
}

// Xem trước số tiền của từng chủ trong kỳ trước khi lập phiếu.
export async function previewPayouts(periodStart: string, periodEnd: string) {
  validatePeriod(periodStart, periodEnd);
  const owners = await prisma.partnerProfile.findMany({
    where: { status: { in: ["APPROVED", "SUSPENDED"] } },
    select: { userId: true, businessName: true, bankName: true, bankAccountNumber: true, bankAccountName: true },
  });
  const rows = await Promise.all(
    owners.map(async (owner) => ({
      ownerId: owner.userId,
      businessName: owner.businessName,
      hasBankAccount: Boolean(owner.bankAccountNumber),
      ...(await summarize(eligibleWhere(owner.userId, periodStart, periodEnd))),
    })),
  );
  return rows.filter((row) => row.bookingCount > 0);
}

// Lập phiếu chi cho một chủ: gắn các booking vào kỳ trong cùng transaction để không chi trùng.
export async function createPayout(admin: AuthUser, input: { ownerId: number; periodStart: string; periodEnd: string; note?: string }) {
  validatePeriod(input.periodStart, input.periodEnd);
  const profile = await prisma.partnerProfile.findUnique({ where: { userId: input.ownerId } });
  if (!profile) throw notFound("đối tác");
  if (!profile.bankAccountNumber) throw conflict("Đối tác chưa có tài khoản ngân hàng", "PARTNER_BANK_REQUIRED");

  return prisma.$transaction(async (tx) => {
    const where = eligibleWhere(input.ownerId, input.periodStart, input.periodEnd);
    const bookings = await tx.booking.findMany({
      where,
      select: { id: true, totalAmount: true, commissionAmount: true, ownerRevenue: true },
    });
    if (bookings.length === 0) throw conflict("Không có booking nào cần đối soát trong kỳ này", "NOTHING_TO_PAY");

    const payout = await tx.payout.create({
      data: {
        ownerId: input.ownerId,
        periodStart: parseDateOnly(input.periodStart),
        periodEnd: parseDateOnly(input.periodEnd),
        bookingCount: bookings.length,
        grossAmount: bookings.reduce((sum, b) => sum + b.totalAmount, 0),
        commissionAmount: bookings.reduce((sum, b) => sum + b.commissionAmount, 0),
        amount: bookings.reduce((sum, b) => sum + b.ownerRevenue, 0),
        bankName: profile.bankName,
        bankAccountNumber: profile.bankAccountNumber,
        bankAccountName: profile.bankAccountName,
        note: input.note,
        createdById: admin.id,
      },
    });
    // payoutId: null trong điều kiện: request song song không gắn được booking đã thuộc kỳ khác.
    const linked = await tx.booking.updateMany({
      where: { id: { in: bookings.map((b) => b.id) }, payoutId: null },
      data: { payoutId: payout.id },
    });
    if (linked.count !== bookings.length) throw conflict("Dữ liệu vừa thay đổi, vui lòng thử lại", "PAYOUT_CONFLICT");

    await audit({ actorId: admin.id, action: "payout.create", entity: "Payout", entityId: payout.id, after: payout }, tx);
    await createNotification(
      {
        userId: input.ownerId,
        type: "PARTNER",
        title: "Có kỳ đối soát mới",
        body: `Kỳ ${input.periodStart} → ${input.periodEnd}: ${bookings.length} booking, ${payout.amount.toLocaleString("vi-VN")} VNĐ đang chờ chuyển khoản.`,
        data: { payoutId: payout.id },
      },
      tx,
    );
    return payout;
  });
}

export async function markPayoutPaid(admin: AuthUser, id: number, transferRef: string) {
  return prisma.$transaction(async (tx) => {
    const payout = await tx.payout.findUnique({ where: { id } });
    if (!payout) throw notFound("kỳ đối soát");
    if (payout.status !== "PENDING") throw conflict(`Kỳ đối soát đang ở trạng thái ${payout.status}`, "INVALID_PAYOUT_STATUS");

    const updated = await tx.payout.update({ where: { id }, data: { status: "PAID", paidAt: new Date(), transferRef } });
    await audit({ actorId: admin.id, action: "payout.pay", entity: "Payout", entityId: id, before: { status: payout.status }, after: { status: "PAID", transferRef } }, tx);
    await createNotification(
      {
        userId: payout.ownerId,
        type: "PARTNER",
        title: "Đã chuyển tiền đối soát",
        body: `Sàn đã chuyển ${payout.amount.toLocaleString("vi-VN")} VNĐ vào tài khoản ${payout.bankName ?? ""}. Mã giao dịch: ${transferRef}.`,
        data: { payoutId: id },
      },
      tx,
    );
    return updated;
  });
}

// Hủy phiếu chưa chi: trả các booking về trạng thái chờ đối soát.
export async function cancelPayout(admin: AuthUser, id: number, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const payout = await tx.payout.findUnique({ where: { id } });
    if (!payout) throw notFound("kỳ đối soát");
    if (payout.status !== "PENDING") throw conflict("Chỉ hủy được kỳ chưa chuyển tiền", "INVALID_PAYOUT_STATUS");

    await tx.booking.updateMany({ where: { payoutId: id }, data: { payoutId: null } });
    const updated = await tx.payout.update({
      where: { id },
      data: { status: "CANCELLED", cancelledAt: new Date(), note: reason ?? payout.note },
    });
    await audit({ actorId: admin.id, action: "payout.cancel", entity: "Payout", entityId: id, before: { status: payout.status }, after: { status: "CANCELLED", reason } }, tx);
    return updated;
  });
}

export async function listPayouts(user: AuthUser, query: { status?: "PENDING" | "PAID" | "CANCELLED"; ownerId?: number; skip: number; take: number }) {
  const where: Prisma.PayoutWhereInput = {
    ...(user.role === "OWNER" ? { ownerId: user.id } : query.ownerId ? { ownerId: query.ownerId } : {}),
    ...(query.status ? { status: query.status } : {}),
  };
  return prisma.$transaction([
    prisma.payout.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: query.skip,
      take: query.take,
      include: { owner: { select: { id: true, name: true, partnerProfile: { select: { businessName: true } } } } },
    }),
    prisma.payout.count({ where }),
  ]);
}

export async function getPayout(user: AuthUser, id: number) {
  const payout = await prisma.payout.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true, partnerProfile: { select: { businessName: true } } } },
      bookings: {
        orderBy: { completedAt: "asc" },
        select: {
          id: true,
          code: true,
          checkInDate: true,
          checkOutDate: true,
          completedAt: true,
          totalAmount: true,
          commissionRate: true,
          commissionAmount: true,
          ownerRevenue: true,
          destination: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!payout || (user.role === "OWNER" && payout.ownerId !== user.id)) throw notFound("kỳ đối soát");
  return payout;
}

// Doanh thu của chủ đã hoàn thành nhưng chưa vào kỳ đối soát nào.
export async function unsettledSummary(ownerId: number) {
  return summarize({ destination: { ownerId }, status: "COMPLETED", payment: { status: "PAID" }, payoutId: null });
}
