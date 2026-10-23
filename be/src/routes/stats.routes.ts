import { Router } from "express";
import { z } from "zod";
import { authenticate, currentUser, requireRole } from "../middlewares/auth.js";
import { getOverview } from "../services/stats.service.js";

export const statsRouter = Router();

// GET /api/stats/overview?from=2026-10-01&to=2026-10-31
// ADMIN: số liệu toàn sàn. OWNER: số liệu các địa điểm của mình.
statsRouter.get("/overview", authenticate, requireRole("OWNER", "ADMIN"), async (request, response) => {
  const range = z.object({ from: z.iso.date().optional(), to: z.iso.date().optional() }).parse(request.query);
  response.json({ data: await getOverview(currentUser(request), range) });
});
