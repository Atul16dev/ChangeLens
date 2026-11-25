import crypto from "node:crypto";
import mongoose from "mongoose";
import { isMongoConnected } from "./mongodb.js";
import { User } from "../models/User.js";
import {
  isSuperAdminEmail,
  SUPERADMIN_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  sanitizePermissions,
} from "../services/admin-auth.js";

// In-memory store for isolated unit tests
const memoryUsers = new Map();

/**
 * Ensures MongoDB connection is ready if an active handshake is in progress
 */
async function ensureDbReady() {
  if (isMongoConnected()) return true;
  if (process.env.MONGODB_URI && mongoose.connection.readyState === 2) {
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 200));
      if (isMongoConnected()) return true;
    }
  }
  return isMongoConnected();
}

/**
 * Normalizes email address to lowercase and trimmed string
 */
export function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

/**
 * Strips password hash and private secrets for public API responses
 */
export function toSafeUser(user) {
  if (!user) return null;
  const { password_hash, passwordHash, ...safe } = user;
  const isSuper = safe.role === "superadmin" || isSuperAdminEmail(safe.email);
  const role = isSuper ? "superadmin" : safe.role || "user";
  const permissions = isSuper
    ? { ...SUPERADMIN_PERMISSIONS }
    : sanitizePermissions(safe.permissions || {}, role);

  return {
    id: String(safe.id || safe._id),
    name: safe.name,
    email: safe.email,
    avatar: safe.avatar || null,
    role,
    permissions,
    status: safe.status || "active",
    ban_reason: safe.ban_reason || safe.banReason || null,
    banned_at: safe.banned_at || (safe.bannedAt ? new Date(safe.bannedAt).toISOString() : null),
    banned_by: safe.banned_by || safe.bannedBy || null,
    admin_notes: Array.isArray(safe.admin_notes || safe.adminNotes)
      ? (safe.admin_notes || safe.adminNotes).map((n) => ({
          text: n.text,
          author_id: n.author_id || n.authorId,
          author_name: n.author_name || n.authorName || "Staff",
          created_at: n.created_at || (n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString()),
        }))
      : [],
    auth_provider: safe.auth_provider || safe.authProvider || "local",
    google_id: safe.google_id || safe.googleId || null,
    github_id: safe.github_id || safe.githubId || null,
    github_username: safe.github_username || safe.githubUsername || null,
    is_email_verified: Boolean(safe.is_email_verified ?? safe.isEmailVerified),
    created_at: safe.created_at || (safe.createdAt ? new Date(safe.createdAt).toISOString() : new Date().toISOString()),
    updated_at: safe.updated_at || (safe.updatedAt ? new Date(safe.updatedAt).toISOString() : new Date().toISOString()),
  };
}

function formatUserDoc(doc) {
  if (!doc) return null;
  const rawRole = doc.role || "user";
  const isSuper = rawRole === "superadmin" || isSuperAdminEmail(doc.email);
  const role = isSuper ? "superadmin" : rawRole;
  const permissions = isSuper
    ? { ...SUPERADMIN_PERMISSIONS }
    : sanitizePermissions(
        doc.permissions && typeof doc.permissions.toObject === "function"
          ? doc.permissions.toObject()
          : doc.permissions || {},
        role
      );

  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    avatar: doc.avatar || null,
    role,
    permissions,
    status: doc.status || "active",
    ban_reason: doc.banReason || null,
    banned_at: doc.bannedAt ? doc.bannedAt.toISOString() : null,
    banned_by: doc.bannedBy ? (typeof doc.bannedBy.toObject === "function" ? doc.bannedBy.toObject() : doc.bannedBy) : null,
    admin_notes: Array.isArray(doc.adminNotes)
      ? doc.adminNotes.map((n) => ({
          text: n.text,
          author_id: n.authorId,
          author_name: n.authorName,
          created_at: n.createdAt ? n.createdAt.toISOString() : new Date().toISOString(),
        }))
      : [],
    password_hash: doc.passwordHash,
    auth_provider: doc.authProvider,
    google_id: doc.googleId,
    github_id: doc.githubId || null,
    github_username: doc.githubUsername || null,
    is_email_verified: doc.isEmailVerified ? 1 : 0,
    created_at: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
    updated_at: doc.updatedAt ? doc.updatedAt.toISOString() : new Date().toISOString(),
    password_changed_at: doc.passwordChangedAt ? doc.passwordChangedAt.toISOString() : null,
  };
}

export const userRepository = {
  async create({
    name,
    email,
    passwordHash = null,
    authProvider = "local",
    googleId = null,
    githubId = null,
    githubUsername = null,
    isEmailVerified = 0,
    role = "user",
    permissions = {},
    avatar = null,
  }) {
    const cleanEmail = normalizeEmail(email);
    await ensureDbReady();

    const isSuper = isSuperAdminEmail(cleanEmail);
    const initialRole = isSuper ? "superadmin" : role || "user";
    const initialPermissions = isSuper
      ? { ...SUPERADMIN_PERMISSIONS }
      : sanitizePermissions(permissions, initialRole);

    if (isMongoConnected()) {
      const doc = await User.create({
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        authProvider,
        googleId,
        githubId,
        githubUsername,
        avatar,
        isEmailVerified: Boolean(isEmailVerified),
        role: initialRole,
        permissions: initialPermissions,
        status: "active",
        banReason: null,
        bannedAt: null,
        bannedBy: null,
        adminNotes: [],
      });
      return formatUserDoc(doc);
    }

    // In-memory fallback (used in automated tests)
    const id = `usr_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const user = {
      id,
      name: name.trim(),
      email: cleanEmail,
      avatar,
      role: initialRole,
      permissions: initialPermissions,
      status: "active",
      ban_reason: null,
      banned_at: null,
      banned_by: null,
      admin_notes: [],
      password_hash: passwordHash,
      auth_provider: authProvider,
      google_id: googleId,
      github_id: githubId,
      github_username: githubUsername,
      is_email_verified: isEmailVerified ? 1 : 0,
      created_at: now,
      updated_at: now,
      password_changed_at: null,
    };
    memoryUsers.set(id, user);
    return user;
  },

  async findById(id) {
    await ensureDbReady();
    if (isMongoConnected()) {
      try {
        const doc = await User.findById(id);
        return formatUserDoc(doc);
      } catch {
        return null;
      }
    }

    return memoryUsers.get(id) || null;
  },

  async findByEmail(email) {
    const cleanEmail = normalizeEmail(email);
    await ensureDbReady();

    if (isMongoConnected()) {
      const doc = await User.findOne({ email: cleanEmail });
      return formatUserDoc(doc);
    }

    for (const user of memoryUsers.values()) {
      if (user.email === cleanEmail) {
        return user;
      }
    }
    return null;
  },

  async findByGoogleId(googleId) {
    if (isMongoConnected()) {
      const doc = await User.findOne({ googleId });
      return formatUserDoc(doc);
    }

    for (const user of memoryUsers.values()) {
      if (user.google_id === googleId) {
        return user;
      }
    }
    return null;
  },

  async updateVerification(id, isVerified = true) {
    if (isMongoConnected()) {
      const doc = await User.findByIdAndUpdate(
        id,
        { isEmailVerified: Boolean(isVerified) },
        { new: true }
      );
      return formatUserDoc(doc);
    }

    const user = memoryUsers.get(id);
    if (user) {
      user.is_email_verified = isVerified ? 1 : 0;
      user.updated_at = new Date().toISOString();
    }
    return user || null;
  },

  async updateUnverifiedCredentials(id, { name, passwordHash }) {
    if (isMongoConnected()) {
      const doc = await User.findByIdAndUpdate(
        id,
        { name: name.trim(), passwordHash },
        { new: true }
      );
      return formatUserDoc(doc);
    }

    const user = memoryUsers.get(id);
    if (user) {
      user.name = name.trim();
      user.password_hash = passwordHash;
      user.updated_at = new Date().toISOString();
    }
    return user || null;
  },

  async updateProfile(id, { name, avatar }) {
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (avatar !== undefined) updateData.avatar = avatar;

    if (isMongoConnected()) {
      const doc = await User.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );
      return formatUserDoc(doc);
    }

    const user = memoryUsers.get(id);
    if (user) {
      if (name !== undefined) user.name = name.trim();
      if (avatar !== undefined) user.avatar = avatar;
      user.updated_at = new Date().toISOString();
    }
    return user || null;
  },

  async updatePassword(id, passwordHash) {
    await ensureDbReady();
    if (isMongoConnected()) {
      const existing = await User.findById(id).select("passwordChangedAt").lean();
      const prevMs = existing?.passwordChangedAt ? new Date(existing.passwordChangedAt).getTime() : 0;
      const changedAt = new Date(Math.max(Date.now(), prevMs + 2));
      const doc = await User.findByIdAndUpdate(
        id,
        { passwordHash, passwordChangedAt: changedAt },
        { new: true }
      );
      return formatUserDoc(doc);
    }

    const user = memoryUsers.get(id);
    if (user) {
      const prevMs = user.password_changed_at ? new Date(user.password_changed_at).getTime() : 0;
      const changedAt = new Date(Math.max(Date.now(), prevMs + 2)).toISOString();
      user.password_hash = passwordHash;
      user.password_changed_at = changedAt;
      user.updated_at = changedAt;
    }
    return user || null;
  },

  async linkGoogleAccount(id, googleId) {
    if (isMongoConnected()) {
      const doc = await User.findByIdAndUpdate(
        id,
        { googleId, isEmailVerified: true },
        { new: true }
      );
      return formatUserDoc(doc);
    }

    const user = memoryUsers.get(id);
    if (user) {
      user.google_id = googleId;
      user.is_email_verified = 1;
      user.updated_at = new Date().toISOString();
    }
    return user || null;
  },

  async linkGitHubAccount(id, githubId, githubUsername = null) {
    if (isMongoConnected()) {
      const doc = await User.findByIdAndUpdate(
        id,
        { githubId, githubUsername, isEmailVerified: true },
        { new: true }
      );
      return formatUserDoc(doc);
    }

    const user = memoryUsers.get(id);
    if (user) {
      user.github_id = String(githubId);
      user.github_username = githubUsername;
      user.is_email_verified = 1;
      user.updated_at = new Date().toISOString();
    }
    return user || null;
  },

  async findByGitHubId(githubId) {
    if (!githubId) return null;
    await ensureDbReady();
    if (isMongoConnected()) {
      const doc = await User.findOne({ githubId: String(githubId) });
      return formatUserDoc(doc);
    }

    for (const user of memoryUsers.values()) {
      if (user.github_id === String(githubId)) {
        return user;
      }
    }
    return null;
  },

  async updateRoleAndPermissions(id, { role, permissions } = {}) {
    await ensureDbReady();
    const targetUser = await this.findById(id);
    if (!targetUser) return null;

    const isSuper = isSuperAdminEmail(targetUser.email) || role === "superadmin";
    const sanitizedRole = isSuper ? "superadmin" : role === "admin" ? "admin" : "user";
    const sanitizedPerms = isSuper
      ? { ...SUPERADMIN_PERMISSIONS }
      : sanitizePermissions(permissions, sanitizedRole);

    if (isMongoConnected()) {
      const doc = await User.findByIdAndUpdate(
        id,
        { role: sanitizedRole, permissions: sanitizedPerms },
        { new: true }
      );
      return formatUserDoc(doc);
    }

    const user = memoryUsers.get(id);
    if (user) {
      user.role = sanitizedRole;
      user.permissions = sanitizedPerms;
      user.updated_at = new Date().toISOString();
    }
    return user || null;
  },

  async banUser(id, { reason = "Violation of platform policies", bannedBy = null } = {}) {
    await ensureDbReady();
    const now = new Date();

    if (isMongoConnected()) {
      const doc = await User.findByIdAndUpdate(
        id,
        {
          status: "banned",
          banReason: reason,
          bannedAt: now,
          bannedBy,
        },
        { new: true }
      );
      return formatUserDoc(doc);
    }

    const user = memoryUsers.get(id);
    if (user) {
      user.status = "banned";
      user.ban_reason = reason;
      user.banned_at = now.toISOString();
      user.banned_by = bannedBy;
      user.updated_at = now.toISOString();
    }
    return user || null;
  },

  async unbanUser(id) {
    await ensureDbReady();
    const now = new Date();

    if (isMongoConnected()) {
      const doc = await User.findByIdAndUpdate(
        id,
        {
          status: "active",
          banReason: null,
          bannedAt: null,
          bannedBy: null,
        },
        { new: true }
      );
      return formatUserDoc(doc);
    }

    const user = memoryUsers.get(id);
    if (user) {
      user.status = "active";
      user.ban_reason = null;
      user.banned_at = null;
      user.banned_by = null;
      user.updated_at = now.toISOString();
    }
    return user || null;
  },

  async addAdminNote(id, { text, authorId, authorName = "Staff" }) {
    await ensureDbReady();
    const now = new Date();
    const newNote = {
      text: text.trim(),
      authorId,
      authorName,
      createdAt: now,
    };

    if (isMongoConnected()) {
      const doc = await User.findByIdAndUpdate(
        id,
        { $push: { adminNotes: newNote } },
        { new: true }
      );
      return formatUserDoc(doc);
    }

    const user = memoryUsers.get(id);
    if (user) {
      if (!Array.isArray(user.admin_notes)) {
        user.admin_notes = [];
      }
      user.admin_notes.push({
        text: text.trim(),
        author_id: authorId,
        author_name: authorName,
        created_at: now.toISOString(),
      });
      user.updated_at = now.toISOString();
    }
    return user || null;
  },

  async listUsers({ page = 1, limit = 50, search = "", role = "", status = "" } = {}) {
    await ensureDbReady();
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (p - 1) * l;

    if (isMongoConnected()) {
      const query = {};
      if (role) {
        query.role = role;
      }
      if (status) {
        query.status = status;
      }
      if (search) {
        const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        query.$or = [{ name: regex }, { email: regex }];
      }

      const [docs, total, totalCount, activeCount, bannedCount] = await Promise.all([
        User.find(query).sort({ createdAt: -1 }).skip(skip).limit(l),
        User.countDocuments(query),
        User.countDocuments({}),
        User.countDocuments({ status: { $nin: ["banned", "suspended"] } }),
        User.countDocuments({ status: { $in: ["banned", "suspended"] } }),
      ]);

      return {
        users: docs.map(formatUserDoc).map(toSafeUser),
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l) || 1,
        stats: {
          total: totalCount,
          active: activeCount,
          banned: bannedCount,
        },
      };
    }

    // In-memory filter & paginate
    const memoryAll = Array.from(memoryUsers.values());
    const stats = {
      total: memoryAll.length,
      active: memoryAll.filter((u) => (u.status || "active") === "active").length,
      banned: memoryAll.filter((u) => u.status === "banned" || u.status === "suspended").length,
    };

    let all = memoryAll;
    if (role) {
      all = all.filter((u) => u.role === role);
    }
    if (status) {
      all = all.filter((u) => (u.status || "active") === status);
    }
    if (search) {
      const q = search.toLowerCase();
      all = all.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    }
    all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const total = all.length;
    const slice = all.slice(skip, skip + l);

    return {
      users: slice.map(toSafeUser),
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l) || 1,
      stats,
    };
  },

  clearMemory() {
    memoryUsers.clear();
  },
};
