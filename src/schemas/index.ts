import { z } from "zod";

export const signUpSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be no longer than 30 characters")
    .regex(/^[a-z0-9_-]+$/i, "Username can only contain letters, numbers, _ and -"),
  email: z.string().email("Please provide a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const signInSchema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export const verifyCodeSchema = z.object({
  code: z.string().length(6, "Verification code must be 6 digits"),
});

export const messageSchema = z.object({
  content: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(300, "Message must be no longer than 300 characters"),
});

export const acceptMessageSchema = z.object({
  isAcceptingMessage: z.boolean(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type AcceptMessageInput = z.infer<typeof acceptMessageSchema>;
