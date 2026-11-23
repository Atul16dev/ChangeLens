import mongoose from "mongoose";

const JobSchema = new mongoose.Schema(
  {
    jobId: {
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
    analysisId: {
      type: String,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["QUEUED", "PROCESSING", "COMPLETED", "FAILED"],
      default: "QUEUED",
      index: true,
    },
    progress: {
      type: Number,
      default: 0,
    },
    stage: {
      type: String,
      default: "Queued in worker pool",
    },
    params: {
      type: Object,
      default: {},
    },
    result: {
      type: Object,
      default: null,
    },
    error: {
      type: Object,
      default: null,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 2,
    },
    queuedAt: {
      type: Date,
      default: Date.now,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    expireAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days TTL
    },
  },
  {
    timestamps: true,
  }
);

JobSchema.index({ user: 1, status: 1, createdAt: -1 });
JobSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export const Job = mongoose.models.Job || mongoose.model("Job", JobSchema);
