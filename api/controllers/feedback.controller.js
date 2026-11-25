import { FEEDBACK_TYPES } from "../models/Feedback.js";
import { feedbackRepository } from "../db/feedback-repository.js";
import {
  isCloudinaryConfigured,
  uploadFeedbackMedia,
} from "../services/cloudinary.js";

const RATING_REQUIRED_TYPES = new Set(["analysis_rating", "app_rating"]);
const MESSAGE_REQUIRED_TYPES = new Set([
  "bug_report",
  "feature_request",
  "general_feedback",
]);

const MAX_ATTACHMENTS = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_BYTES = 12 * 1024 * 1024; // 12 MB
// Keep aggregate inline base64 payloads safely below MongoDB's 16 MB BSON document limit
const MAX_TOTAL_INLINE_DATA_CHARS = 14 * 1024 * 1024;

const ALLOWED_IMAGE_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);
const ALLOWED_VIDEO_MIMES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

function sanitizeString(val, maxLen = 500) {
  if (typeof val !== "string") return "";
  return val.trim().slice(0, maxLen);
}

function estimateBase64Bytes(dataUri) {
  const commaIdx = dataUri.indexOf(",");
  if (commaIdx === -1) return 0;
  const base64 = dataUri.slice(commaIdx + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function extractMimeFromDataUri(dataUri) {
  const match = dataUri.match(/^data:([a-zA-Z0-9/+.-]+);base64,/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Validates and uploads up to 3 screenshot / short video attachments.
 */
async function processAttachments(rawAttachments, userId) {
  if (!Array.isArray(rawAttachments) || rawAttachments.length === 0) {
    return { attachments: [] };
  }

  if (rawAttachments.length > MAX_ATTACHMENTS) {
    return {
      error: {
        status: 400,
        code: "TOO_MANY_ATTACHMENTS",
        message: `You can attach up to ${MAX_ATTACHMENTS} files per submission.`,
      },
    };
  }

  const processed = [];
  let totalInlineChars = 0;

  for (const item of rawAttachments) {
    if (!item || typeof item !== "object") continue;
    const rawData = typeof item.dataUrl === "string" ? item.dataUrl.trim() : "";
    const fileName = sanitizeString(item.fileName || "attachment", 140);

    if (!rawData.startsWith("data:")) {
      return {
        error: {
          status: 400,
          code: "INVALID_ATTACHMENT",
          message: `Attachment "${fileName}" must be a valid image or video file.`,
        },
      };
    }

    const mimeType = extractMimeFromDataUri(rawData);
    const isImage = mimeType && ALLOWED_IMAGE_MIMES.has(mimeType);
    const isVideo = mimeType && ALLOWED_VIDEO_MIMES.has(mimeType);

    if (!isImage && !isVideo) {
      return {
        error: {
          status: 400,
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: `Unsupported file type for "${fileName}". Use PNG, JPG, WebP, GIF, MP4, WebM, or MOV.`,
        },
      };
    }

    const mediaType = isVideo ? "video" : "image";
    const byteSize = estimateBase64Bytes(rawData);
    const maxAllowed = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;

    if (byteSize > maxAllowed) {
      const limitLabel = isVideo ? "12 MB" : "5 MB";
      return {
        error: {
          status: 400,
          code: "FILE_TOO_LARGE",
          message: `"${fileName}" exceeds the ${limitLabel} size limit for ${mediaType}s.`,
        },
      };
    }

    let finalUrl = rawData;
    let finalBytes = byteSize;

    // Upload to Cloudinary CDN in non-test environments when configured
    if (process.env.NODE_ENV !== "test" && isCloudinaryConfigured()) {
      try {
        const uploaded = await uploadFeedbackMedia(rawData, {
          mediaType,
          userId: userId || "guest",
        });
        finalUrl = uploaded.url;
        finalBytes = uploaded.bytes || byteSize;
      } catch (uploadErr) {
        return {
          error: {
            status: 502,
            code: "MEDIA_UPLOAD_FAILED",
            message: `Failed to upload "${fileName}": ${uploadErr.message}`,
          },
        };
      }
    }

    if (finalUrl.startsWith("data:")) {
      totalInlineChars += finalUrl.length;
      if (totalInlineChars > MAX_TOTAL_INLINE_DATA_CHARS) {
        return {
          error: {
            status: 400,
            code: "ATTACHMENTS_TOO_LARGE",
            message:
              "Total inline attachment payload exceeds the 14 MB limit. Please attach smaller files.",
          },
        };
      }
    }

    processed.push({
      url: finalUrl,
      mediaType,
      fileName,
      mimeType,
      size: finalBytes,
    });
  }

  return { attachments: processed };
}

/**
 * POST /api/v1/feedback
 * Submits bug reports (with optional screenshots/videos), feature requests, general feedback,
 * analysis ratings, or 5-star app ratings.
 */
export async function submitFeedback(req, res, next) {
  try {
    const body = req.body || {};
    const type = typeof body.type === "string" ? body.type.trim() : "";

    if (!FEEDBACK_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_FEEDBACK_TYPE",
          message: `Feedback type must be one of: ${FEEDBACK_TYPES.join(", ")}.`,
          requestId: req.id,
        },
      });
    }

    // Validate optional or required 5-star rating
    let parsedRating = null;
    if (body.rating !== undefined && body.rating !== null && body.rating !== "") {
      const num = Number(body.rating);
      if (!Number.isInteger(num) || num < 1 || num > 5) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_RATING",
            message: "Rating must be a whole number between 1 and 5.",
            requestId: req.id,
          },
        });
      }
      parsedRating = num;
    }

    if (RATING_REQUIRED_TYPES.has(type) && parsedRating === null) {
      return res.status(400).json({
        success: false,
        error: {
          code: "RATING_REQUIRED",
          message: "Please select a star rating from 1 to 5.",
          requestId: req.id,
        },
      });
    }

    const title = sanitizeString(body.title, 160);
    const message = sanitizeString(body.message, 2000);
    const analysisId = sanitizeString(body.analysisId, 120) || null;

    if (MESSAGE_REQUIRED_TYPES.has(type) && message.length < 3) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MESSAGE_REQUIRED",
          message: "Please enter a brief message (at least 3 characters).",
          requestId: req.id,
        },
      });
    }

    if (type === "analysis_rating" && !analysisId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "ANALYSIS_ID_REQUIRED",
          message: "An analysisId is required when rating an analysis.",
          requestId: req.id,
        },
      });
    }

    // Validate & upload optional screenshot/video attachments
    const { attachments, error: attachError } = await processAttachments(
      body.attachments,
      req.user?.id
    );
    if (attachError) {
      return res.status(attachError.status).json({
        success: false,
        error: {
          code: attachError.code,
          message: attachError.message,
          requestId: req.id,
        },
      });
    }

    const rawContext = body.context && typeof body.context === "object" ? body.context : {};
    const context = {
      pageUrl: sanitizeString(rawContext.pageUrl, 300) || null,
      viewMode: sanitizeString(rawContext.viewMode, 30) || null,
      deviceType: sanitizeString(rawContext.deviceType, 30) || null,
      userAgent: sanitizeString(req.headers["user-agent"] || "", 300) || null,
    };

    const { record, updated } = await feedbackRepository.createOrUpdate({
      userId: req.user?.id || null,
      userName: req.user?.name || null,
      userEmail: req.user?.email || null,
      type,
      rating: parsedRating,
      title,
      message,
      analysisId,
      attachments,
      context,
    });

    return res.status(updated ? 200 : 201).json({
      success: true,
      data: {
        feedback: record,
        updated,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/feedback/mine
 * Returns feedback submitted by the authenticated user.
 */
export async function getMyFeedback(req, res, next) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const items = await feedbackRepository.listByUser(req.user.id, { limit });
    return res.status(200).json({
      success: true,
      data: {
        feedback: items,
        total: items.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/feedback/public
 * Returns community feedback/reports (privacy-safe) + Flipkart-style rating summary.
 */
export async function getPublicFeedback(req, res, next) {
  try {
    const type = typeof req.query.type === "string" ? req.query.type.trim() : null;
    const rating = req.query.rating ?? null;
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);

    const [items, stats] = await Promise.all([
      feedbackRepository.listPublic({ type, rating, limit }),
      feedbackRepository.getStats(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        feedback: items,
        total: items.length,
        stats,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/feedback/stats
 * Returns aggregate 5-star average rating, star distribution, and category counts.
 */
export async function getFeedbackStats(_req, res, next) {
  try {
    const stats = await feedbackRepository.getStats();
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/feedback/analysis/:analysisId
 * Returns rating summary for a specific analysis and the current user's rating (if logged in).
 */
export async function getAnalysisRating(req, res, next) {
  try {
    const analysisId = sanitizeString(req.params.analysisId, 120);
    if (!analysisId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_ANALYSIS_ID",
          message: "A valid analysisId is required.",
          requestId: req.id,
        },
      });
    }

    const summary = await feedbackRepository.getAnalysisRatingSummary(
      analysisId,
      req.user?.id || null
    );

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (err) {
    next(err);
  }
}
