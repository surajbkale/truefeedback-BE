import type { Request, Response } from "express";
import { UserModel } from "../models/User.model.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import type { AuthRequest } from "../middlewares/auth.middleware.js";
import type { AcceptMessageInput, NotificationPreferenceInput, ProfileInput } from "../schemas/index.js";

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

// PATCH /api/users/profile  (authenticated)
export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  const { bio, avatarUrl, welcomeMessage, themeColor } = req.body as ProfileInput;

  try {
    const patch: Record<string, unknown> = {};
    if (bio !== undefined) patch.bio = bio;
    if (avatarUrl !== undefined) patch.avatarUrl = avatarUrl;
    if (welcomeMessage !== undefined) patch.welcomeMessage = welcomeMessage;
    if (themeColor !== undefined) patch.themeColor = themeColor;

    const user = await UserModel.findOneAndUpdate(
      { firebaseUid: req.firebaseUid },
      { $set: patch },
      { new: true, select: "username bio avatarUrl welcomeMessage themeColor" }
    ).lean();

    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    sendSuccess(res, "Profile updated", {
      username: user.username,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      welcomeMessage: user.welcomeMessage,
      themeColor: user.themeColor,
    });
  } catch (error) {
    console.error("updateProfile error:", error);
    sendError(res, "Error updating profile");
  }
}

// GET /api/users/profile/:username  (public)
export async function getPublicProfile(req: Request, res: Response): Promise<void> {
  const { username } = req.params as { username: string };

  try {
    const user = await UserModel.findOne(
      { username: username.toLowerCase() },
      // Only expose safe public fields — no email, no firebaseUid
      "username bio avatarUrl welcomeMessage themeColor isAcceptingMessage"
    ).lean();

    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    sendSuccess(res, "Profile fetched", {
      username: user.username,
      bio: user.bio ?? null,
      avatarUrl: user.avatarUrl ?? null,
      welcomeMessage: user.welcomeMessage ?? null,
      themeColor: user.themeColor ?? "#6366f1",
      isAcceptingMessage: user.isAcceptingMessage,
    });
  } catch (error) {
    console.error("getPublicProfile error:", error);
    sendError(res, "Error fetching profile");
  }
}

