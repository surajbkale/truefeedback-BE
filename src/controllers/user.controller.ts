import type { Response } from "express";
import { UserModel } from "../models/User.model.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import type { AuthRequest } from "../middlewares/auth.middleware.js";
import type { AcceptMessageInput } from "../schemas/index.js";

// PATCH /api/users/accept-messages
export async function updateAcceptMessages(req: AuthRequest, res: Response): Promise<void> {
  const { isAcceptingMessage } = req.body as AcceptMessageInput;

  try {
    const user = await UserModel.findByIdAndUpdate(
      req.user?.userId,
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

// GET /api/users/accept-messages
export async function getAcceptMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await UserModel.findById(req.user?.userId).lean();
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

// GET /api/users/check-username?username=john
export async function checkUsernameUnique(req: AuthRequest, res: Response): Promise<void> {
  const username = (req.query as Record<string, string | undefined>)["username"];

  if (!username) {
    sendError(res, "Username query param is required", 400);
    return;
  }

  try {
    const exists = await UserModel.exists({ username, isVerified: true });
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
