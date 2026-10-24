import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../generated/prisma/client.js";
import { paginated, paginationSchema, toSkipTake } from "../lib/pagination.js";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { parseDateOnly } from "../services/booking-rules.js";

export const auditRouter = Router();

auditRouter.use(authenticate, requireRole("ADMIN"));

// GET /api/audit-logs?entity=PartnerProfile&entityId=3&actorId=1&action=partner.approve&from=2026-10-01&to=2026-10-31
auditRouter.get("/", async (request, response) => {
  const query = paginationSchema
    .extend({
      actorId: z.coerce.number().int().positive().optional(),
      entity: z.string().trim().max(64).optional(),
      entityId: z.string().trim().max(64).optional(),
      // Lọc theo tiền tố: "partner." lấy mọi thao tác với đối tác.
      action: z.string().trim().max(64).optional(),
      from: z.iso.date().optional(),
      to: z.iso.date().optional(),
    })
    .parse(request.query);
  const where: Prisma.AuditLogWhereInput = {
    ...(query.actorId ? { actorId: query.actorId } : {}),
    ...(query.entity ? { entity: query.entity } : {}),
    ...(query.entityId ? { entityId: query.entityId } : {}),
    ...(query.action ? { action: { startsWith: query.action } } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            gte: query.from ? parseDateOnly(query.from) : undefined,
            lt: query.to ? new Date(parseDateOnly(query.to).getTime() + 24 * 60 * 60 * 1000) : undefined,
          },
        }
      : {}),
  };
  const { skip, take } = toSkipTake(query);
  const [data, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { actor: { select: { id: true, name: true, email: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);
  response.json(paginated(data, total, query));
});
