import type { Response } from "express";
import { MessageModel } from "../models/Message.model.js";
import { UserModel } from "../models/User.model.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import type { AuthRequest } from "../middlewares/auth.middleware.js";

interface FacetResult {
  total: { count: number }[];
  last7: { count: number }[];
  last30: { count: number }[];
  byDay: { _id: string; count: number }[];
  byHour: { _id: number; count: number }[];
}

/**
 * GET /api/messages/stats
 * ────────────────────────
 * Returns a single aggregated response with:
 *  - total       — all-time message count
 *  - last7Days   — count in the last 7 days
 *  - last30Days  — count in the last 30 days
 *  - byDay       — [{ date: "YYYY-MM-DD", count }] for each of the last 30 days (zeros filled)
 *  - byHour      — [{ hour: 0..23, count }] for peak-hour analysis (zeros filled)
 *
 * Uses a single $facet aggregation → one MongoDB round trip.
 * The compound index { userId, createdAt } on the Message collection
 * makes all sub-pipelines index-only scans.
 */
export async function getMessageStats(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const user = await UserModel.findOne({ firebaseUid: req.firebaseUid }).lean();
    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    const userId = user._id;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ── Single aggregation with $facet ──────────────────────────────────────
    const [result] = await MessageModel.aggregate<FacetResult>([
      { $match: { userId } },
      {
        $facet: {
          // All-time total
          total: [{ $count: "count" }],

          // Last 7 days
          last7: [
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            { $count: "count" },
          ],

          // Last 30 days
          last30: [
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            { $count: "count" },
          ],

          // Messages grouped by date (last 30 days)
          byDay: [
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],

          // Messages grouped by hour-of-day (all time)
          byHour: [
            {
              $group: {
                _id: { $hour: "$createdAt" },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);

    // $facet returns empty arrays when there's no data — handle gracefully
    if (!result) {
      sendSuccess(res, "Stats fetched", {
        total: 0,
        last7Days: 0,
        last30Days: 0,
        byDay: buildEmptyDays(now, 30),
        byHour: buildEmptyHours(),
      });
      return;
    }

    // ── Fill zeros for missing days (continuous chart) ───────────────────────
    const dayMap = new Map(result.byDay.map((d) => [d._id, d.count]));
    const byDay = buildEmptyDays(now, 30).map((d) => ({
      date: d.date,
      count: dayMap.get(d.date) ?? 0,
    }));

    // ── Fill zeros for missing hours (0–23) ──────────────────────────────────
    const hourMap = new Map(result.byHour.map((h) => [h._id, h.count]));
    const byHour = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      count: hourMap.get(h) ?? 0,
    }));

    sendSuccess(res, "Stats fetched", {
      total: result.total[0]?.count ?? 0,
      last7Days: result.last7[0]?.count ?? 0,
      last30Days: result.last30[0]?.count ?? 0,
      byDay,
      byHour,
    });
  } catch (error) {
    console.error("getMessageStats error:", error);
    sendError(res, "Error fetching stats");
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildEmptyDays(now: Date, days: number) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    return { date: d.toISOString().split("T")[0]!, count: 0 };
  });
}

function buildEmptyHours() {
  return Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
}
