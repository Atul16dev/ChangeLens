import crypto from "node:crypto";
import mongoose from "mongoose";
import { isMongoConnected } from "./mongodb.js";
import { AdminInvitation } from "../models/AdminInvitation.js";
import { normalizeEmail } from "./user-repository.js";
import { sanitizePermissions } from "../services/admin-auth.js";

// In-memory store for unit test isolation
const memoryInvitations = new Map();

function formatInvitationDoc(doc) {
  if (!doc) return null;
  const isExpired = doc.status === "pending" && new Date(doc.expiresAt).getTime() < Date.now();
  const effectiveStatus = isExpired ? "expired" : doc.status;

  return {
    id: doc._id ? doc._id.toString() : doc.id,
    email: doc.email,
    role: doc.role,
    permissions:
      doc.permissions && typeof doc.permissions.toObject === "function"
        ? doc.permissions.toObject()
        : doc.permissions || {},
    token: doc.token,
    invited_by: doc.invitedBy || doc.invited_by,
    status: effectiveStatus,
    expires_at: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : doc.expires_at,
    accepted_at: doc.acceptedAt ? new Date(doc.acceptedAt).toISOString() : doc.accepted_at || null,
    accepted_by: doc.acceptedBy || doc.accepted_by || null,
    created_at: doc.createdAt ? new Date(doc.createdAt).toISOString() : doc.created_at,
    updated_at: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : doc.updated_at,
  };
}

export const adminInvitationRepository = {
  async create({ email, role = "admin", permissions = {}, token, invitedBy, expiresInHours = 72 }) {
    const cleanEmail = normalizeEmail(email);
    const sanitizedRole = role === "superadmin" ? "superadmin" : "admin";
    const sanitizedPerms = sanitizePermissions(permissions, sanitizedRole);
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    if (isMongoConnected()) {
      // Invalidate previous pending invitations for this email
      await AdminInvitation.updateMany(
        { email: cleanEmail, status: "pending" },
        { status: "revoked" }
      );

      const doc = await AdminInvitation.create({
        email: cleanEmail,
        role: sanitizedRole,
        permissions: sanitizedPerms,
        token,
        invitedBy,
        expiresAt,
        status: "pending",
      });
      return formatInvitationDoc(doc);
    }

    // In-memory fallback
    for (const inv of memoryInvitations.values()) {
      if (inv.email === cleanEmail && inv.status === "pending") {
        inv.status = "revoked";
        inv.updated_at = new Date().toISOString();
      }
    }

    const id = `inv_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const invRecord = {
      id,
      email: cleanEmail,
      role: sanitizedRole,
      permissions: sanitizedPerms,
      token,
      invited_by: invitedBy,
      status: "pending",
      expires_at: expiresAt.toISOString(),
      accepted_at: null,
      accepted_by: null,
      created_at: now,
      updated_at: now,
    };
    memoryInvitations.set(id, invRecord);
    return formatInvitationDoc(invRecord);
  },

  async findByToken(token) {
    if (!token) return null;

    if (isMongoConnected()) {
      const doc = await AdminInvitation.findOne({ token });
      return formatInvitationDoc(doc);
    }

    for (const inv of memoryInvitations.values()) {
      if (inv.token === token) {
        return formatInvitationDoc(inv);
      }
    }
    return null;
  },

  async findActiveByEmail(email) {
    if (!email) return null;
    const cleanEmail = normalizeEmail(email);

    if (isMongoConnected()) {
      const doc = await AdminInvitation.findOne({
        email: cleanEmail,
        status: "pending",
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });
      return formatInvitationDoc(doc);
    }

    for (const inv of memoryInvitations.values()) {
      if (
        inv.email === cleanEmail &&
        inv.status === "pending" &&
        new Date(inv.expires_at).getTime() > Date.now()
      ) {
        return formatInvitationDoc(inv);
      }
    }
    return null;
  },

  async findById(id) {
    if (!id) return null;

    if (isMongoConnected()) {
      try {
        const doc = await AdminInvitation.findById(id);
        return formatInvitationDoc(doc);
      } catch {
        return null;
      }
    }

    const inv = memoryInvitations.get(id);
    return inv ? formatInvitationDoc(inv) : null;
  },

  async revoke(id) {
    if (!id) return null;

    if (isMongoConnected()) {
      const doc = await AdminInvitation.findByIdAndUpdate(
        id,
        { status: "revoked" },
        { new: true }
      );
      return formatInvitationDoc(doc);
    }

    const inv = memoryInvitations.get(id);
    if (inv) {
      inv.status = "revoked";
      inv.updated_at = new Date().toISOString();
    }
    return inv ? formatInvitationDoc(inv) : null;
  },

  async markAccepted(id, userId) {
    if (!id) return null;
    const now = new Date();

    if (isMongoConnected()) {
      const doc = await AdminInvitation.findByIdAndUpdate(
        id,
        {
          status: "accepted",
          acceptedAt: now,
          acceptedBy: userId,
        },
        { new: true }
      );
      return formatInvitationDoc(doc);
    }

    const inv = memoryInvitations.get(id);
    if (inv) {
      inv.status = "accepted";
      inv.accepted_at = now.toISOString();
      inv.accepted_by = userId;
      inv.updated_at = now.toISOString();
    }
    return inv ? formatInvitationDoc(inv) : null;
  },

  async list({ status = "", page = 1, limit = 50 } = {}) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (p - 1) * l;

    if (isMongoConnected()) {
      const query = {};
      if (status) query.status = status;

      const [docs, total] = await Promise.all([
        AdminInvitation.find(query).sort({ createdAt: -1 }).skip(skip).limit(l),
        AdminInvitation.countDocuments(query),
      ]);

      return {
        invitations: docs.map(formatInvitationDoc),
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l) || 1,
      };
    }

    let all = Array.from(memoryInvitations.values()).map(formatInvitationDoc);
    if (status) {
      all = all.filter((inv) => inv.status === status);
    }
    all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const total = all.length;
    const slice = all.slice(skip, skip + l);

    return {
      invitations: slice,
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l) || 1,
    };
  },

  clearMemory() {
    memoryInvitations.clear();
  },
};
