import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../utils/jwt.js";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // Try Authorization header first, then cookie fallback
    const authHeader = req.headers["authorization"];
    const token =
      (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null) ??
      (req.cookies as Record<string, string | undefined>)["accessToken"];

    if (!token) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}
