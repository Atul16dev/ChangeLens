import mongoose from "mongoose";

const AdminInvitationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["admin", "superadmin"],
      default: "admin",
      required: true,
    },
    permissions: {
      canModerateFeedback: { type: Boolean, default: false },
      canManageUsers: { type: Boolean, default: false },
      canViewAnalytics: { type: Boolean, default: false },
      canPurgeCache: { type: Boolean, default: false },
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    invitedBy: {
      userId: { type: String, required: true },
      name: { type: String, default: "" },
      email: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "revoked", "expired"],
      default: "pending",
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    acceptedBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const AdminInvitation =
  mongoose.models.AdminInvitation ||
  mongoose.model("AdminInvitation", AdminInvitationSchema);
