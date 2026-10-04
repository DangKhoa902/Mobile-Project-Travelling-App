import cors from "cors";
import express from "express";
import { bookingRouter } from "./routes/booking.routes.js";
import { destinationRouter } from "./routes/destination.routes.js";
import { userRouter } from "./routes/user.routes.js";
import { prisma } from "./lib/prisma.js";

export const app = express();

app.use(cors());
app.use(express.json());

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

app.use("/api/users", userRouter);
app.use("/api/destinations", destinationRouter);
app.use("/api/bookings", bookingRouter);

app.use((_request, response) => {
  response.status(404).json({ message: "Route not found" });
});
