import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  verifyCode: string;
  verifyCodeExpiry: Date;
  isVerified: boolean;
  isAcceptingMessage: boolean;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username must be no longer than 30 characters"],
      match: [/^[a-z0-9_-]+$/, "Username can only contain letters, numbers, _ and -"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i,
        "Please use a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    verifyCode: {
      type: String,
      required: true,
    },
    verifyCodeExpiry: {
      type: Date,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isAcceptingMessage: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const UserModel =
  (mongoose.models["User"] as mongoose.Model<IUser>) ??
  mongoose.model<IUser>("User", UserSchema);
