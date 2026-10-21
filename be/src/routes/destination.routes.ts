import { Router } from "express";
import { buildDestinationWhere, destinationDao } from "../dao/destination.dao.js";
import { notFound } from "../lib/http-error.js";
import { idParamSchema, paginated, paginationSchema, toSkipTake } from "../lib/pagination.js";
import { prisma } from "../lib/prisma.js";
import { authenticate, isStaff, optionalAuth, requireRole } from "../middlewares/auth.js";
import { checkAvailability } from "../services/booking.service.js";
import * as destinationService from "../services/destination.service.js";
import { availabilitySchema } from "../validators/booking.schema.js";
import {
  destinationBodySchema,
  listDestinationsSchema,
  updateDestinationSchema,
} from "../validators/destination.schema.js";

export const destinationRouter = Router();

// GET /api/destinations?q=Đà Lạt&categoryId=1&minPrice=0&maxPrice=5000000&minRating=4&facilityIds=1,2&sort=rating
destinationRouter.get("/", optionalAuth, async (request, response) => {
  const query = listDestinationsSchema.parse(request.query);
  const canSeeInactive = request.user ? isStaff(request.user) : false;
  const { skip, take } = toSkipTake(query);
  const [data, total] = await destinationDao.findMany(query, buildDestinationWhere(query, canSeeInactive), skip, take);
  response.json(paginated(data, total, query));
});

// Nhận id hoặc slug: /api/destinations/12 hoặc /api/destinations/da-lat-resort
destinationRouter.get("/:idOrSlug", optionalAuth, async (request, response) => {
  const destination = await destinationDao.findByIdOrSlug(String(request.params.idOrSlug));
  const canSeeInactive = request.user ? isStaff(request.user) : false;
  if (!destination || (!destination.isActive && !canSeeInactive)) throw notFound("Địa điểm");

  const [latestReviews, favorite] = await Promise.all([
    destinationDao.findLatestApprovedReviews(destination.id),
    request.user
      ? prisma.favorite.findUnique({ where: { userId_destinationId: { userId: request.user.id, destinationId: destination.id } } })
      : null,
  ]);

  response.json({ data: { ...destination, latestReviews, isFavorite: Boolean(favorite) } });
});

destinationRouter.get("/:id/reviews", async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const query = paginationSchema.parse(request.query);
  const { skip, take } = toSkipTake(query);
  const [data, total] = await destinationDao.findApprovedReviews(id, skip, take);
  response.json(paginated(data, total, query));
});

// GET /api/destinations/1/availability?roomTypeId=2&checkInDate=2026-12-01&checkOutDate=2026-12-03
destinationRouter.get("/:id/availability", async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const query = availabilitySchema.parse(request.query);
  response.json({ data: await checkAvailability(id, query.roomTypeId, query.checkInDate, query.checkOutDate) });
});

destinationRouter.post("/", authenticate, requireRole("ADMIN"), async (request, response) => {
  const destination = await destinationService.createDestination(destinationBodySchema.parse(request.body));
  response.status(201).json({ data: destination });
});

destinationRouter.patch("/:id", authenticate, requireRole("ADMIN"), async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const destination = await destinationService.updateDestination(id, updateDestinationSchema.parse(request.body));
  response.json({ data: destination });
});

// Xóa hẳn chỉ khi chưa có booking; nếu đã có booking (FK RESTRICT) trả 409, hãy dùng isActive=false.
destinationRouter.delete("/:id", authenticate, requireRole("ADMIN"), async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  await prisma.destination.delete({ where: { id } });
  response.status(204).end();
});
