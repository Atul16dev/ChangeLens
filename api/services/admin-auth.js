import crypto from "node:crypto";

export const DEFAULT_ADMIN_PERMISSIONS = {
  canModerateFeedback: false,
  canManageUsers: false,
  canViewAnalytics: false,
  canPurgeCache: false,
};

export const SUPERADMIN_PERMISSIONS = {
  canModerateFeedback: true,
  canManageUsers: true,
  canViewAnalytics: true,
  canPurgeCache: true,
};

/**
 * Returns a list of trimmed, lowercased superadmin emails configured via environment variable
 */
export function getSuperAdminEmails() {
  const envVal = process.env.SUPER_ADMIN_EMAILS || "";
  return envVal
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Checks if the given email is designated as a Super Admin in the environment config
 */
export function isSuperAdminEmail(email) {
  if (!email || typeof email !== "string") return false;
  const clean = email.trim().toLowerCase();
  return getSuperAdminEmails().includes(clean);
}

/**
 * Generates high-entropy cryptographic token for invitations
 */
export function generateInviteToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Normalizes permissions object according to role
 */
export function sanitizePermissions(rawPermissions = {}, role = "admin") {
  if (role === "superadmin") {
    return { ...SUPERADMIN_PERMISSIONS };
  }

  return {
    canModerateFeedback: Boolean(rawPermissions.canModerateFeedback),
    canManageUsers: Boolean(rawPermissions.canManageUsers),
    canViewAnalytics: Boolean(rawPermissions.canViewAnalytics),
    canPurgeCache: Boolean(rawPermissions.canPurgeCache),
  };
}
