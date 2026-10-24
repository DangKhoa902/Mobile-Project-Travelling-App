import { Router } from "express";
import { z } from "zod";
import { idParamSchema, paginated, paginationSchema, toSkipTake } from "../lib/pagination.js";
import { authenticate, currentUser, requireRole } from "../middlewares/auth.js";
import * as payoutService from "../services/payout.service.js";

// Đối soát: ADMIN lập kỳ và xác nhận đã chuyển khoản; OWNER xem kỳ của mình.
export const payoutRouter = Router();

payoutRouter.use(authenticate, requireRole("OWNER", "ADMIN"));

const periodSchema = z.object({ periodStart: z.iso.date(), periodEnd: z.iso.date() });

payoutRouter.get("/", async (request, response) => {
  const query = paginationSchema
    .extend({
      status: z.enum(["PENDING", "PAID", "CANCELLED"]).optional(),
      ownerId: z.coerce.number().int().positive().optional(),
    })
    .parse(request.query);
  const [data, total] = await payoutService.listPayouts(currentUser(request), { ...query, ...toSkipTake(query) });
  response.json(paginated(data, total, query));
});

// Chủ địa điểm: doanh thu đã hoàn thành chưa được đối soát.
payoutRouter.get("/unsettled", requireRole("OWNER"), async (request, response) => {
  response.json({ data: await payoutService.unsettledSummary(currentUser(request).id) });
});

// ?periodStart=2026-10-01&periodEnd=2026-10-31 → số tiền từng chủ trước khi lập phiếu.
payoutRouter.get("/preview", requireRole("ADMIN"), async (request, response) => {
  const { periodStart, periodEnd } = periodSchema.parse(request.query);
  response.json({ data: await payoutService.previewPayouts(periodStart, periodEnd) });
});

payoutRouter.post("/", requireRole("ADMIN"), async (request, response) => {
  const input = periodSchema
    .extend({ ownerId: z.number().int().positive(), note: z.string().trim().max(500).optional() })
    .parse(request.body);
  response.status(201).json({ data: await payoutService.createPayout(currentUser(request), input) });
});

payoutRouter.get("/:id", async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  response.json({ data: await payoutService.getPayout(currentUser(request), id) });
});

payoutRouter.patch("/:id/pay", requireRole("ADMIN"), async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const { transferRef } = z.object({ transferRef: z.string().trim().min(3).max(100) }).parse(request.body);
  response.json({ data: await payoutService.markPayoutPaid(currentUser(request), id, transferRef) });
});

payoutRouter.patch("/:id/cancel", requireRole("ADMIN"), async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const { reason } = z.object({ reason: z.string().trim().max(500).optional() }).parse(request.body ?? {});
  response.json({ data: await payoutService.cancelPayout(currentUser(request), id, reason) });
});
