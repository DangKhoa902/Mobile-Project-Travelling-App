import { Router } from "express";
import { userDao } from "../dao/user.dao.js";

export const userRouter = Router();

userRouter.get("/", async (_request, response, next) => {
  try {
    response.json(await userDao.findAll());
  } catch (error) {
    next(error);
  }
});

userRouter.get("/:id", async (request, response, next) => {
  const id = Number(request.params.id);
  if (!Number.isInteger(id) || id < 1) {
    response.status(400).json({ message: "id must be a positive integer" });
    return;
  }

  try {
    const user = await userDao.findById(id);
    if (!user) {
      response.status(404).json({ message: "User not found" });
      return;
    }
    response.json(user);
  } catch (error) {
    next(error);
  }
});
