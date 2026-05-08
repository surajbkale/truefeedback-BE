import type { Request, Response } from "express";
import { UserModel } from "../models/User.model.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import type { AuthRequest } from "../middlewares/auth.middleware.js";
import type { AcceptMessageInput, NotificationPreferenceInput } from "../schemas/index.js";

// PATCH /api/users/accept-messages  (authenticated)
export async function updateAcceptMessages(req: AuthRequest, res: Response): Promise<void> {
  const { isAcceptingMessage } = req.body as AcceptMessageInput;

  try {
    const user = await UserModel.findOneAndUpdate(
      { firebaseUid: req.firebaseUid },
      { isAcceptingMessage },
      { new: true }
    );

    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    sendSuccess(res, "Message acceptance updated", {
      isAcceptingMessage: user.isAcceptingMessage,
    });
  } catch (error) {
    console.error("updateAcceptMessages error:", error);
    sendError(res, "Error updating settings");
  }
}

// GET /api/users/accept-messages  (authenticated)
export async function getAcceptMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await UserModel.findOne({ firebaseUid: req.firebaseUid }).lean();
    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    sendSuccess(res, "Setting fetched", {
      isAcceptingMessage: user.isAcceptingMessage,
    });
  } catch (error) {
    console.error("getAcceptMessages error:", error);
    sendError(res, "Error fetching settings");
  }
}

// GET /api/users/check-username?username=john  (public)
export async function checkUsernameUnique(req: Request, res: Response): Promise<void> {
  const username = (req.query as Record<string, string | undefined>)["username"]
    ?.toLowerCase()
    .trim();

  if (!username) {
    sendError(res, "username query param is required", 400);
    return;
  }

  try {
    const exists = await UserModel.exists({ username });
    if (exists) {
      sendError(res, "Username is already taken", 409);
      return;
    }
    sendSuccess(res, "Username is available");
  } catch (error) {
    console.error("checkUsernameUnique error:", error);
    sendError(res, "Error checking username");
  }
}

// GET /api/users/notification-preference  (authenticated)
export async function getNotificationPreference(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const user = await UserModel.findOne({ firebaseUid: req.firebaseUid }).lean();
    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }
    sendSuccess(res, "Preference fetched", {
      notificationPreference: user.notificationPreference,
    });
  } catch (error) {
    console.error("getNotificationPreference error:", error);
    sendError(res, "Error fetching preference");
  }
}

// PATCH /api/users/notification-preference  (authenticated)
export async function updateNotificationPreference(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const { notificationPreference } = req.body as NotificationPreferenceInput;

  try {
    const user = await UserModel.findOneAndUpdate(
      { firebaseUid: req.firebaseUid },
      { notificationPreference },
      { new: true }
    );

    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    sendSuccess(res, "Notification preference updated", {
      notificationPreference: user.notificationPreference,
    });
  } catch (error) {
    console.error("updateNotificationPreference error:", error);
    sendError(res, "Error updating preference");
  }
}
