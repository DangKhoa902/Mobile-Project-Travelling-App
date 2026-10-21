import { Router } from "express";
import { z } from "zod";
import { notFound } from "../lib/http-error.js";
import { idParamSchema, paginated, paginationSchema, toSkipTake } from "../lib/pagination.js";
import { prisma } from "../lib/prisma.js";
import { authenticate, currentUser } from "../middlewares/auth.js";

export const notificationRouter = Router();

notificationRouter.use(authenticate);

notificationRouter.get("/", async (request, response) => {
  const query = paginationSchema
    .extend({ unread: z.enum(["true", "false"]).transform((value) => value === "true").optional() })
    .parse(request.query);
  const where = { userId: currentUser(request).id, ...(query.unread ? { isRead: false } : {}) };
  const { skip, take } = toSkipTake(query);
  const [data, total] = await prisma.$transaction([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.notification.count({ where }),
  ]);
  response.json(paginated(data, total, query));
});

notificationRouter.get("/unread-count", async (request, response) => {
  const count = await prisma.notification.count({ where: { userId: currentUser(request).id, isRead: false } });
  response.json({ data: { count } });
});

notificationRouter.patch("/read-all", async (request, response) => {
  const result = await prisma.notification.updateMany({
    where: { userId: currentUser(request).id, isRead: false },
    data: { isRead: true },
  });
  response.json({ data: { updated: result.count } });
});

notificationRouter.patch("/:id/read", async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const { isRead } = z.object({ isRead: z.boolean().default(true) }).parse(request.body ?? {});
  const result = await prisma.notification.updateMany({ where: { id, userId: currentUser(request).id }, data: { isRead } });
  if (result.count === 0) throw notFound("Thông báo");
  response.json({ data: { id, isRead } });
});
