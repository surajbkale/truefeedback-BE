import type { Request, Response } from "express";
import { MessageModel } from "../models/Message.model.js";
import { UserModel } from "../models/User.model.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { sendMessageLimiter } from "../middlewares/rateLimiter.middleware.js";
import { sseManager } from "../utils/sseManager.js";
import { sendMessageNotificationEmail } from "../utils/email.js";
import type { AuthRequest } from "../middlewares/auth.middleware.js";
import type { MessageInput, ReactionInput, UpdateMessageInput } from "../schemas/index.js";

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

    const newMessage = await MessageModel.create({ userId: user._id, content });

    // Push real-time event to recipient if they have an open SSE stream
    sseManager.emit(user._id.toString(), "new-message", {
      _id: newMessage._id,
      content: newMessage.content,
      createdAt: newMessage.createdAt,
    });

    // Send instant email notification (fire-and-forget — don't block the response)
    if (user.notificationPreference === "instant") {
      sendMessageNotificationEmail(user.email, user.username, content).catch(
        (err) => console.error("[email] instant notification failed:", err)
      );
    }

    sendSuccess(res, "Message sent successfully", undefined, 201);
  } catch (error) {
    console.error("sendMessage error:", error);
    sendError(res, "Error sending message");
  }
}

// GET /api/messages  (authenticated)
// ?filter=starred → only starred messages
export async function getMessages(req: AuthRequest, res: Response): Promise<void> {
  const { filter } = req.query as { filter?: string };

  try {
    const user = await UserModel.findOne({ firebaseUid: req.firebaseUid }).lean();
    if (!user) {
      sendError(res, "User profile not found. Please complete registration.", 404);
      return;
    }

    const baseQuery: Record<string, unknown> = { userId: user._id };
    if (filter === "starred") baseQuery.isStarred = true;

    const messages = await MessageModel.find(baseQuery)
      .sort({ isPinned: -1, createdAt: -1 }) // pinned always first
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

// PATCH /api/messages/:messageId/react  (authenticated — owner only)
export async function reactToMessage(req: AuthRequest, res: Response): Promise<void> {
  const { messageId } = req.params as { messageId: string };
  const { emoji } = req.body as ReactionInput;

  try {
    const user = await UserModel.findOne({ firebaseUid: req.firebaseUid }).lean();
    if (!user) {
      sendError(res, "User profile not found", 404);
      return;
    }

    const updated = await MessageModel.findOneAndUpdate(
      { _id: messageId, userId: user._id },
      { $set: { reaction: emoji ?? null } },
      { new: true, select: "reaction" }
    ).lean();

    if (!updated) {
      sendError(res, "Message not found", 404);
      return;
    }

    sendSuccess(res, "Reaction updated", { reaction: updated.reaction });
  } catch (error) {
    console.error("reactToMessage error:", error);
    sendError(res, "Error updating reaction");
  }
}

// PATCH /api/messages/:messageId  (authenticated — owner only)
// Body: { isStarred?: boolean, isPinned?: boolean }
export async function updateMessage(req: AuthRequest, res: Response): Promise<void> {
  const { messageId } = req.params as { messageId: string };
  const { isStarred, isPinned } = req.body as UpdateMessageInput;

  try {
    const user = await UserModel.findOne({ firebaseUid: req.firebaseUid }).lean();
    if (!user) {
      sendError(res, "User profile not found", 404);
      return;
    }

    const patch: Record<string, unknown> = {};
    if (isStarred !== undefined) patch.isStarred = isStarred;
    if (isPinned !== undefined) patch.isPinned = isPinned;

    const updated = await MessageModel.findOneAndUpdate(
      { _id: messageId, userId: user._id },
      { $set: patch },
      { new: true, select: "isStarred isPinned" }
    ).lean();

    if (!updated) {
      sendError(res, "Message not found", 404);
      return;
    }

    sendSuccess(res, "Message updated", {
      isStarred: updated.isStarred,
      isPinned: updated.isPinned,
    });
  } catch (error) {
    console.error("updateMessage error:", error);
    sendError(res, "Error updating message");
  }
}


