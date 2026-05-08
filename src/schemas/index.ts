import { z } from "zod";

// ── Auth ────────────────────────────────────────────────────────────────────

/**
 * Called after the Firebase user is created on the client.
 * The client sends the Firebase ID token + the chosen username.
 * The backend creates the MongoDB user record.
 */
export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be no longer than 30 characters")
    .regex(
      /^[a-z0-9_-]+$/i,
      "Username can only contain letters, numbers, underscores and hyphens"
    )
    .transform((val) => val.toLowerCase()),
});

// ── Messages ─────────────────────────────────────────────────────────────────

export const messageSchema = z.object({
  content: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(300, "Message must be no longer than 300 characters"),
});

// ── User Settings ─────────────────────────────────────────────────────────────

export const acceptMessageSchema = z.object({
  isAcceptingMessage: z.boolean(),
});

export const notificationPreferenceSchema = z.object({
  notificationPreference: z.enum(["instant", "digest", "off"], {
    errorMap: () => ({ message: 'Must be "instant", "digest", or "off"' }),
  }),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type AcceptMessageInput = z.infer<typeof acceptMessageSchema>;
export type NotificationPreferenceInput = z.infer<typeof notificationPreferenceSchema>;
