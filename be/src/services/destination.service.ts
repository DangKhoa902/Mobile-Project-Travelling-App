import { badRequest, conflict, notFound } from "../lib/http-error.js";
import { prisma, type TransactionClient } from "../lib/prisma.js";
import { searchTextFor } from "../lib/destination-search.js";
import { slugify } from "../lib/slug.js";
import type { AuthUser } from "../middlewares/auth.js";
import { assertCanManageDestination } from "./access.service.js";
import { audit } from "./audit.service.js";
import { createNotification, notifyRoles } from "./notification.service.js";
import type { DestinationBody } from "../validators/destination.schema.js";

type Db = TransactionClient | typeof prisma;

// Tìm kiếm không dấu: tính lại khi tên, khu vực, địa chỉ hoặc danh mục đổi.
export async function refreshDestinationSearchText(destinationId: number, db: Db = prisma) {
  const destination = await db.destination.findUnique({
    where: { id: destinationId },
    select: { name: true, location: true, address: true, category: { select: { name: true } } },
  });
  if (!destination) return;
  await db.destination.update({ where: { id: destinationId }, data: { searchText: searchTextFor(destination) } });
}

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

function ownerRelation(ownerId: number | null | undefined) {
  if (ownerId === undefined) return undefined;
  return ownerId === null ? { disconnect: true } : { connect: { id: ownerId } };
}

async function assertOwnerAccount(ownerId: number | null | undefined) {
  if (ownerId == null) return;
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { role: true } });
  if (owner?.role !== "OWNER") throw badRequest("ownerId phải là tài khoản chủ địa điểm đã được duyệt", "INVALID_OWNER");
}

// ADMIN tạo địa điểm đã duyệt sẵn (có thể gán chủ); OWNER tạo bản nháp thuộc về mình.
export async function createDestination(user: AuthUser, input: DestinationBody) {
  const { images, facilityIds, categoryId, ownerId, isFeatured, ...data } = input;
  const byOwner = user.role === "OWNER";
  if (!byOwner) await assertOwnerAccount(ownerId);

  const created = await prisma.destination.create({
    data: {
      ...data,
      slug: input.slug ?? slugify(input.name),
      isFeatured: byOwner ? false : isFeatured,
      listingStatus: byOwner ? "DRAFT" : "APPROVED",
      approvedAt: byOwner ? null : new Date(),
      owner: byOwner ? { connect: { id: user.id } } : ownerRelation(ownerId),
      category: categoryId ? { connect: { id: categoryId } } : undefined,
      facilities: facilityIds ? { connect: facilityIds.map((id) => ({ id })) } : undefined,
      images: images ? { create: images.map((url, sortOrder) => ({ url, sortOrder })) } : undefined,
    },
  });
  await refreshDestinationSearchText(created.id);
  return created;
}

// Tin đã duyệt vẫn hiển thị khi chủ địa điểm sửa nội dung; admin có thể ẩn nếu vi phạm.
export async function updateDestination(user: AuthUser, id: number, input: Partial<DestinationBody>) {
  await assertCanManageDestination(user, id);
  const { images, facilityIds, categoryId, ownerId, isFeatured, ...data } = input;
  const byOwner = user.role === "OWNER";
  if (!byOwner) await assertOwnerAccount(ownerId);

  const updated = await prisma.$transaction(async (tx) => {
    if (images) {
      await tx.destinationImage.deleteMany({ where: { destinationId: id } });
    }
    return tx.destination.update({
      where: { id },
      data: {
        ...data,
        isFeatured: byOwner ? undefined : isFeatured,
        owner: byOwner ? undefined : ownerRelation(ownerId),
        category: categoryId === undefined ? undefined : categoryId === null ? { disconnect: true } : { connect: { id: categoryId } },
        facilities: facilityIds ? { set: facilityIds.map((facilityId) => ({ id: facilityId })) } : undefined,
        images: images ? { create: images.map((url, sortOrder) => ({ url, sortOrder })) } : undefined,
      },
    });
  });
  await refreshDestinationSearchText(id);
  return updated;
}

// Chủ địa điểm gửi tin để admin duyệt. Tin phải đủ thông tin để khách đặt được.
export async function submitListing(user: AuthUser, id: number) {
  const destination = await assertCanManageDestination(user, id);
  if (destination.listingStatus !== "DRAFT" && destination.listingStatus !== "REJECTED") {
    throw conflict("Chỉ gửi duyệt được tin nháp hoặc tin bị từ chối", "INVALID_LISTING_STATUS");
  }
  const [packages, roomTypes] = await Promise.all([
    prisma.package.count({ where: { destinationId: id, isActive: true } }),
    prisma.roomType.count({ where: { destinationId: id, isActive: true } }),
  ]);
  if (packages === 0 || roomTypes === 0) {
    throw badRequest("Cần ít nhất một gói dịch vụ và một loại phòng đang mở bán trước khi gửi duyệt", "LISTING_INCOMPLETE");
  }

  const updated = await prisma.destination.update({
    where: { id },
    data: { listingStatus: "PENDING_REVIEW", submittedAt: new Date(), listingRejectReason: null },
  });
  await notifyRoles(["ADMIN"], {
    type: "PARTNER",
    title: "Có tin đăng chờ duyệt",
    body: `"${destination.name}" vừa được gửi duyệt.`,
    data: { destinationId: id },
  });
  return updated;
}

export async function reviewListing(reviewer: AuthUser, id: number, status: "APPROVED" | "REJECTED", rejectReason?: string) {
  const destination = await prisma.destination.findUnique({ where: { id }, select: { listingStatus: true, ownerId: true, name: true } });
  if (!destination) throw notFound("Địa điểm");
  if (destination.listingStatus !== "PENDING_REVIEW") {
    throw conflict("Chỉ duyệt được tin đang chờ duyệt", "INVALID_LISTING_STATUS");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.destination.update({
      where: { id },
      data:
        status === "APPROVED"
          ? { listingStatus: "APPROVED", approvedAt: new Date(), listingRejectReason: null }
          : { listingStatus: "REJECTED", listingRejectReason: rejectReason },
    });
    await audit({ actorId: reviewer.id, action: status === "APPROVED" ? "listing.approve" : "listing.reject", entity: "Destination", entityId: id, before: { listingStatus: destination.listingStatus }, after: { listingStatus: updated.listingStatus, rejectReason } }, tx);
    if (destination.ownerId) {
      await createNotification(
        {
          userId: destination.ownerId,
          type: "PARTNER",
          title: status === "APPROVED" ? "Tin đăng đã được duyệt" : "Tin đăng bị từ chối",
          body:
            status === "APPROVED"
              ? `"${destination.name}" đã hiển thị cho khách và nhận đặt chỗ.`
              : `"${destination.name}" bị từ chối: ${rejectReason}. Hãy chỉnh sửa và gửi duyệt lại.`,
          data: { destinationId: id },
        },
        tx,
      );
    }
    return updated;
  });
}
