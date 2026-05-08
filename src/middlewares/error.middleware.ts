import type { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  console.error("❌ Unhandled error:", err);
  const message =
    err instanceof Error ? err.message : "An unexpected error occurred";
  res.status(500).json({ success: false, message });
}
