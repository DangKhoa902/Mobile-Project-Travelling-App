import cors from "cors";
import express from "express";
import helmet from "helmet";
import { corsOrigins, env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { localUploadRoot } from "./lib/storage.js";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler.js";
import { auditRouter } from "./routes/audit.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { bookingRouter } from "./routes/booking.routes.js";
import {
  addonServiceRouter,
  categoryRouter,
  facilityRouter,
  packageRouter,
  roomTypeRouter,
  voucherRouter,
} from "./routes/catalog.routes.js";
import { conversationRouter } from "./routes/conversation.routes.js";
import { destinationRouter } from "./routes/destination.routes.js";
import { deviceRouter } from "./routes/device.routes.js";
import { favoriteRouter } from "./routes/favorite.routes.js";
import { manageRouter } from "./routes/manage.routes.js";
import { notificationRouter } from "./routes/notification.routes.js";
import { partnerRouter } from "./routes/partner.routes.js";
import { payoutRouter } from "./routes/payout.routes.js";
import { reviewRouter } from "./routes/review.routes.js";
import { statsRouter } from "./routes/stats.routes.js";
import { uploadRouter } from "./routes/upload.routes.js";
import { userRouter } from "./routes/user.routes.js";

export const app = express();

app.set("trust proxy", env.TRUST_PROXY);
app.disable("x-powered-by");

// Ảnh trong /uploads được app web ở origin khác nhúng vào, nên cho phép cross-origin.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: corsOrigins }));
app.use(express.json({ limit: "100kb" }));

app.get("/health", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.json({ status: "ok", database: "connected" });
  } catch {
    response.status(503).json({ status: "error", database: "disconnected" });
  }
});

if (env.STORAGE_DRIVER === "local") {
  app.use("/uploads", express.static(localUploadRoot, { maxAge: "365d", immutable: true, index: false, dotfiles: "deny" }));
}

app.get("/", (_request, response) => {
  response.json({ name: "travel-app-backend", status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/facilities", facilityRouter);
app.use("/api/destinations", destinationRouter);
app.use("/api/packages", packageRouter);
app.use("/api/room-types", roomTypeRouter);
app.use("/api/addon-services", addonServiceRouter);
app.use("/api/vouchers", voucherRouter);
app.use("/api/favorites", favoriteRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/conversations", conversationRouter);
app.use("/api/partners", partnerRouter);
app.use("/api/manage", manageRouter);
app.use("/api/stats", statsRouter);
app.use("/api/payouts", payoutRouter);
app.use("/api/audit-logs", auditRouter);
app.use("/api/devices", deviceRouter);
app.use("/api/uploads", uploadRouter);

app.use(notFoundHandler);
app.use(errorHandler);
