import crypto from "node:crypto";
import mongoose from "mongoose";
import { isMongoConnected } from "./mongodb.js";
import { Feedback, FEEDBACK_TYPES } from "../models/Feedback.js";

// In-memory fallback store for isolated tests or offline mode
const memoryFeedback = [];

async function ensureDbReady() {
  if (isMongoConnected()) return true;
  if (process.env.MONGODB_URI && mongoose.connection.readyState === 2) {
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 150));
      if (isMongoConnected()) return true;
    }
  }
  return isMongoConnected();
}

function formatAttachments(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a) => a && typeof a.url === "string")
    .map((a) => ({
      url: a.url,
      mediaType: a.mediaType === "video" ? "video" : "image",
      fileName: a.fileName || "",
      mimeType: a.mimeType || "",
      size: Number(a.size) || 0,
    }));
}

function formatFeedbackDoc(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id || doc.id),
    userId: doc.user ? String(doc.user) : doc.userId || null,
    userName: doc.userName || null,
    userEmail: doc.userEmail || null,
    type: doc.type,
    rating: typeof doc.rating === "number" ? doc.rating : null,
    title: doc.title || "",
    message: doc.message || "",
    analysisId: doc.analysisId || null,
    attachments: formatAttachments(doc.attachments),
    context: doc.context || {},
    status: doc.status || "new",
    createdAt: doc.createdAt
      ? new Date(doc.createdAt).toISOString()
      : new Date().toISOString(),
    updatedAt: doc.updatedAt
      ? new Date(doc.updatedAt).toISOString()
      : new Date().toISOString(),
  };
}

/**
 * Strips private fields (userEmail, userId, userAgent) for the public community feed.
 */
function formatPublicFeedbackDoc(doc) {
  const formatted = formatFeedbackDoc(doc);
  if (!formatted) return null;
  const rawName = (formatted.userName || "").trim();
  const authorName = rawName ? rawName.split(/\s+/)[0] : "ChangeLens User";
  return {
    id: formatted.id,
    authorName,
    type: formatted.type,
    rating: formatted.rating,
    title: formatted.title,
    message: formatted.message,
    attachments: formatted.attachments,
    status: formatted.status,
    createdAt: formatted.createdAt,
  };
}

function isValidObjectId(value) {
  return typeof value === "string" && mongoose.Types.ObjectId.isValid(value);
}

export const feedbackRepository = {
  /**
   * Create feedback, or update existing rating if the same user rates the same analysisId again.
   */
  async createOrUpdate({
    userId = null,
    userName = null,
    userEmail = null,
    type,
    rating = null,
    title = "",
    message = "",
    analysisId = null,
    attachments = [],
    context = {},
  }) {
    const cleanAttachments = formatAttachments(attachments);
    const dbReady = await ensureDbReady();

    if (dbReady) {
      const userObjId = isValidObjectId(userId) ? userId : null;

      // Prevent duplicate analysis ratings from the same authenticated user
      if (type === "analysis_rating" && analysisId && userObjId) {
        const existing = await Feedback.findOne({
          user: userObjId,
          analysisId,
          type: "analysis_rating",
        });

        if (existing) {
          existing.rating = rating;
          if (message) existing.message = message;
          if (title) existing.title = title;
          if (cleanAttachments.length > 0) existing.attachments = cleanAttachments;
          const prevCtx =
            existing.context && typeof existing.context.toObject === "function"
              ? existing.context.toObject()
              : existing.context || {};
          existing.context = { ...prevCtx, ...context };
          await existing.save();
          return { record: formatFeedbackDoc(existing), updated: true };
        }
      }

      const created = await Feedback.create({
        user: userObjId,
        userName,
        userEmail,
        type,
        rating,
        title,
        message,
        analysisId,
        attachments: cleanAttachments,
        context,
      });

      return { record: formatFeedbackDoc(created), updated: false };
    }

    // In-memory fallback
    if (type === "analysis_rating" && analysisId && userId) {
      const existing = memoryFeedback.find(
        (item) =>
          item.userId === String(userId) &&
          item.analysisId === analysisId &&
          item.type === "analysis_rating"
      );

      if (existing) {
        existing.rating = rating;
        if (message) existing.message = message;
        if (title) existing.title = title;
        if (cleanAttachments.length > 0) existing.attachments = cleanAttachments;
        existing.context = { ...existing.context, ...context };
        existing.updatedAt = new Date().toISOString();
        return { record: { ...existing }, updated: true };
      }
    }

    const now = new Date().toISOString();
    const record = {
      id: `fb_${crypto.randomUUID().slice(0, 12)}`,
      userId: userId ? String(userId) : null,
      userName,
      userEmail,
      type,
      rating,
      title,
      message,
      analysisId,
      attachments: cleanAttachments,
      context,
      status: "new",
      createdAt: now,
      updatedAt: now,
    };

    memoryFeedback.unshift(record);
    return { record: { ...record }, updated: false };
  },

  /**
   * List feedback submitted by a specific user (newest first).
   */
  async listByUser(userId, { limit = 20 } = {}) {
    if (!userId) return [];
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const dbReady = await ensureDbReady();

    if (dbReady && isValidObjectId(String(userId))) {
      const docs = await Feedback.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .lean();
      return docs.map(formatFeedbackDoc);
    }

    return memoryFeedback
      .filter((item) => item.userId === String(userId))
      .slice(0, safeLimit);
  },

  /**
   * List public community feedback & bug reports (privacy-safe, supports type & star filter).
   */
  async listPublic({ type = null, rating = null, limit = 30 } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
    const filterType = type && FEEDBACK_TYPES.includes(type) ? type : null;
    const filterRating =
      rating !== null && rating !== undefined && rating !== ""
        ? Number(rating)
        : null;
    const validRating =
      Number.isInteger(filterRating) && filterRating >= 1 && filterRating <= 5
        ? filterRating
        : null;

    const dbReady = await ensureDbReady();

    if (dbReady) {
      const query = {};
      if (filterType) query.type = filterType;
      if (validRating) query.rating = validRating;

      const docs = await Feedback.find(query)
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .lean();
      return docs.map(formatPublicFeedbackDoc);
    }

    return memoryFeedback
      .filter((item) => {
        if (filterType && item.type !== filterType) return false;
        if (validRating && item.rating !== validRating) return false;
        return true;
      })
      .slice(0, safeLimit)
      .map(formatPublicFeedbackDoc);
  },

  /**
   * Fetch rating summary for a specific analysisId plus the current user's rating (if any).
   */
  async getAnalysisRatingSummary(analysisId, userId = null) {
    if (!analysisId) {
      return { averageRating: 0, totalRatings: 0, userRating: null };
    }

    const dbReady = await ensureDbReady();

    if (dbReady) {
      const docs = await Feedback.find({
        analysisId,
        type: "analysis_rating",
        rating: { $gte: 1, $lte: 5 },
      })
        .select("user rating message updatedAt")
        .lean();

      const totalRatings = docs.length;
      const sum = docs.reduce((acc, d) => acc + (d.rating || 0), 0);
      const averageRating = totalRatings > 0 ? Number((sum / totalRatings).toFixed(2)) : 0;

      let userRating = null;
      if (userId) {
        const mine = docs.find((d) => d.user && String(d.user) === String(userId));
        if (mine) {
          userRating = {
            rating: mine.rating,
            message: mine.message || "",
            updatedAt: mine.updatedAt ? new Date(mine.updatedAt).toISOString() : null,
          };
        }
      }

      return { averageRating, totalRatings, userRating };
    }

    const matching = memoryFeedback.filter(
      (item) =>
        item.analysisId === analysisId &&
        item.type === "analysis_rating" &&
        typeof item.rating === "number"
    );

    const totalRatings = matching.length;
    const sum = matching.reduce((acc, item) => acc + item.rating, 0);
    const averageRating = totalRatings > 0 ? Number((sum / totalRatings).toFixed(2)) : 0;

    let userRating = null;
    if (userId) {
      const mine = matching.find((item) => item.userId === String(userId));
      if (mine) {
        userRating = {
          rating: mine.rating,
          message: mine.message || "",
          updatedAt: mine.updatedAt,
        };
      }
    }

    return { averageRating, totalRatings, userRating };
  },

  /**
   * Compute aggregate 5-star rating & category breakdown across all feedback.
   */
  async getStats() {
    const dbReady = await ensureDbReady();
    let records = [];

    if (dbReady) {
      records = await Feedback.find({}).select("type rating title message").lean();
    } else {
      records = memoryFeedback;
    }

    const byType = Object.fromEntries(FEEDBACK_TYPES.map((t) => [t, 0]));
    const starDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let ratingSum = 0;
    let totalRatings = 0;
    let totalReviews = 0;

    for (const r of records) {
      if (r.type in byType) {
        byType[r.type] += 1;
      }
      if ((r.message && r.message.trim().length > 0) || (r.title && r.title.trim().length > 0)) {
        totalReviews += 1;
      }
      if (typeof r.rating === "number" && r.rating >= 1 && r.rating <= 5) {
        const rounded = Math.round(r.rating);
        starDistribution[rounded] = (starDistribution[rounded] || 0) + 1;
        ratingSum += r.rating;
        totalRatings += 1;
      }
    }

    const averageRating =
      totalRatings > 0 ? Number((ratingSum / totalRatings).toFixed(2)) : 0;

    const starPercentages = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (totalRatings > 0) {
      for (const s of [1, 2, 3, 4, 5]) {
        starPercentages[s] = Math.round((starDistribution[s] / totalRatings) * 100);
      }
    }

    return {
      totalFeedback: records.length,
      totalRatings,
      totalReviews,
      averageRating,
      starDistribution,
      starPercentages,
      byType,
    };
  },

  /**
   * Test helper to clear the in-memory feedback store.
   */
  clearMemoryStore() {
    memoryFeedback.length = 0;
  },
};
