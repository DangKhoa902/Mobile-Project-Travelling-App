import { Router } from "express";
import { z } from "zod";
import { idParamSchema, paginated, paginationSchema, toSkipTake } from "../lib/pagination.js";
import { prisma } from "../lib/prisma.js";
import { slugify } from "../lib/slug.js";
import { authenticate, currentUser, requireRole } from "../middlewares/auth.js";
import { assertCanManageDestination } from "../services/access.service.js";
import { audit, requestIp } from "../services/audit.service.js";
import { refreshDestinationMinPrice, refreshDestinationSearchText } from "../services/destination.service.js";
import { parseDateOnly } from "../services/booking-rules.js";
import { badRequest, conflict, notFound } from "../lib/http-error.js";

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
  const data = await prisma.category.update({ where: { id }, data: categorySchema.partial().parse(request.body) });
  // Tên danh mục nằm trong searchText của các địa điểm thuộc danh mục.
  const destinations = await prisma.destination.findMany({ where: { categoryId: id }, select: { id: true } });
  for (const destination of destinations) await refreshDestinationSearchText(destination.id);
  response.json({ data });
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
  const before = await prisma.package.findUniqueOrThrow({ where: { id }, select: { price: true, isActive: true } });
  const data = await prisma.package.update({ where: { id }, data: input });
  if (input.price !== undefined && input.price !== before.price) {
    await audit({ actorId: currentUser(request).id, action: "package.price_change", entity: "Package", entityId: id, before, after: { price: data.price }, ip: requestIp(request) });
  }
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
  const input = roomTypeSchema.omit({ destinationId: true }).partial().parse(request.body);
  const before = await prisma.roomType.findUniqueOrThrow({ where: { id }, select: { pricePerNight: true, totalRooms: true } });
  const data = await prisma.roomType.update({ where: { id }, data: input });
  if (input.pricePerNight !== undefined && input.pricePerNight !== before.pricePerNight) {
    await audit({ actorId: currentUser(request).id, action: "room_type.price_change", entity: "RoomType", entityId: id, before, after: { pricePerNight: data.pricePerNight }, ip: requestIp(request) });
  }
  await refreshDestinationMinPrice(data.destinationId);
  response.json({ data });
});

// ---------- Giá theo mùa của loại phòng ----------
const roomRateBaseSchema = z.object({
  name: z.string().trim().min(2).max(100),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  pricePerNight: money,
});
const roomRateSchema = roomRateBaseSchema.refine((value) => value.endDate >= value.startDate, {
  message: "endDate phải từ startDate trở đi",
  path: ["endDate"],
});
const rateParamSchema = z.object({ id: z.coerce.number().int().positive(), rateId: z.coerce.number().int().positive() });

async function assertNoOverlap(roomTypeId: number, startDate: Date, endDate: Date, exceptId?: number) {
  const clash = await prisma.roomRate.findFirst({
    where: { roomTypeId, startDate: { lte: endDate }, endDate: { gte: startDate }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { name: true },
  });
  if (clash) throw conflict(`Trùng ngày với giá mùa "${clash.name}"`, "RATE_OVERLAP");
}

async function managedRoomType(request: Parameters<typeof currentUser>[0], roomTypeId: number) {
  const roomType = await prisma.roomType.findUnique({ where: { id: roomTypeId }, select: { id: true, destinationId: true } });
  if (!roomType) throw notFound("Loại phòng");
  await assertCanManageDestination(currentUser(request), roomType.destinationId);
  return roomType;
}

// Công khai để giao diện hiện lịch giá; chỉ trả các khoảng chưa kết thúc.
roomTypeRouter.get("/:id/rates", async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
  response.json({
    data: await prisma.roomRate.findMany({ where: { roomTypeId: id, endDate: { gte: today } }, orderBy: { startDate: "asc" } }),
  });
});

roomTypeRouter.post("/:id/rates", ...managers, async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const input = roomRateSchema.parse(request.body);
  await managedRoomType(request, id);
  const startDate = parseDateOnly(input.startDate), endDate = parseDateOnly(input.endDate);
  await assertNoOverlap(id, startDate, endDate);
  const data = await prisma.roomRate.create({ data: { roomTypeId: id, name: input.name, startDate, endDate, pricePerNight: input.pricePerNight } });
  await audit({ actorId: currentUser(request).id, action: "room_rate.create", entity: "RoomRate", entityId: data.id, after: data, ip: requestIp(request) });
  response.status(201).json({ data });
});

roomTypeRouter.patch("/:id/rates/:rateId", ...managers, async (request, response) => {
  const { id, rateId } = rateParamSchema.parse(request.params);
  const input = roomRateBaseSchema.partial().parse(request.body);
  await managedRoomType(request, id);
  const before = await prisma.roomRate.findFirst({ where: { id: rateId, roomTypeId: id } });
  if (!before) throw notFound("giá mùa");
  const startDate = input.startDate ? parseDateOnly(input.startDate) : before.startDate;
  const endDate = input.endDate ? parseDateOnly(input.endDate) : before.endDate;
  if (endDate < startDate) throw badRequest("endDate phải từ startDate trở đi", "INVALID_DATES");
  await assertNoOverlap(id, startDate, endDate, rateId);
  const data = await prisma.roomRate.update({ where: { id: rateId }, data: { name: input.name, pricePerNight: input.pricePerNight, startDate, endDate } });
  await audit({ actorId: currentUser(request).id, action: "room_rate.update", entity: "RoomRate", entityId: rateId, before, after: data, ip: requestIp(request) });
  response.json({ data });
});

roomTypeRouter.delete("/:id/rates/:rateId", ...managers, async (request, response) => {
  const { id, rateId } = rateParamSchema.parse(request.params);
  await managedRoomType(request, id);
  const before = await prisma.roomRate.findFirst({ where: { id: rateId, roomTypeId: id } });
  if (!before) throw notFound("giá mùa");
  await prisma.roomRate.delete({ where: { id: rateId } });
  await audit({ actorId: currentUser(request).id, action: "room_rate.delete", entity: "RoomRate", entityId: rateId, before, ip: requestIp(request) });
  response.status(204).end();
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
  const data = await prisma.voucher.create({ data: voucherSchema.parse(request.body) });
  await audit({ actorId: currentUser(request).id, action: "voucher.create", entity: "Voucher", entityId: data.id, after: data, ip: requestIp(request) });
  response.status(201).json({ data });
});

voucherRouter.patch("/:id", async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const input = voucherBaseSchema.omit({ code: true }).partial().parse(request.body);
  const before = await prisma.voucher.findUniqueOrThrow({ where: { id } });
  const data = await prisma.voucher.update({ where: { id }, data: input });
  await audit({ actorId: currentUser(request).id, action: "voucher.update", entity: "Voucher", entityId: id, before, after: data, ip: requestIp(request) });
  response.json({ data });
});
