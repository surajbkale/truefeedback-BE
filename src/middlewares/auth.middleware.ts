import type { Request, Response, NextFunction } from "express";
import { adminAuth } from "../config/firebase.js";
import type { IUser } from "../models/User.model.js";

export interface AuthRequest extends Request {
  firebaseUid?: string;
  firebaseEmail?: string;
  dbUser?: IUser;             // populated by optional requireDbUser middleware
}

/**
 * authenticate
 * ─────────────
 * Verifies the Firebase ID token from the Authorization header.
 * Attaches firebaseUid and firebaseEmail to the request.
 *
 * Frontend must send: Authorization: Bearer <firebase-id-token>
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers["authorization"];

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "No token provided" });
    return;
  }

  const idToken = authHeader.slice(7);

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    req.firebaseUid = decoded.uid;
    req.firebaseEmail = decoded.email;
    next();
  } catch (err) {
    console.error("Firebase token verification failed:", err);
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}
