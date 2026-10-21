import { Router } from "express";
import { z } from "zod";
import { destinationSummarySelect } from "../dao/destination.dao.js";
import { notFound } from "../lib/http-error.js";
import { paginated, paginationSchema, toSkipTake } from "../lib/pagination.js";
import { prisma } from "../lib/prisma.js";
import { authenticate, currentUser } from "../middlewares/auth.js";

export const favoriteRouter = Router();

favoriteRouter.use(authenticate);

const destinationParamSchema = z.object({ destinationId: z.coerce.number().int().positive() });

favoriteRouter.get("/", async (request, response) => {
  const query = paginationSchema.parse(request.query);
  const where = { userId: currentUser(request).id, destination: { isActive: true } };
  const { skip, take } = toSkipTake(query);
  const [favorites, total] = await prisma.$transaction([
    prisma.favorite.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: { createdAt: true, destination: { select: destinationSummarySelect } },
    }),
    prisma.favorite.count({ where }),
  ]);
  const data = favorites.map((favorite) => ({ ...favorite.destination, favoritedAt: favorite.createdAt }));
  response.json(paginated(data, total, query));
});

// Nhấn "Yêu thích": đã có thì bỏ, chưa có thì thêm (BR-03 đảm bảo bằng khóa chính kép).
favoriteRouter.post("/:destinationId/toggle", async (request, response) => {
  const { destinationId } = destinationParamSchema.parse(request.params);
  const userId = currentUser(request).id;
  const destination = await prisma.destination.findFirst({ where: { id: destinationId, isActive: true }, select: { id: true } });
  if (!destination) throw notFound("Địa điểm");

  const key = { userId_destinationId: { userId, destinationId } };
  const existing = await prisma.favorite.findUnique({ where: key });
  if (existing) {
    await prisma.favorite.delete({ where: key });
  } else {
    await prisma.favorite.upsert({ where: key, create: { userId, destinationId }, update: {} });
  }
  response.json({ data: { destinationId, isFavorite: !existing } });
});

favoriteRouter.delete("/:destinationId", async (request, response) => {
  const { destinationId } = destinationParamSchema.parse(request.params);
  await prisma.favorite.deleteMany({ where: { userId: currentUser(request).id, destinationId } });
  response.status(204).end();
});
