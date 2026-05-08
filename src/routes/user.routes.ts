import { Router } from "express";
import {
  updateAcceptMessages,
  getAcceptMessages,
  checkUsernameUnique,
} from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { acceptMessageSchema } from "../schemas/index.js";

export const userRouter = Router();

// GET  /api/users/check-username?username=john  — public
userRouter.get("/check-username", checkUsernameUnique);

// GET  /api/users/accept-messages              — authenticated
userRouter.get("/accept-messages", authenticate, getAcceptMessages);

// PATCH /api/users/accept-messages             — authenticated
userRouter.patch(
  "/accept-messages",
  authenticate,
  validate(acceptMessageSchema),
  updateAcceptMessages
);
