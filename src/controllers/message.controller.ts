import type { Request, Response } from "express";
import { MessageModel } from "../models/Message.model.js";
import { UserModel } from "../models/User.model.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { sendMessageLimiter } from "../middlewares/rateLimiter.middleware.js";
import { sseManager } from "../utils/sseManager.js";
import { sendMessageNotificationEmail } from "../utils/email.js";
import type { AuthRequest } from "../middlewares/auth.middleware.js";
import type { MessageInput, ReactionInput, UpdateMessageInput, ReplyMessageInput } from "../schemas/index.js";

// POST /api/messages/send/:username  (public — no auth needed)
export async function sendMessage(req: Request, res: Response): Promise<void> {
  const { username } = req.params as { username: string };
  const { content, turnstileToken } = req.body as MessageInput;

  // Rate limit by IP
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
    req.ip ??
    "unknown";

  if (await sendMessageLimiter(ip)) {
    sendError(res, "Too many requests. Please wait a few minutes.", 429);
    return;
  }

  // Verify Turnstile token
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    if (!turnstileToken) {
      sendError(res, "Turnstile token is required", 400);
      return;
    }
    
    try {
      const tsRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: turnstileSecret,
          response: turnstileToken,
          remoteip: ip,
        }),
      });
      const tsData = await tsRes.json() as { success: boolean };
      if (!tsData.success) {
        sendError(res, "Failed captcha verification", 403);
        return;
      }
    } catch (err) {
      console.error("Turnstile verification error:", err);
      sendError(res, "Failed captcha verification", 403);
      return;
    }
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
// ?search=hello → text search
// ?page=1&limit=20 → pagination
export async function getMessages(req: AuthRequest, res: Response): Promise<void> {
  const { filter, search, page = "1", limit = "20" } = req.query as {
    filter?: string;
    search?: string;
    page?: string;
    limit?: string;
  };

  try {
    const user = await UserModel.findOne({ firebaseUid: req.firebaseUid }).lean();
    if (!user) {
      sendError(res, "User profile not found. Please complete registration.", 404);
      return;
    }

    const baseQuery: Record<string, unknown> = { userId: user._id };
    if (filter === "starred") baseQuery.isStarred = true;

    if (search && search.trim() !== "") {
      baseQuery.$text = { $search: search.trim() };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    // We can run count and find in parallel
    const [total, messages] = await Promise.all([
      MessageModel.countDocuments(baseQuery),
      MessageModel.find(baseQuery)
        // If searching, we might want to sort by text score, but for simplicity
        // and consistency we'll keep the pinned-first + newest-first sort.
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    sendSuccess(res, "Messages fetched", {
      messages,
      total,
      page: pageNum,
      totalPages,
    });
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

// PATCH /api/messages/:messageId/reply  (authenticated — owner only)
export async function replyToMessage(req: AuthRequest, res: Response): Promise<void> {
  const { messageId } = req.params as { messageId: string };
  const { reply, isReplyPublic } = req.body as ReplyMessageInput;

  try {
    const user = await UserModel.findOne({ firebaseUid: req.firebaseUid }).lean();
    if (!user) {
      sendError(res, "User profile not found", 404);
      return;
    }

    const updated = await MessageModel.findOneAndUpdate(
      { _id: messageId, userId: user._id },
      { $set: { reply, isReplyPublic } },
      { new: true, select: "reply isReplyPublic" }
    ).lean();

    if (!updated) {
      sendError(res, "Message not found", 404);
      return;
    }

    sendSuccess(res, "Reply updated", {
      reply: updated.reply,
      isReplyPublic: updated.isReplyPublic,
    });
  } catch (error) {
    console.error("replyToMessage error:", error);
    sendError(res, "Error updating reply");
  }
}

// GET /api/messages/public/:username  (public)
export async function getPublicThreads(req: Request, res: Response): Promise<void> {
  const { username } = req.params as { username: string };

  try {
    const user = await UserModel.findOne({ username: username.toLowerCase() }).lean();
    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    const threads = await MessageModel.find({
      userId: user._id,
      isReplyPublic: true,
      reply: { $ne: null }
    })
      .sort({ createdAt: -1 })
      .select("content reply createdAt")
      .lean();

    sendSuccess(res, "Public threads fetched", {
      threads
    });
  } catch (error) {
    console.error("getPublicThreads error:", error);
    sendError(res, "Error fetching public threads");
  }
}


