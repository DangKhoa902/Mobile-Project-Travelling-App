import { Router } from "express";
import { bookingDao } from "../dao/booking.dao.js";

export const bookingRouter = Router();

bookingRouter.get("/", async (_request, response, next) => {
  try {
    response.json(await bookingDao.findAll());
  } catch (error) {
    next(error);
  }
});

bookingRouter.get("/:id", async (request, response, next) => {
  const id = Number(request.params.id);
  if (!Number.isInteger(id) || id < 1) {
    response.status(400).json({ message: "id must be a positive integer" });
    return;
  }

  try {
    const booking = await bookingDao.findById(id);
    if (!booking) {
      response.status(404).json({ message: "Booking not found" });
      return;
    }
    response.json(booking);
  } catch (error) {
    next(error);
  }
});
