import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { UserModel } from "../models/User.model.js";
import { sendVerificationEmail } from "../utils/email.js";
import { signToken } from "../utils/jwt.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import type { AuthRequest } from "../middlewares/auth.middleware.js";
import type { SignUpInput, SignInInput, VerifyCodeInput } from "../schemas/index.js";

// POST /api/auth/sign-up
export async function signUp(req: Request, res: Response): Promise<void> {
  const { username, email, password } = req.body as SignUpInput;

  try {
    const existingVerifiedUser = await UserModel.findOne({ username, isVerified: true });
    if (existingVerifiedUser) {
      sendError(res, "Username is already taken", 400);
      return;
    }

    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verifyCodeExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const existingByEmail = await UserModel.findOne({ email });

    if (existingByEmail) {
      if (existingByEmail.isVerified) {
        sendError(res, "User already exists with this email", 400);
        return;
      }
      // Resend verification to unverified account
      existingByEmail.password = await bcrypt.hash(password, 10);
      existingByEmail.verifyCode = verifyCode;
      existingByEmail.verifyCodeExpiry = verifyCodeExpiry;
      await existingByEmail.save();
    } else {
      await UserModel.create({
        username,
        email,
        password: await bcrypt.hash(password, 10),
        verifyCode,
        verifyCodeExpiry,
        isVerified: false,
        isAcceptingMessage: true,
      });
    }

    await sendVerificationEmail(email, username, verifyCode);

    sendSuccess(res, "User registered successfully. Please verify your email.", undefined, 201);
  } catch (error) {
    console.error("signUp error:", error);
    sendError(res, "Error registering user");
  }
}

// POST /api/auth/verify
export async function verifyCode(req: Request, res: Response): Promise<void> {
  const { username } = req.params as { username: string };
  const { code } = req.body as VerifyCodeInput;

  try {
    const user = await UserModel.findOne({ username });
    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    if (user.isVerified) {
      sendSuccess(res, "Account is already verified");
      return;
    }

    const isCodeValid = user.verifyCode === code;
    const isCodeNotExpired = user.verifyCodeExpiry > new Date();

    if (!isCodeNotExpired) {
      sendError(res, "Verification code has expired. Please sign up again.", 400);
      return;
    }

    if (!isCodeValid) {
      sendError(res, "Incorrect verification code", 400);
      return;
    }

    user.isVerified = true;
    await user.save();

    sendSuccess(res, "Account verified successfully");
  } catch (error) {
    console.error("verifyCode error:", error);
    sendError(res, "Error verifying account");
  }
}

// POST /api/auth/sign-in
export async function signIn(req: Request, res: Response): Promise<void> {
  const { identifier, password } = req.body as SignInInput;

  try {
    const user = await UserModel.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!user) {
      sendError(res, "Invalid credentials", 401);
      return;
    }

    if (!user.isVerified) {
      sendError(res, "Please verify your email before signing in", 403);
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      sendError(res, "Invalid credentials", 401);
      return;
    }

    const token = signToken({
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
    });

    // Set httpOnly cookie + return token in body for flexibility
    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    sendSuccess(res, "Signed in successfully", {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isAcceptingMessage: user.isAcceptingMessage,
      },
    });
  } catch (error) {
    console.error("signIn error:", error);
    sendError(res, "Error signing in");
  }
}

// POST /api/auth/sign-out
export async function signOut(_req: Request, res: Response): Promise<void> {
  res.clearCookie("accessToken");
  sendSuccess(res, "Signed out successfully");
}

// GET /api/auth/me
export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await UserModel.findById(req.user?.userId).select(
      "-password -verifyCode -verifyCodeExpiry"
    );
    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }
    sendSuccess(res, "User fetched", user);
  } catch (error) {
    console.error("getMe error:", error);
    sendError(res, "Error fetching user");
  }
}
