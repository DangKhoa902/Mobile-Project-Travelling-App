import { Router } from "express";
import type { Prisma } from "../generated/prisma/client.js";
import { destinationDao, destinationSummarySelect } from "../dao/destination.dao.js";
import { notFound } from "../lib/http-error.js";
import { idParamSchema, paginated, toSkipTake } from "../lib/pagination.js";
import { prisma } from "../lib/prisma.js";
import { authenticate, currentUser, requireRole } from "../middlewares/auth.js";
import { assertCanManageDestination } from "../services/access.service.js";
import { manageDestinationsSchema } from "../validators/destination.schema.js";

// Trang quản lý tin đăng: OWNER thấy địa điểm của mình (mọi trạng thái), ADMIN thấy tất cả.
export const manageRouter = Router();

manageRouter.use(authenticate, requireRole("OWNER", "ADMIN"));

// ADMIN: ?listingStatus=PENDING_REVIEW để lấy hàng chờ duyệt tin.
manageRouter.get("/destinations", async (request, response) => {
  const user = currentUser(request);
  const query = manageDestinationsSchema.parse(request.query);
  const where: Prisma.DestinationWhereInput = {
    ...(user.role === "OWNER" ? { ownerId: user.id } : query.ownerId ? { ownerId: query.ownerId } : {}),
    ...(query.listingStatus ? { listingStatus: query.listingStatus } : {}),
    ...(query.q ? { name: { contains: query.q } } : {}),
  };
  const { skip, take } = toSkipTake(query);
  const [data, total] = await prisma.$transaction([
    prisma.destination.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      select: {
        ...destinationSummarySelect,
        listingRejectReason: true,
        submittedAt: true,
        approvedAt: true,
        updatedAt: true,
        owner: { select: { id: true, name: true, partnerProfile: { select: { businessName: true } } } },
        _count: { select: { bookings: true, packages: true, roomTypes: true } },
      },
    }),
    prisma.destination.count({ where }),
  ]);
  response.json(paginated(data, total, query));
});

manageRouter.get("/destinations/:id", async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  await assertCanManageDestination(currentUser(request), id);
  const destination = await destinationDao.findForManagement(id);
  if (!destination) throw notFound("Địa điểm");
  response.json({ data: destination });
});
