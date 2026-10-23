import { z } from "zod";
import { paginationSchema } from "../lib/pagination.js";

const booleanQuery = z.enum(["true", "false"]).transform((value) => value === "true");

const idListQuery = z
  .string()
  .transform((value) => value.split(",").map((part) => Number(part.trim())))
  .pipe(z.array(z.number().int().positive()).max(20));

export const listDestinationsSchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  location: z.string().trim().max(100).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  facilityIds: idListQuery.optional(),
  featured: booleanQuery.optional(),
  includeInactive: booleanQuery.optional(),
  sort: z.enum(["newest", "popular", "rating", "price_asc", "price_desc", "name"]).default("newest"),
});

export const destinationBodySchema = z.object({
  name: z.string().trim().min(2).max(191),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug chỉ gồm chữ thường, số và dấu gạch ngang")
    .optional(),
  description: z.string().trim().max(10000).nullable().optional(),
  location: z.string().trim().min(2).max(191),
  address: z.string().trim().max(500).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  imageUrl: z.url().max(500).nullable().optional(),
  images: z.array(z.url().max(500)).max(20).optional(),
  contactPhone: z.string().trim().max(20).nullable().optional(),
  contactEmail: z.email().nullable().optional(),
  policy: z.string().trim().max(10000).nullable().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  facilityIds: z.array(z.number().int().positive()).max(50).optional(),
  isActive: z.boolean().optional(),
  // Chỉ ADMIN được đặt; bị bỏ qua khi chủ địa điểm gửi lên.
  isFeatured: z.boolean().optional(),
  ownerId: z.number().int().positive().nullable().optional(),
});

export const reviewListingSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    rejectReason: z.string().trim().min(3).max(500).optional(),
  })
  .refine((value) => value.status !== "REJECTED" || value.rejectReason, {
    message: "Cần nhập lý do từ chối",
    path: ["rejectReason"],
  });

export const manageDestinationsSchema = paginationSchema.extend({
  listingStatus: z.enum(["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED"]).optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  q: z.string().trim().max(100).optional(),
});

export const updateDestinationSchema = destinationBodySchema.partial();

export type ListDestinationsInput = z.infer<typeof listDestinationsSchema>;
export type DestinationBody = z.infer<typeof destinationBodySchema>;
