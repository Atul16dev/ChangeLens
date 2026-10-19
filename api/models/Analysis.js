import mongoose from "mongoose";

const AnalysisSchema = new mongoose.Schema(
  {
    analysisId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    targetDir: {
      type: String,
      default: null,
    },
    changedFiles: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed"],
      default: "completed",
    },
    summary: {
      type: Object,
      default: {},
    },
    graph: {
      type: Object,
      default: {},
    },
    impactAnalysis: {
      type: Object,
      default: {},
    },
    explanation: {
      type: Object,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

AnalysisSchema.index({ createdAt: -1 });

export const Analysis = mongoose.models.Analysis || mongoose.model("Analysis", AnalysisSchema);
