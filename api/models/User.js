import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      default: null,
    },
    authProvider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local",
    },
    googleId: {
      type: String,
      sparse: true,
      index: true,
    },
    githubId: {
      type: String,
      sparse: true,
      index: true,
    },
    githubUsername: {
      type: String,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    avatar: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
      index: true,
    },
    permissions: {
      canModerateFeedback: { type: Boolean, default: false },
      canManageUsers: { type: Boolean, default: false },
      canViewAnalytics: { type: Boolean, default: false },
      canPurgeCache: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ["active", "suspended", "banned"],
      default: "active",
      index: true,
    },
    banReason: {
      type: String,
      default: null,
    },
    bannedAt: {
      type: Date,
      default: null,
    },
    bannedBy: {
      userId: { type: String, default: null },
      name: { type: String, default: null },
      email: { type: String, default: null },
    },
    adminNotes: [
      {
        text: { type: String, required: true },
        authorId: { type: String, required: true },
        authorName: { type: String, default: "Staff" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

UserSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    avatar: this.avatar || null,
    role: this.role || "user",
    permissions: this.permissions || {
      canModerateFeedback: false,
      canManageUsers: false,
      canViewAnalytics: false,
      canPurgeCache: false,
    },
    status: this.status || "active",
    ban_reason: this.banReason || null,
    banned_at: this.bannedAt ? this.bannedAt.toISOString() : null,
    banned_by: this.bannedBy || null,
    admin_notes: Array.isArray(this.adminNotes)
      ? this.adminNotes.map((n) => ({
          text: n.text,
          author_id: n.authorId,
          author_name: n.authorName,
          created_at: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString(),
        }))
      : [],
    auth_provider: this.authProvider,
    google_id: this.googleId,
    github_id: this.githubId || null,
    github_username: this.githubUsername || null,
    is_email_verified: this.isEmailVerified,
    created_at: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
    updated_at: this.updatedAt ? this.updatedAt.toISOString() : new Date().toISOString(),
  };
};

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
