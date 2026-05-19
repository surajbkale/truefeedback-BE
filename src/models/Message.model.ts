import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMessage extends Document {
  userId: Types.ObjectId;
  content: string;
  reaction: string | null;
  reply: string | null;
  isReplyPublic: boolean;
  isStarred: boolean;
  isPinned: boolean;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      minlength: [10, "Message must be at least 10 characters"],
      maxlength: [300, "Message must be no longer than 300 characters"],
    },
    reaction: {
      type: String,
      default: null,
    },
    reply: {
      type: String,
      default: null,
      maxlength: [500, "Reply must be no longer than 500 characters"],
    },
    isReplyPublic: {
      type: Boolean,
      default: false,
    },
    isStarred: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound index for fast per-user analytics queries (stats aggregation, sorted message lists)
MessageSchema.index({ userId: 1, createdAt: -1 });
// Fast pinned-first + starred filter queries
MessageSchema.index({ userId: 1, isPinned: -1, createdAt: -1 });
MessageSchema.index({ userId: 1, isStarred: 1, createdAt: -1 });
// Fast public threads queries
MessageSchema.index({ userId: 1, isReplyPublic: 1, createdAt: -1 });
// Text search index for content
MessageSchema.index({ content: "text" });

export const MessageModel =
  (mongoose.models["Message"] as mongoose.Model<IMessage>) ??
  mongoose.model<IMessage>("Message", MessageSchema);

