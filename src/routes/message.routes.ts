import { Router } from "express";
import {
  sendMessage,
  getMessages,
  deleteMessage,
} from "../controllers/message.controller.js";
import { streamMessages } from "../controllers/stream.controller.js";
import { getMessageStats } from "../controllers/stats.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { messageSchema } from "../schemas/index.js";

export const messageRouter = Router();

// POST /api/messages/send/:username  — public, no auth required
messageRouter.post("/send/:username", validate(messageSchema), sendMessage);

// GET  /api/messages               — authenticated, all messages
messageRouter.get("/", authenticate, getMessages);

// GET  /api/messages/stats         — authenticated, analytics aggregation
// Named routes must come BEFORE /:param routes to avoid Express treating "stats" as a param
messageRouter.get("/stats", authenticate, getMessageStats);

// GET  /api/messages/stream        — authenticated, SSE real-time stream
messageRouter.get("/stream", authenticate, streamMessages);

// DELETE /api/messages/:messageId  — authenticated, owner only
messageRouter.delete("/:messageId", authenticate, deleteMessage);
