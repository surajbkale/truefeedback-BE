import { Router } from "express";
import {
  sendMessage,
  getMessages,
  deleteMessage,
} from "../controllers/message.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { messageSchema } from "../schemas/index.js";

export const messageRouter = Router();

// POST /api/messages/send/:username  — public, no auth required
messageRouter.post("/send/:username", validate(messageSchema), sendMessage);

// GET  /api/messages               — authenticated
messageRouter.get("/", authenticate, getMessages);

// DELETE /api/messages/:messageId  — authenticated, owner only
messageRouter.delete("/:messageId", authenticate, deleteMessage);
