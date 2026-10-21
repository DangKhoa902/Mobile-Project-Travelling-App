import { notFound } from "../lib/http-error.js";
import { prisma, type TransactionClient } from "../lib/prisma.js";
import { slugify } from "../lib/slug.js";
import type { DestinationBody } from "../validators/destination.schema.js";

type Db = TransactionClient | typeof prisma;

// "Giá từ" = gói rẻ nhất + phòng rẻ nhất cho đủ số đêm của gói đó.
export async function refreshDestinationMinPrice(destinationId: number, db: Db = prisma) {
  const [packages, cheapestRoom] = await Promise.all([
    db.package.findMany({ where: { destinationId, isActive: true }, select: { price: true, durationNights: true } }),
    db.roomType.findFirst({ where: { destinationId, isActive: true }, orderBy: { pricePerNight: "asc" }, select: { pricePerNight: true } }),
  ]);
  const roomPerNight = cheapestRoom?.pricePerNight ?? 0;
  const minPrice = packages.length
    ? Math.min(...packages.map((pkg) => pkg.price + roomPerNight * pkg.durationNights))
    : 0;
  await db.destination.update({ where: { id: destinationId }, data: { minPrice } });
}

export async function refreshDestinationRating(destinationId: number, db: Db = prisma) {
  const stats = await db.review.aggregate({
    where: { destinationId, status: "APPROVED" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await db.destination.update({
    where: { id: destinationId },
    data: {
      averageRating: Math.round((stats._avg.rating ?? 0) * 10) / 10,
      reviewCount: stats._count._all,
    },
  });
}

export function createDestination(input: DestinationBody) {
  const { images, facilityIds, categoryId, ...data } = input;
  return prisma.destination.create({
    data: {
      ...data,
      slug: input.slug ?? slugify(input.name),
      category: categoryId ? { connect: { id: categoryId } } : undefined,
      facilities: facilityIds ? { connect: facilityIds.map((id) => ({ id })) } : undefined,
      images: images ? { create: images.map((url, sortOrder) => ({ url, sortOrder })) } : undefined,
    },
  });
}

export async function updateDestination(id: number, input: Partial<DestinationBody>) {
  const existing = await prisma.destination.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Địa điểm");

  const { images, facilityIds, categoryId, ...data } = input;
  return prisma.$transaction(async (tx) => {
    if (images) {
      await tx.destinationImage.deleteMany({ where: { destinationId: id } });
    }
    return tx.destination.update({
      where: { id },
      data: {
        ...data,
        category: categoryId === undefined ? undefined : categoryId === null ? { disconnect: true } : { connect: { id: categoryId } },
        facilities: facilityIds ? { set: facilityIds.map((facilityId) => ({ id: facilityId })) } : undefined,
        images: images ? { create: images.map((url, sortOrder) => ({ url, sortOrder })) } : undefined,
      },
    });
  });
}
