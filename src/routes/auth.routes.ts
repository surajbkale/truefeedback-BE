import { Router } from "express";
import { register, getMe } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { registerSchema } from "../schemas/index.js";

export const authRouter = Router();

/**
 * POST /api/auth/register
 *
 * Called once after the client creates a Firebase user.
 * Body:    { username: string }
 * Headers: Authorization: Bearer <firebase-id-token>
 *
 * Creates the MongoDB user record with the firebaseUid + username.
 */
authRouter.post("/register", authenticate, validate(registerSchema), register);

/**
 * GET /api/auth/me
 *
 * Returns the current user's MongoDB profile.
 * Headers: Authorization: Bearer <firebase-id-token>
 */
authRouter.get("/me", authenticate, getMe);
