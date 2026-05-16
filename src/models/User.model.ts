import mongoose, { Schema, Document } from "mongoose";

export type NotificationPreference = "instant" | "digest" | "off";

export interface IUser extends Document {
  firebaseUid: string;              // Firebase UID — the source of truth for identity
  username: string;                 // chosen at registration, unique
  email: string;                    // from Firebase, stored for quick lookups
  isAcceptingMessage: boolean;
  notificationPreference: NotificationPreference;
  lastDigestSentAt: Date | null;    // tracks cutoff for daily digest emails
  // ── Profile customization ──────────────────────────────────────────────
  bio: string | null;
  avatarUrl: string | null;
  welcomeMessage: string | null;
  themeColor: string;               // hex color, e.g. "#6366f1"
}

const UserSchema = new Schema<IUser>(
  {
    firebaseUid: {
      type: String,
      required: [true, "Firebase UID is required"],
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username must be no longer than 30 characters"],
      match: [
        /^[a-z0-9_-]+$/,
        "Username can only contain letters, numbers, underscores and hyphens",
      ],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
    },
    isAcceptingMessage: {
      type: Boolean,
      default: true,
    },
    notificationPreference: {
      type: String,
      enum: ["instant", "digest", "off"],
      default: "instant",
    },
    lastDigestSentAt: {
      type: Date,
      default: null,
    },
    // ── Profile customization ──────────────────────────────────────────────
    bio: {
      type: String,
      default: null,
      maxlength: [200, "Bio must be 200 characters or fewer"],
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    welcomeMessage: {
      type: String,
      default: null,
      maxlength: [120, "Welcome message must be 120 characters or fewer"],
    },
    themeColor: {
      type: String,
      default: "#6366f1",
      match: [/^#[0-9a-fA-F]{6}$/, "themeColor must be a valid 6-digit hex color"],
    },
  },
  { timestamps: true }
);

export const UserModel =
  (mongoose.models["User"] as mongoose.Model<IUser>) ??
  mongoose.model<IUser>("User", UserSchema);
