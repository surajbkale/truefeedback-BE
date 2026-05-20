import type { Response } from "express";
import { UserModel } from "../models/User.model.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import type { AuthRequest } from "../middlewares/auth.middleware.js";
import type { RegisterInput } from "../schemas/index.js";

/**
 * POST /api/auth/register
 * ────────────────────────
 * Called ONCE after the client has created a Firebase user (email+password).
 *
 * Flow:
 *  1. Client creates user with Firebase SDK (email + password)
 *  2. Firebase automatically sends an email-verification email
 *  3. Client gets the ID token and sends it here with the chosen username
 *  4. Backend verifies the token (via authenticate middleware) and
 *     creates the MongoDB user record linking firebaseUid → username
 *
 * Requires: authenticate middleware (provides req.firebaseUid, req.firebaseEmail)
 */
export async function register(req: AuthRequest, res: Response): Promise<void> {
  const { username } = req.body as RegisterInput;
  const firebaseUid = req.firebaseUid!;
  const email = req.firebaseEmail!;

  try {
    // Prevent duplicate registrations (e.g. calling this endpoint twice)
    const existing = await UserModel.findOne({ firebaseUid });
    if (existing) {
      sendSuccess(res, "User already registered", {
        user: {
          id: existing._id,
          username: existing.username,
          email: existing.email,
          isAcceptingMessage: existing.isAcceptingMessage,
        },
      });
      return;
    }

    // Check username availability
    const usernameTaken = await UserModel.exists({ username });
    if (usernameTaken) {
      sendError(res, "Username is already taken", 409);
      return;
    }

    const user = await UserModel.create({
      firebaseUid,
      username,
      email,
      isAcceptingMessage: true,
    });

    sendSuccess(
      res,
      "Registration complete",
      {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isAcceptingMessage: user.isAcceptingMessage,
        },
      },
      201
    );
  } catch (error) {
    console.error("register error:", error);
    sendError(res, "Error completing registration");
  }
}

/**
 * GET /api/auth/me
 * ─────────────────
 * Returns the MongoDB user profile for the authenticated Firebase user.
 * Requires: authenticate middleware
 */
export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await UserModel.findOne({ firebaseUid: req.firebaseUid });

    if (!user) {
      // Firebase token is valid but no MongoDB record yet
      // (user created Firebase account but didn't complete registration)
      sendError(res, "User profile not found. Please complete registration.", 404);
      return;
    }

    sendSuccess(res, "User fetched", {
      id: user._id,
      username: user.username,
      email: user.email,
      isAcceptingMessage: user.isAcceptingMessage,
      avatarUrl: user.avatarUrl,
    });
  } catch (error) {
    console.error("getMe error:", error);
    sendError(res, "Error fetching user");
  }
}
