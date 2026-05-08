import mongoose, { Schema, Document } from "mongoose";

export type NotificationPreference = "instant" | "digest" | "off";

export interface IUser extends Document {
  firebaseUid: string;              // Firebase UID — the source of truth for identity
  username: string;                 // chosen at registration, unique
  email: string;                    // from Firebase, stored for quick lookups
  isAcceptingMessage: boolean;
  notificationPreference: NotificationPreference;
  lastDigestSentAt: Date | null;    // tracks cutoff for daily digest emails
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
  },
  { timestamps: true }
);

export const UserModel =
  (mongoose.models["User"] as mongoose.Model<IUser>) ??
  mongoose.model<IUser>("User", UserSchema);
