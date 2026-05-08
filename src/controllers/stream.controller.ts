import type { Response } from "express";
import { UserModel } from "../models/User.model.js";
import { sseManager } from "../utils/sseManager.js";
import type { AuthRequest } from "../middlewares/auth.middleware.js";

/**
 * GET /api/messages/stream
 * ────────────────────────
 * Server-Sent Events endpoint. Keeps an open HTTP connection and pushes
 * `new-message` events whenever someone sends this user a message.
 *
 * Auth: standard Authorization: Bearer <firebase-id-token> header
 * (handled by authenticate middleware before this controller runs).
 *
 * The client should reconnect on error — EventSource does this automatically,
 * fetch-based readers should implement their own retry logic.
 */
export async function streamMessages(
  req: AuthRequest,
  res: Response
): Promise<void> {
  // ── Resolve MongoDB user ────────────────────────────────────────────────
  const user = await UserModel.findOne({ firebaseUid: req.firebaseUid }).lean();
  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  const userId = user._id.toString();

  // ── Set SSE headers ─────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx/proxy buffering
  res.flushHeaders();

  // ── Register connection ─────────────────────────────────────────────────
  sseManager.register(userId, res);

  // Send the initial "connected" event so the client knows it's live
  res.write(
    `event: connected\ndata: ${JSON.stringify({ userId, message: "Stream connected" })}\n\n`
  );

  // ── Heartbeat every 25 seconds ──────────────────────────────────────────
  // Keeps the connection alive through proxies and load balancers that
  // close idle connections. Also signals the client that the server is alive.
  const heartbeat = setInterval(() => {
    if (res.writableEnded) {
      clearInterval(heartbeat);
      return;
    }
    res.write(`: heartbeat\n\n`);
  }, 25_000);

  // ── Cleanup on disconnect ───────────────────────────────────────────────
  req.on("close", () => {
    clearInterval(heartbeat);
    sseManager.remove(userId);
  });
}
