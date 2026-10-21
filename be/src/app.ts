import cors from "cors";
import express from "express";
import helmet from "helmet";
import { corsOrigins, env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler.js";
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
import { favoriteRouter } from "./routes/favorite.routes.js";
import { notificationRouter } from "./routes/notification.routes.js";
import { reviewRouter } from "./routes/review.routes.js";
import { userRouter } from "./routes/user.routes.js";

export const app = express();

app.set("trust proxy", env.TRUST_PROXY);
app.disable("x-powered-by");

app.use(helmet());
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

app.use(notFoundHandler);
app.use(errorHandler);
