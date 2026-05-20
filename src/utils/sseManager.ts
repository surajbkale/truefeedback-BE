import type { Response } from "express";

/**
 * sseManager
 * ──────────
 * In-memory registry of active SSE connections, keyed by MongoDB user ID.
 *
 * Works perfectly for a single-server deployment.
 * For horizontal scaling / serverless → replace with Redis pub/sub
 * (e.g. ioredis subscribe/publish) and have each instance forward events.
 */
const connections = new Map<string, Response>();

export const sseManager = {
  /** Register (or replace) a user's SSE connection. */
  register(userId: string, res: Response): void {
    // Close any stale connection for the same user (e.g. duplicate tabs)
    const existing = connections.get(userId);
    if (existing && !existing.writableEnded) {
      existing.write(`event: close\ndata: {"reason":"replaced"}\n\n`);
      existing.end();
    }
    connections.set(userId, res);
    console.log(`[SSE] +1 connection for ${userId} | total: ${connections.size}`);
  },

  /** Remove a user's connection (called on req close). */
  remove(userId: string): void {
    connections.delete(userId);
    console.log(`[SSE] -1 connection for ${userId} | total: ${connections.size}`);
  },

  /**
   * Emit a named SSE event to a user.
   * Returns true if the event was delivered, false if no active connection.
   */
  emit(userId: string, event: string, data: unknown): boolean {
    const res = connections.get(userId);
    if (!res || res.writableEnded) {
      connections.delete(userId);
      return false;
    }
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    return true;
  },

  activeCount(): number {
    return connections.size;
  },
};
