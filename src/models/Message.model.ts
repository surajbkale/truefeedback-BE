import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMessage extends Document {
  userId: Types.ObjectId;
  content: string;
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
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound index for fast per-user analytics queries (stats aggregation, sorted message lists)
MessageSchema.index({ userId: 1, createdAt: -1 });


export const MessageModel =
  (mongoose.models["Message"] as mongoose.Model<IMessage>) ??
  mongoose.model<IMessage>("Message", MessageSchema);
