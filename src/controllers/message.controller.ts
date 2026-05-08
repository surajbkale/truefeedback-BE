import type { Request, Response } from "express";
import { MessageModel } from "../models/Message.model.js";
import { UserModel } from "../models/User.model.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { sendMessageLimiter } from "../middlewares/rateLimiter.middleware.js";
import type { AuthRequest } from "../middlewares/auth.middleware.js";
import type { MessageInput } from "../schemas/index.js";

// POST /api/messages/send/:username  (public — no auth needed)
export async function sendMessage(req: Request, res: Response): Promise<void> {
  const { username } = req.params as { username: string };
  const { content } = req.body as MessageInput;

  // Rate limit by IP
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
    req.ip ??
    "unknown";

  if (sendMessageLimiter(ip)) {
    sendError(res, "Too many requests. Please wait a few minutes.", 429);
    return;
  }

  try {
    const user = await UserModel.findOne({ username }).lean();
    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    if (!user.isAcceptingMessage) {
      sendError(res, "This user is not accepting messages right now", 403);
      return;
    }

    await MessageModel.create({ userId: user._id, content });

    sendSuccess(res, "Message sent successfully", undefined, 201);
  } catch (error) {
    console.error("sendMessage error:", error);
    sendError(res, "Error sending message");
  }
}

// GET /api/messages  (authenticated)
export async function getMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Look up MongoDB user by firebase uid to get the _id
    const user = await UserModel.findOne({ firebaseUid: req.firebaseUid }).lean();
    if (!user) {
      sendError(res, "User profile not found. Please complete registration.", 404);
      return;
    }

    const messages = await MessageModel.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, "Messages fetched", messages);
  } catch (error) {
    console.error("getMessages error:", error);
    sendError(res, "Error fetching messages");
  }
}

// DELETE /api/messages/:messageId  (authenticated — owner only)
export async function deleteMessage(req: AuthRequest, res: Response): Promise<void> {
  const { messageId } = req.params as { messageId: string };

  try {
    const user = await UserModel.findOne({ firebaseUid: req.firebaseUid }).lean();
    if (!user) {
      sendError(res, "User profile not found", 404);
      return;
    }

    const result = await MessageModel.findOneAndDelete({
      _id: messageId,
      userId: user._id,
    });

    if (!result) {
      sendError(res, "Message not found or already deleted", 404);
      return;
    }

    sendSuccess(res, "Message deleted");
  } catch (error) {
    console.error("deleteMessage error:", error);
    sendError(res, "Error deleting message");
  }
}
