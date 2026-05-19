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

// ── Reaction ──────────────────────────────────────────────────────────────────

// Single emoji character or null to clear
const ALLOWED_EMOJIS = ["❤️", "😂", "😮", "😢", "🔥", "👏"] as const;

export const reactionSchema = z.object({
  emoji: z
    .string()
    .nullable()
    .refine(
      (v) => v === null || (ALLOWED_EMOJIS as readonly string[]).includes(v),
      { message: "Invalid emoji. Allowed: ❤️ 😂 😮 😢 🔥 👏" }
    ),
});

export const REACTION_EMOJIS = ALLOWED_EMOJIS;

// ── Update (star / pin) ───────────────────────────────────────────────────────

export const updateMessageSchema = z
  .object({
    isStarred: z.boolean().optional(),
    isPinned: z.boolean().optional(),
  })
  .refine((d) => d.isStarred !== undefined || d.isPinned !== undefined, {
    message: "Provide at least one of isStarred or isPinned",
  });

// ── Reply ─────────────────────────────────────────────────────────────────────

export const replyMessageSchema = z.object({
  reply: z
    .string()
    .max(500, "Reply must be no longer than 500 characters")
    .nullable(),
  isReplyPublic: z.boolean(),
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

// ── Profile ───────────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  bio: z.string().max(200, "Bio must be 200 characters or fewer").nullable().optional(),
  avatarUrl: z.string().url("avatarUrl must be a valid URL").nullable().optional(),
  welcomeMessage: z
    .string()
    .max(120, "Welcome message must be 120 characters or fewer")
    .nullable()
    .optional(),
  themeColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "themeColor must be a valid 6-digit hex color")
    .optional(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type ReactionInput = z.infer<typeof reactionSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
export type ReplyMessageInput = z.infer<typeof replyMessageSchema>;
export type AcceptMessageInput = z.infer<typeof acceptMessageSchema>;
export type NotificationPreferenceInput = z.infer<typeof notificationPreferenceSchema>;
export type ProfileInput = z.infer<typeof updateProfileSchema>;



