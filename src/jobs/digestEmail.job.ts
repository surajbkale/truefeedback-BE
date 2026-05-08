import cron from "node-cron";
import { UserModel } from "../models/User.model.js";
import { MessageModel } from "../models/Message.model.js";
import { sendDigestEmail } from "../utils/email.js";

/**
 * Daily Digest Job
 * ─────────────────
 * Runs every day at 08:00 UTC.
 * Finds all users with notificationPreference === "digest",
 * collects messages received since their lastDigestSentAt (or 24h ago),
 * sends one summary email, and updates lastDigestSentAt.
 *
 * Production note:
 * For multi-instance deployments, replace this cron with Inngest or Trigger.dev
 * to avoid sending duplicate digests from multiple server instances.
 * https://www.inngest.com | https://trigger.dev
 */
export function startDigestJob(): void {
  cron.schedule("0 8 * * *", async () => {
    console.log("[digest] Starting daily digest job…");

    try {
      // Find all users who want digest emails
      const users = await UserModel.find({
        notificationPreference: "digest",
      }).lean();

      let sent = 0;
      let skipped = 0;

      for (const user of users) {
        // Look back to their last digest, or 24 hours ago (whichever is more recent)
        const since = user.lastDigestSentAt
          ? new Date(Math.max(user.lastDigestSentAt.getTime(), Date.now() - 24 * 60 * 60 * 1000))
          : new Date(Date.now() - 24 * 60 * 60 * 1000);

        const messages = await MessageModel.find({
          userId: user._id,
          createdAt: { $gt: since },
        })
          .select("content createdAt")
          .sort({ createdAt: -1 })
          .lean();

        if (messages.length === 0) {
          skipped++;
          continue;
        }

        try {
          await sendDigestEmail(
            user.email,
            user.username,
            messages.map((m) => ({ content: m.content, createdAt: m.createdAt }))
          );

          // Update the cutoff so next digest doesn't resend these messages
          await UserModel.updateOne(
            { _id: user._id },
            { lastDigestSentAt: new Date() }
          );

          sent++;
        } catch (err) {
          console.error(`[digest] Failed to send digest to ${user.email}:`, err);
        }
      }

      console.log(`[digest] Done — sent: ${sent}, skipped (no new msgs): ${skipped}`);
    } catch (err) {
      console.error("[digest] Job failed:", err);
    }
  });

  console.log("📅 Daily digest job scheduled (08:00 UTC)");
}
