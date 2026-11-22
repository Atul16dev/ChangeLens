import { Router } from "express";
import {
  requireAuth,
  requireAdmin,
  requireSuperAdmin,
  requireUserManagement,
  createRateLimiter,
} from "../middleware/auth.js";
import { adminController } from "../controllers/admin.controller.js";

export const adminRoutes = Router();

const inviteRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: "Too many admin invitation requests. Please wait a moment.",
});

/**
 * Admin Profile & Current Scope
 */
adminRoutes.get("/me", requireAuth, requireAdmin, adminController.getAdminMe);

/**
 * Super Admin Invitation Management
 */
adminRoutes.post("/invites", requireAuth, requireSuperAdmin, inviteRateLimiter, adminController.sendInvite);
adminRoutes.get("/invites", requireAuth, requireSuperAdmin, adminController.listInvites);
adminRoutes.delete("/invites/:id", requireAuth, requireSuperAdmin, adminController.revokeInvite);

/**
 * Public/Protected Invitation Acceptance
 */
adminRoutes.get("/invites/verify/:token", adminController.verifyInviteToken);
adminRoutes.post("/invites/accept", inviteRateLimiter, adminController.acceptInvite);

/**
 * Admin User Directory & Access Control
 */
adminRoutes.get("/users", requireAuth, requireAdmin, adminController.listUsers);
adminRoutes.patch("/users/:id/access", requireAuth, requireSuperAdmin, adminController.updateUserAccess);
adminRoutes.delete("/users/:id/access", requireAuth, requireSuperAdmin, adminController.revokeUserAccess);

/**
 * User Moderation & Forensic Reporting (Super Admin or Admin with canManageUsers)
 */
adminRoutes.post("/users/:id/ban", requireAuth, requireUserManagement, adminController.banUser);
adminRoutes.post("/users/:id/unban", requireAuth, requireUserManagement, adminController.unbanUser);
adminRoutes.get("/users/:id/activity", requireAuth, requireUserManagement, adminController.getUserActivity);
adminRoutes.post("/users/:id/notes", requireAuth, requireUserManagement, adminController.addUserNote);
