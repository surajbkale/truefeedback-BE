import { Router } from "express";
import {
  updateAcceptMessages,
  getAcceptMessages,
  checkUsernameUnique,
  getNotificationPreference,
  updateNotificationPreference,
  updateProfile,
  getPublicProfile,
} from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  acceptMessageSchema,
  notificationPreferenceSchema,
  updateProfileSchema,
} from "../schemas/index.js";

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

// GET  /api/users/notification-preference      — authenticated
userRouter.get("/notification-preference", authenticate, getNotificationPreference);

// PATCH /api/users/notification-preference     — authenticated
userRouter.patch(
  "/notification-preference",
  authenticate,
  validate(notificationPreferenceSchema),
  updateNotificationPreference
);

// GET  /api/users/profile/:username            — public (safe fields only)
// Must come BEFORE /profile authenticated route to avoid param conflict
userRouter.get("/profile/:username", getPublicProfile);

// PATCH /api/users/profile                     — authenticated
userRouter.patch(
  "/profile",
  authenticate,
  validate(updateProfileSchema),
  updateProfile
);
