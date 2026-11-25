import mongoose from "mongoose";

const RepositorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    owner: {
      type: String,
      required: true,
      trim: true,
    },
    repo: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    repoUrl: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    defaultBranch: {
      type: String,
      default: "main",
    },
    language: {
      type: String,
      default: null,
    },
    stars: {
      type: Number,
      default: 0,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastAnalyzedAt: {
      type: Date,
      default: null,
    },
    lastAnalysisId: {
      type: String,
      default: null,
    },
    lastRiskScore: {
      type: Number,
      default: null,
    },
    lastRiskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL", null],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

RepositorySchema.index({ user: 1, fullName: 1 }, { unique: true });
RepositorySchema.index({ user: 1, isPinned: -1, lastAnalyzedAt: -1, updatedAt: -1 });

export const Repository =
  mongoose.models.Repository || mongoose.model("Repository", RepositorySchema);
