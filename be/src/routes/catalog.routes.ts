import { Router } from "express";
import { z } from "zod";
import { idParamSchema, paginated, paginationSchema, toSkipTake } from "../lib/pagination.js";
import { prisma } from "../lib/prisma.js";
import { slugify } from "../lib/slug.js";
import { authenticate, currentUser, requireRole } from "../middlewares/auth.js";
import { assertCanManageDestination } from "../services/access.service.js";
import { refreshDestinationMinPrice } from "../services/destination.service.js";

const adminOnly = [authenticate, requireRole("ADMIN")];
// Gói, phòng, dịch vụ: ADMIN quản lý mọi địa điểm, OWNER quản lý địa điểm của mình.
const managers = [authenticate, requireRole("OWNER", "ADMIN")];
const money = z.number().int().min(0).max(2_000_000_000);

// ---------- Danh mục ----------
export const categoryRouter = Router();

const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  iconName: z.string().trim().max(50).nullable().optional(),
});

categoryRouter.get("/", async (_request, response) => {
  const data = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { destinations: { where: { isActive: true, listingStatus: "APPROVED" } } } } },
  });
  response.json({ data });
});

categoryRouter.post("/", ...adminOnly, async (request, response) => {
  const input = categorySchema.parse(request.body);
  const data = await prisma.category.create({ data: { ...input, slug: input.slug ?? slugify(input.name) } });
  response.status(201).json({ data });
});

categoryRouter.patch("/:id", ...adminOnly, async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  response.json({ data: await prisma.category.update({ where: { id }, data: categorySchema.partial().parse(request.body) }) });
});

categoryRouter.delete("/:id", ...adminOnly, async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  await prisma.category.delete({ where: { id } });
  response.status(204).end();
});

// ---------- Tiện ích ----------
export const facilityRouter = Router();

const facilitySchema = z.object({
  name: z.string().trim().min(2).max(100),
  iconName: z.string().trim().max(50).nullable().optional(),
});

facilityRouter.get("/", async (_request, response) => {
  response.json({ data: await prisma.facility.findMany({ orderBy: { name: "asc" } }) });
});

facilityRouter.post("/", ...adminOnly, async (request, response) => {
  response.status(201).json({ data: await prisma.facility.create({ data: facilitySchema.parse(request.body) }) });
});

facilityRouter.patch("/:id", ...adminOnly, async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  response.json({ data: await prisma.facility.update({ where: { id }, data: facilitySchema.partial().parse(request.body) }) });
});

facilityRouter.delete("/:id", ...adminOnly, async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  await prisma.facility.delete({ where: { id } });
  response.status(204).end();
});

// ---------- Gói dịch vụ ----------
export const packageRouter = Router();

const packageBaseSchema = z.object({
    destinationId: z.number().int().positive(),
    name: z.string().trim().min(2).max(191),
    description: z.string().trim().max(5000).nullable().optional(),
    inclusions: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
    durationDays: z.number().int().min(1).max(60),
    durationNights: z.number().int().min(0).max(60),
    price: money,
    freeCancellationHours: z.number().int().min(0).max(24 * 60).optional(),
    isActive: z.boolean().optional(),
});
const packageSchema = packageBaseSchema.refine(
  (value) => value.durationNights <= value.durationDays,
  "Số đêm không được lớn hơn số ngày",
);

packageRouter.post("/", ...managers, async (request, response) => {
  const input = packageSchema.parse(request.body);
  await assertCanManageDestination(currentUser(request), input.destinationId);
  const data = await prisma.package.create({ data: input });
  await refreshDestinationMinPrice(input.destinationId);
  response.status(201).json({ data });
});

packageRouter.patch("/:id", ...managers, async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const existing = await prisma.package.findUniqueOrThrow({ where: { id }, select: { destinationId: true } });
  await assertCanManageDestination(currentUser(request), existing.destinationId);
  const input = packageBaseSchema.omit({ destinationId: true }).partial().parse(request.body);
  const data = await prisma.package.update({ where: { id }, data: input });
  await refreshDestinationMinPrice(data.destinationId);
  response.json({ data });
});

// ---------- Loại phòng ----------
export const roomTypeRouter = Router();

const roomTypeSchema = z.object({
  destinationId: z.number().int().positive(),
  name: z.string().trim().min(2).max(191),
  description: z.string().trim().max(5000).nullable().optional(),
  capacity: z.number().int().min(1).max(20),
  pricePerNight: money,
  totalRooms: z.number().int().min(0).max(10000),
  isActive: z.boolean().optional(),
});

roomTypeRouter.post("/", ...managers, async (request, response) => {
  const input = roomTypeSchema.parse(request.body);
  await assertCanManageDestination(currentUser(request), input.destinationId);
  const data = await prisma.roomType.create({ data: input });
  await refreshDestinationMinPrice(input.destinationId);
  response.status(201).json({ data });
});

roomTypeRouter.patch("/:id", ...managers, async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const existing = await prisma.roomType.findUniqueOrThrow({ where: { id }, select: { destinationId: true } });
  await assertCanManageDestination(currentUser(request), existing.destinationId);
  const data = await prisma.roomType.update({
    where: { id },
    data: roomTypeSchema.omit({ destinationId: true }).partial().parse(request.body),
  });
  await refreshDestinationMinPrice(data.destinationId);
  response.json({ data });
});

// ---------- Dịch vụ bổ sung ----------
export const addonServiceRouter = Router();

const addonServiceSchema = z.object({
  destinationId: z.number().int().positive(),
  name: z.string().trim().min(2).max(191),
  description: z.string().trim().max(5000).nullable().optional(),
  price: money,
  pricingUnit: z.enum(["PER_BOOKING", "PER_GUEST", "PER_NIGHT"]).optional(),
  isActive: z.boolean().optional(),
});

addonServiceRouter.post("/", ...managers, async (request, response) => {
  const input = addonServiceSchema.parse(request.body);
  await assertCanManageDestination(currentUser(request), input.destinationId);
  response.status(201).json({ data: await prisma.addonService.create({ data: input }) });
});

addonServiceRouter.patch("/:id", ...managers, async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const existing = await prisma.addonService.findUniqueOrThrow({ where: { id }, select: { destinationId: true } });
  await assertCanManageDestination(currentUser(request), existing.destinationId);
  const data = await prisma.addonService.update({
    where: { id },
    data: addonServiceSchema.omit({ destinationId: true }).partial().parse(request.body),
  });
  response.json({ data });
});

// ---------- Voucher ----------
export const voucherRouter = Router();

const voucherBaseSchema = z.object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,50}$/),
    description: z.string().trim().max(191).nullable().optional(),
    discountType: z.enum(["PERCENT", "FIXED"]),
    value: z.number().int().positive(),
    maxDiscount: money.nullable().optional(),
    minOrderValue: money.optional(),
    usageLimit: z.number().int().positive().nullable().optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    isActive: z.boolean().optional(),
});
const voucherSchema = voucherBaseSchema
  .refine((value) => value.endsAt > value.startsAt, "endsAt phải sau startsAt")
  .refine((value) => value.discountType !== "PERCENT" || value.value <= 100, "Giảm theo % tối đa 100");

voucherRouter.use(...adminOnly);

voucherRouter.get("/", async (request, response) => {
  const query = paginationSchema.parse(request.query);
  const { skip, take } = toSkipTake(query);
  const [data, total] = await prisma.$transaction([
    prisma.voucher.findMany({ orderBy: { createdAt: "desc" }, skip, take }),
    prisma.voucher.count(),
  ]);
  response.json(paginated(data, total, query));
});

voucherRouter.post("/", async (request, response) => {
  response.status(201).json({ data: await prisma.voucher.create({ data: voucherSchema.parse(request.body) }) });
});

voucherRouter.patch("/:id", async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const input = voucherBaseSchema.omit({ code: true }).partial().parse(request.body);
  response.json({ data: await prisma.voucher.update({ where: { id }, data: input }) });
});
