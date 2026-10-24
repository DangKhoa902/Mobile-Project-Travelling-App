import { Router } from "express";
import { z } from "zod";
import { idParamSchema, paginated, paginationSchema, toSkipTake } from "../lib/pagination.js";
import { prisma } from "../lib/prisma.js";
import { authenticate, currentUser, requireRole } from "../middlewares/auth.js";
import * as reviewService from "../services/review.service.js";

export const reviewRouter = Router();

reviewRouter.use(authenticate);

const reviewBodySchema = z.object({
  bookingId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
  // URL lấy từ POST /api/uploads với purpose=review.
  imageUrls: z.array(z.url().max(500)).max(5).optional(),
});

reviewRouter.post("/", async (request, response) => {
  const review = await reviewService.createReview(currentUser(request), reviewBodySchema.parse(request.body));
  response.status(201).json({ data: review });
});

// User: review của mình (mọi trạng thái). Staff/Admin dùng /moderation.
reviewRouter.get("/mine", async (request, response) => {
  const query = paginationSchema.parse(request.query);
  const where = { userId: currentUser(request).id };
  const { skip, take } = toSkipTake(query);
  const [data, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        destination: { select: { id: true, name: true, slug: true, imageUrl: true } },
        images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);
  response.json(paginated(data, total, query));
});

reviewRouter.get("/moderation", requireRole("STAFF", "ADMIN"), async (request, response) => {
  const query = paginationSchema
    .extend({ status: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING") })
    .parse(request.query);
  const where = { status: query.status };
  const { skip, take } = toSkipTake(query);
  const [data, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip,
      take,
      include: {
        user: { select: { id: true, name: true, email: true } },
        destination: { select: { id: true, name: true } },
        images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);
  response.json(paginated(data, total, query));
});

reviewRouter.patch("/:id", async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const input = reviewBodySchema.omit({ bookingId: true }).partial().parse(request.body);
  response.json({ data: await reviewService.updateReview(currentUser(request), id, input) });
});

reviewRouter.delete("/:id", async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  await reviewService.deleteReview(currentUser(request), id);
  response.status(204).end();
});

reviewRouter.patch("/:id/moderation", requireRole("STAFF", "ADMIN"), async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const { status, rejectReason } = z
    .object({ status: z.enum(["APPROVED", "REJECTED"]), rejectReason: z.string().trim().max(500).optional() })
    .parse(request.body);
  response.json({ data: await reviewService.moderateReview(currentUser(request), id, status, rejectReason) });
});
