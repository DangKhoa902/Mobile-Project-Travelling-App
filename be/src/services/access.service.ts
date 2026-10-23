import { forbidden, notFound } from "../lib/http-error.js";
import { prisma, type TransactionClient } from "../lib/prisma.js";
import type { AuthUser } from "../middlewares/auth.js";

type Db = TransactionClient | typeof prisma;

export const isOwner = (user: AuthUser) => user.role === "OWNER";

// ADMIN quản lý mọi địa điểm; OWNER chỉ quản lý địa điểm mình đăng.
export async function assertCanManageDestination(user: AuthUser, destinationId: number, db: Db = prisma) {
  const destination = await db.destination.findUnique({
    where: { id: destinationId },
    select: { id: true, ownerId: true, name: true, listingStatus: true },
  });
  if (!destination) throw notFound("Địa điểm");
  if (user.role === "ADMIN") return destination;
  if (isOwner(user) && destination.ownerId === user.id) return destination;
  throw forbidden("Bạn chỉ được quản lý địa điểm của mình");
}

// Tỷ lệ hoa hồng áp cho booking tại địa điểm: địa điểm của sàn (không có chủ) → sàn giữ 100%.
export async function commissionRateFor(ownerId: number | null, db: Db = prisma) {
  if (ownerId == null) return 1;
  const profile = await db.partnerProfile.findUnique({ where: { userId: ownerId }, select: { commissionRate: true } });
  return profile?.commissionRate ?? 1;
}
