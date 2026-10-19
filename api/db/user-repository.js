import crypto from "node:crypto";
import { isMongoConnected } from "./mongodb.js";
import { User } from "../models/User.js";

// In-memory store for isolated unit tests
const memoryUsers = new Map();

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
  return {
    id: String(safe.id || safe._id),
    name: safe.name,
    email: safe.email,
    auth_provider: safe.auth_provider || safe.authProvider || "local",
    google_id: safe.google_id || safe.googleId || null,
    is_email_verified: Boolean(safe.is_email_verified ?? safe.isEmailVerified),
    created_at: safe.created_at || (safe.createdAt ? new Date(safe.createdAt).toISOString() : new Date().toISOString()),
    updated_at: safe.updated_at || (safe.updatedAt ? new Date(safe.updatedAt).toISOString() : new Date().toISOString()),
  };
}

function formatUserDoc(doc) {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    password_hash: doc.passwordHash,
    auth_provider: doc.authProvider,
    google_id: doc.googleId,
    is_email_verified: doc.isEmailVerified ? 1 : 0,
    created_at: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
    updated_at: doc.updatedAt ? doc.updatedAt.toISOString() : new Date().toISOString(),
    password_changed_at: doc.passwordChangedAt ? doc.passwordChangedAt.toISOString() : null,
  };
}

export const userRepository = {
  async create({ name, email, passwordHash = null, authProvider = "local", googleId = null, isEmailVerified = 0 }) {
    const cleanEmail = normalizeEmail(email);

    if (isMongoConnected()) {
      const doc = await User.create({
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        authProvider,
        googleId,
        isEmailVerified: Boolean(isEmailVerified),
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
      password_hash: passwordHash,
      auth_provider: authProvider,
      google_id: googleId,
      is_email_verified: isEmailVerified ? 1 : 0,
      created_at: now,
      updated_at: now,
      password_changed_at: null,
    };
    memoryUsers.set(id, user);
    return user;
  },

  async findById(id) {
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

  async updateProfile(id, { name }) {
    if (isMongoConnected()) {
      const doc = await User.findByIdAndUpdate(
        id,
        { name: name.trim() },
        { new: true }
      );
      return formatUserDoc(doc);
    }

    const user = memoryUsers.get(id);
    if (user) {
      user.name = name.trim();
      user.updated_at = new Date().toISOString();
    }
    return user || null;
  },

  async updatePassword(id, passwordHash) {
    const now = new Date();
    if (isMongoConnected()) {
      const doc = await User.findByIdAndUpdate(
        id,
        { passwordHash, passwordChangedAt: now },
        { new: true }
      );
      return formatUserDoc(doc);
    }

    const user = memoryUsers.get(id);
    if (user) {
      user.password_hash = passwordHash;
      user.password_changed_at = now.toISOString();
      user.updated_at = now.toISOString();
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

  clearMemory() {
    memoryUsers.clear();
  },
};
