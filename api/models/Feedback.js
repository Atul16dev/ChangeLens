import mongoose from "mongoose";

export const FEEDBACK_TYPES = [
  "bug_report",
  "feature_request",
  "general_feedback",
  "analysis_rating",
  "app_rating",
];

const FeedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    userName: {
      type: String,
      default: null,
      trim: true,
    },
    userEmail: {
      type: String,
      default: null,
      trim: true,
    },
    type: {
      type: String,
      enum: FEEDBACK_TYPES,
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
    },
    message: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    analysisId: {
      type: String,
      default: null,
      index: true,
    },
    attachments: {
      type: [
        {
          url: { type: String, required: true },
          mediaType: { type: String, enum: ["image", "video"], required: true },
          fileName: { type: String, default: "" },
          mimeType: { type: String, default: "" },
          size: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    context: {
      pageUrl: { type: String, default: null },
      viewMode: { type: String, default: null },
      deviceType: { type: String, default: null },
      userAgent: { type: String, default: null },
    },
    status: {
      type: String,
      enum: ["new", "reviewed", "resolved"],
      default: "new",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

FeedbackSchema.index({ user: 1, createdAt: -1 });
FeedbackSchema.index({ type: 1, createdAt: -1 });
FeedbackSchema.index({ user: 1, analysisId: 1, type: 1 });

export const Feedback =
  mongoose.models.Feedback || mongoose.model("Feedback", FeedbackSchema);
