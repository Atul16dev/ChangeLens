import mongoose from "mongoose";

const OtpChallengeSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ["email_verification", "password_reset"],
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    resetTokenHash: {
      type: String,
      default: null,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: "10m" }, // MongoDB TTL: auto-delete 10 minutes after expiry
    },
    attemptsCount: {
      type: Number,
      default: 0,
    },
    resendAvailableAt: {
      type: Date,
      required: true,
    },
    isConsumed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

OtpChallengeSchema.index({ email: 1, purpose: 1, isConsumed: 1 });

export const OtpChallenge = mongoose.models.OtpChallenge || mongoose.model("OtpChallenge", OtpChallengeSchema);
