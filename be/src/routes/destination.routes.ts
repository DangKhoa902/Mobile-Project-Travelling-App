import { Router } from "express";
import { destinationDao } from "../dao/destination.dao.js";

export const destinationRouter = Router();

destinationRouter.get("/", async (_request, response, next) => {
  try {
    response.json(await destinationDao.findAll());
  } catch (error) {
    next(error);
  }
});

destinationRouter.get("/:id", async (request, response, next) => {
  const id = Number(request.params.id);
  if (!Number.isInteger(id) || id < 1) {
    response.status(400).json({ message: "id must be a positive integer" });
    return;
  }

  try {
    const destination = await destinationDao.findById(id);
    if (!destination) {
      response.status(404).json({ message: "Destination not found" });
      return;
    }
    response.json(destination);
  } catch (error) {
    next(error);
  }
});
