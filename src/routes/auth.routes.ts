import { Router } from "express";
import { signUp, signIn, signOut, verifyCode, getMe } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { signUpSchema, signInSchema, verifyCodeSchema } from "../schemas/index.js";

export const authRouter = Router();

// POST /api/auth/sign-up
authRouter.post("/sign-up", validate(signUpSchema), signUp);

// POST /api/auth/verify/:username
authRouter.post("/verify/:username", validate(verifyCodeSchema), verifyCode);

// POST /api/auth/sign-in
authRouter.post("/sign-in", validate(signInSchema), signIn);

// POST /api/auth/sign-out
authRouter.post("/sign-out", authenticate, signOut);

// GET  /api/auth/me
authRouter.get("/me", authenticate, getMe);
