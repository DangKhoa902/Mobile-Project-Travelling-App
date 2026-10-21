import { Router } from "express";
import { idParamSchema, paginated } from "../lib/pagination.js";
import { authenticate, currentUser, requireRole } from "../middlewares/auth.js";
import * as bookingService from "../services/booking.service.js";
import {
  cancelBookingSchema,
  createBookingSchema,
  listBookingsSchema,
  payBookingSchema,
  quoteBookingSchema,
  updateBookingStatusSchema,
} from "../validators/booking.schema.js";

export const bookingRouter = Router();

// Báo giá trước khi đặt: công khai để khách vãng lai cũng xem được tổng tiền.
bookingRouter.post("/quote", async (request, response) => {
  response.json({ data: await bookingService.quoteBooking(quoteBookingSchema.parse(request.body)) });
});

bookingRouter.use(authenticate);

bookingRouter.post("/", async (request, response) => {
  const booking = await bookingService.createBooking(currentUser(request), createBookingSchema.parse(request.body));
  response.status(201).json({ data: booking });
});

// User: booking của mình. Staff/Admin: tất cả booking, lọc theo status/code.
bookingRouter.get("/", async (request, response) => {
  const query = listBookingsSchema.parse(request.query);
  const { data, total } = await bookingService.listBookings(currentUser(request), query);
  response.json(paginated(data, total, query));
});

bookingRouter.get("/:id", async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  response.json({ data: await bookingService.getBooking(currentUser(request), id) });
});

bookingRouter.post("/:id/cancel", async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const { reason } = cancelBookingSchema.parse(request.body ?? {});
  response.json({ data: await bookingService.cancelBooking(currentUser(request), id, reason) });
});

bookingRouter.post("/:id/pay", async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const { simulateFailure } = payBookingSchema.parse(request.body ?? {});
  response.json({ data: await bookingService.payBooking(currentUser(request), id, simulateFailure) });
});

bookingRouter.patch("/:id/status", requireRole("STAFF", "ADMIN"), async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const { status } = updateBookingStatusSchema.parse(request.body);
  response.json({ data: await bookingService.updateBookingStatus(id, status) });
});
