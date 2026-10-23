import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import type { ListDestinationsInput } from "../validators/destination.schema.js";

export const destinationSummarySelect = {
  id: true,
  name: true,
  slug: true,
  location: true,
  imageUrl: true,
  minPrice: true,
  averageRating: true,
  reviewCount: true,
  isFeatured: true,
  isActive: true,
  listingStatus: true,
  ownerId: true,
  category: { select: { id: true, name: true, slug: true } },
} as const satisfies Prisma.DestinationSelect;

const destinationDetailInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, sortOrder: true } },
  facilities: { select: { id: true, name: true, iconName: true } },
  packages: { where: { isActive: true }, orderBy: { price: "asc" } },
  roomTypes: { where: { isActive: true }, orderBy: { pricePerNight: "asc" } },
  services: { where: { isActive: true }, orderBy: { price: "asc" } },
} as const satisfies Prisma.DestinationInclude;

const SORT_ORDERS: Record<ListDestinationsInput["sort"], Prisma.DestinationOrderByWithRelationInput[]> = {
  newest: [{ createdAt: "desc" }],
  popular: [{ reviewCount: "desc" }, { averageRating: "desc" }],
  rating: [{ averageRating: "desc" }, { reviewCount: "desc" }],
  price_asc: [{ minPrice: "asc" }],
  price_desc: [{ minPrice: "desc" }],
  name: [{ name: "asc" }],
};

export function buildDestinationWhere(query: ListDestinationsInput, canSeeInactive: boolean): Prisma.DestinationWhereInput {
  return {
    // Công khai: chỉ tin đã duyệt và đang hoạt động. Staff/Admin có thể xem tất cả bằng includeInactive=true.
    ...(canSeeInactive && query.includeInactive ? {} : { isActive: true, listingStatus: "APPROVED" as const }),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.location ? { location: { contains: query.location } } : {}),
    ...(query.featured !== undefined ? { isFeatured: query.featured } : {}),
    ...(query.minRating !== undefined ? { averageRating: { gte: query.minRating } } : {}),
    ...(query.minPrice !== undefined || query.maxPrice !== undefined
      ? { minPrice: { gte: query.minPrice, lte: query.maxPrice } }
      : {}),
    // Địa điểm phải có đủ tất cả tiện ích được chọn.
    ...(query.facilityIds?.length
      ? { AND: query.facilityIds.map((id) => ({ facilities: { some: { id } } })) }
      : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q } },
            { location: { contains: query.q } },
            { address: { contains: query.q } },
            { category: { name: { contains: query.q } } },
          ],
        }
      : {}),
  };
}

export const destinationDao = {
  findMany(query: ListDestinationsInput, where: Prisma.DestinationWhereInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.destination.findMany({ where, select: destinationSummarySelect, orderBy: SORT_ORDERS[query.sort], skip, take }),
      prisma.destination.count({ where }),
    ]);
  },

  findByIdOrSlug(idOrSlug: string) {
    const id = Number(idOrSlug);
    const where: Prisma.DestinationWhereUniqueInput = Number.isInteger(id) && id > 0 ? { id } : { slug: idOrSlug };
    return prisma.destination.findUnique({ where, include: destinationDetailInclude });
  },

  // Bản đầy đủ cho trang quản lý: gồm cả gói/phòng/dịch vụ đang tắt và thông tin kiểm duyệt.
  findForManagement(id: number) {
    return prisma.destination.findUnique({
      where: { id },
      include: {
        ...destinationDetailInclude,
        packages: { orderBy: { price: "asc" } },
        roomTypes: { orderBy: { pricePerNight: "asc" } },
        services: { orderBy: { price: "asc" } },
        owner: { select: { id: true, name: true, email: true, partnerProfile: { select: { businessName: true } } } },
        _count: { select: { bookings: true, favorites: true } },
      },
    });
  },

  findLatestApprovedReviews(destinationId: number, take = 5) {
    return prisma.review.findMany({
      where: { destinationId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take,
      select: reviewPublicSelect,
    });
  },

  findApprovedReviews(destinationId: number, skip: number, take: number) {
    const where = { destinationId, status: "APPROVED" } as const;
    return prisma.$transaction([
      prisma.review.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, select: reviewPublicSelect }),
      prisma.review.count({ where }),
    ]);
  },
};

export const reviewPublicSelect = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true, avatarUrl: true } },
} as const satisfies Prisma.ReviewSelect;
