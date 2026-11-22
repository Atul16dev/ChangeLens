import { userRepository, toSafeUser, normalizeEmail } from "../db/user-repository.js";
import { adminInvitationRepository } from "../db/admin-invitation-repository.js";
import {
  generateInviteToken,
  sanitizePermissions,
  isSuperAdminEmail,
} from "../services/admin-auth.js";
import { sendAdminInvitationEmail } from "../services/email.js";
import { analysesStore } from "../store.js";
import { feedbackRepository } from "../db/feedback-repository.js";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Checks hierarchy permissions between operator and target user
 */
function canManageTarget(operator, targetUser) {
  if (operator.id === targetUser.id) {
    return {
      allowed: false,
      code: "CANNOT_MANAGE_SELF",
      message: "You cannot perform moderation or disciplinary actions on your own account.",
    };
  }

  if (operator.role === "superadmin") {
    return { allowed: true };
  }

  if (operator.role === "admin" && operator.permissions?.canManageUsers) {
    if (targetUser.role === "admin" || targetUser.role === "superadmin") {
      return {
        allowed: false,
        code: "FORBIDDEN_STAFF_MODERATION",
        message: "Admins cannot ban or modify another staff member. Only Super Admins hold staff authority.",
      };
    }
    return { allowed: true };
  }

  return {
    allowed: false,
    code: "FORBIDDEN_USER_MANAGEMENT_REQUIRED",
    message: "You do not have 'canManageUsers' permission to perform this action.",
  };
}

export const adminController = {
  /**
   * Returns current admin profile, role and accessibility permissions
   */
  async getAdminMe(req, res) {
    return res.status(200).json({
      success: true,
      data: {
        user: req.user,
        isSuperAdmin: req.user.role === "superadmin",
        permissions: req.user.permissions || {},
      },
    });
  },

  /**
   * Super Admin sends an invitation for Admin or Super Admin role
   */
  async sendInvite(req, res, next) {
    try {
      const { email, role = "admin", permissions = {}, expiresInHours = 72 } = req.body || {};

      const cleanEmail = normalizeEmail(email);
      if (!cleanEmail || !isValidEmail(cleanEmail)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "A valid email address is required to send an admin invitation.",
            requestId: req.id,
          },
        });
      }

      const targetRole = role === "superadmin" ? "superadmin" : "admin";

      // Check if target user already holds this or higher role
      const existingUser = await userRepository.findByEmail(cleanEmail);
      if (existingUser) {
        if (existingUser.role === targetRole) {
          return res.status(400).json({
            success: false,
            error: {
              code: "USER_ALREADY_HAS_ROLE",
              message: `User ${cleanEmail} is already active as a ${targetRole}.`,
              requestId: req.id,
            },
          });
        }
      }

      const token = generateInviteToken();
      const sanitizedPerms = sanitizePermissions(permissions, targetRole);

      const invitation = await adminInvitationRepository.create({
        email: cleanEmail,
        role: targetRole,
        permissions: sanitizedPerms,
        token,
        invitedBy: {
          userId: req.user.id,
          name: req.user.name,
          email: req.user.email,
        },
        expiresInHours: Math.max(1, Math.min(720, parseInt(expiresInHours, 10) || 72)),
      });

      const frontendBase =
        process.env.FRONTEND_URL ||
        process.env.FRONTEND_ORIGIN ||
        "http://localhost:5173";
      const inviteUrl = `${frontendBase}/admin/invite/accept?token=${token}`;

      // Asynchronously attempt to send invitation email
      try {
        await sendAdminInvitationEmail({
          to: cleanEmail,
          inviterName: req.user.name,
          role: targetRole,
          inviteUrl,
          expiresAt: invitation.expires_at,
        });
      } catch (mailErr) {
        console.warn("[AdminController] Could not send invite email, token created:", mailErr.message);
      }

      return res.status(201).json({
        success: true,
        message: `Invitation to become ${targetRole} successfully created for ${cleanEmail}.`,
        data: {
          invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            permissions: invitation.permissions,
            status: invitation.status,
            expires_at: invitation.expires_at,
            created_at: invitation.created_at,
          },
          token,
          inviteUrl,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Super Admin lists invitations with pagination and status filters
   */
  async listInvites(req, res, next) {
    try {
      const { status = "", page = 1, limit = 50 } = req.query || {};
      const result = await adminInvitationRepository.list({ status, page, limit });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Super Admin revokes a pending invitation
   */
  async revokeInvite(req, res, next) {
    try {
      const { id } = req.params;
      const invite = await adminInvitationRepository.findById(id);

      if (!invite) {
        return res.status(404).json({
          success: false,
          error: {
            code: "INVITATION_NOT_FOUND",
            message: "Invitation record not found.",
            requestId: req.id,
          },
        });
      }

      if (invite.status === "accepted") {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVITATION_ALREADY_ACCEPTED",
            message: "Cannot revoke an invitation that has already been accepted. Modify user access directly instead.",
            requestId: req.id,
          },
        });
      }

      const revoked = await adminInvitationRepository.revoke(id);

      return res.status(200).json({
        success: true,
        message: "Invitation has been successfully revoked.",
        data: { invitation: revoked },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Public/Protected: verify an invitation token before accepting
   */
  async verifyInviteToken(req, res, next) {
    try {
      const { token } = req.params;
      const invite = await adminInvitationRepository.findByToken(token);

      if (!invite || invite.status !== "pending") {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_OR_EXPIRED_TOKEN",
            message: "This invitation link is invalid, expired, or has already been used.",
            requestId: req.id,
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          valid: true,
          email: invite.email,
          role: invite.role,
          permissions: invite.permissions,
          invited_by: invite.invited_by,
          expires_at: invite.expires_at,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Accepts invitation and upgrades user role and permissions
   */
  async acceptInvite(req, res, next) {
    try {
      const { token } = req.body || {};

      if (!token || typeof token !== "string") {
        return res.status(400).json({
          success: false,
          error: {
            code: "TOKEN_REQUIRED",
            message: "Invitation token is required.",
            requestId: req.id,
          },
        });
      }

      const invite = await adminInvitationRepository.findByToken(token);

      if (!invite || invite.status !== "pending") {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_OR_EXPIRED_TOKEN",
            message: "This invitation link is invalid, expired, or has already been used.",
            requestId: req.id,
          },
        });
      }

      // Check if user is logged in
      if (!req.user) {
        return res.status(200).json({
          success: true,
          data: {
            needsAuth: true,
            email: invite.email,
            role: invite.role,
            message: `Please log in or sign up with ${invite.email} to activate your ${invite.role} access.`,
          },
        });
      }

      // Ensure the logged in user matches the invited email
      if (normalizeEmail(req.user.email) !== normalizeEmail(invite.email)) {
        return res.status(403).json({
          success: false,
          error: {
            code: "EMAIL_MISMATCH",
            message: `This invitation was issued for ${invite.email}. You are currently logged in as ${req.user.email}.`,
            requestId: req.id,
          },
        });
      }

      // Upgrade user role and permissions
      const updatedUser = await userRepository.updateRoleAndPermissions(req.user.id, {
        role: invite.role,
        permissions: invite.permissions,
      });

      // Mark invitation as accepted
      await adminInvitationRepository.markAccepted(invite.id, req.user.id);

      return res.status(200).json({
        success: true,
        message: `Congratulations! You have been granted ${invite.role} privileges on ChangeLens.`,
        data: {
          user: toSafeUser(updatedUser),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Lists all users in the system (Admins and Super Admins)
   */
  async listUsers(req, res, next) {
    try {
      const { page = 1, limit = 50, search = "", role = "", status = "" } = req.query || {};
      const result = await userRepository.listUsers({ page, limit, search, role, status });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Super Admin updates role and accessibility permissions of any user
   */
  async updateUserAccess(req, res, next) {
    try {
      const { id } = req.params;
      const { role, permissions } = req.body || {};

      const targetUser = await userRepository.findById(id);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found.",
            requestId: req.id,
          },
        });
      }

      // Prevent Super Admin from demoting themselves
      if (targetUser.id === req.user.id && role && role !== "superadmin") {
        return res.status(400).json({
          success: false,
          error: {
            code: "CANNOT_DEMOTE_SELF",
            message: "You cannot demote your own Super Admin account.",
            requestId: req.id,
          },
        });
      }

      const updatedUser = await userRepository.updateRoleAndPermissions(id, {
        role: role || targetUser.role,
        permissions: permissions || targetUser.permissions,
      });

      return res.status(200).json({
        success: true,
        message: `Accessibility privileges for ${targetUser.email} updated successfully.`,
        data: {
          user: toSafeUser(updatedUser),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Super Admin revokes admin access (demoting back to standard user)
   */
  async revokeUserAccess(req, res, next) {
    try {
      const { id } = req.params;

      const targetUser = await userRepository.findById(id);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found.",
            requestId: req.id,
          },
        });
      }

      if (targetUser.id === req.user.id) {
        return res.status(400).json({
          success: false,
          error: {
            code: "CANNOT_DEMOTE_SELF",
            message: "You cannot revoke your own Super Admin access.",
            requestId: req.id,
          },
        });
      }

      const updatedUser = await userRepository.updateRoleAndPermissions(id, {
        role: "user",
        permissions: {},
      });

      return res.status(200).json({
        success: true,
        message: `Admin access for ${targetUser.email} has been revoked. Account is now a standard user.`,
        data: {
          user: toSafeUser(updatedUser),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Ban / Suspend a user account (Super Admin or Admin with canManageUsers)
   */
  async banUser(req, res, next) {
    try {
      const { id } = req.params;
      const { reason = "Violation of platform policies" } = req.body || {};

      const targetUser = await userRepository.findById(id);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found.",
            requestId: req.id,
          },
        });
      }

      if (targetUser.status === "banned") {
        return res.status(400).json({
          success: false,
          error: {
            code: "USER_ALREADY_BANNED",
            message: `User ${targetUser.email} is already suspended.`,
            requestId: req.id,
          },
        });
      }

      const check = canManageTarget(req.user, targetUser);
      if (!check.allowed) {
        return res.status(403).json({
          success: false,
          error: {
            code: check.code,
            message: check.message,
            requestId: req.id,
          },
        });
      }

      const updatedUser = await userRepository.banUser(id, {
        reason: reason.trim() || "Violation of platform policies",
        bannedBy: {
          userId: req.user.id,
          name: req.user.name,
          email: req.user.email,
        },
      });

      return res.status(200).json({
        success: true,
        message: `User account ${targetUser.email} has been suspended.`,
        data: {
          user: toSafeUser(updatedUser),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Unban / Reactivate a suspended user account (Super Admin or Admin with canManageUsers)
   */
  async unbanUser(req, res, next) {
    try {
      const { id } = req.params;

      const targetUser = await userRepository.findById(id);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found.",
            requestId: req.id,
          },
        });
      }

      if (targetUser.status !== "banned") {
        return res.status(400).json({
          success: false,
          error: {
            code: "USER_NOT_BANNED",
            message: `User ${targetUser.email} is not suspended.`,
            requestId: req.id,
          },
        });
      }

      const check = canManageTarget(req.user, targetUser);
      if (!check.allowed) {
        return res.status(403).json({
          success: false,
          error: {
            code: check.code,
            message: check.message,
            requestId: req.id,
          },
        });
      }

      const updatedUser = await userRepository.unbanUser(id);

      return res.status(200).json({
        success: true,
        message: `User account ${targetUser.email} has been reactivated.`,
        data: {
          user: toSafeUser(updatedUser),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get complete user activity dossier (analyses count, feedbacks, reports, notes)
   */
  async getUserActivity(req, res, next) {
    try {
      const { id } = req.params;

      const targetUser = await userRepository.findById(id);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found.",
            requestId: req.id,
          },
        });
      }

      const [analysesResult, feedbackItems] = await Promise.all([
        analysesStore.listByUser(id, { limit: 50 }).catch(() => ({ analyses: [], total: 0 })),
        feedbackRepository.listByUser(id, { limit: 50 }).catch(() => []),
      ]);

      const analysesList = analysesResult.analyses || [];
      const totalAnalyses = analysesResult.total || analysesList.length;
      const highRiskAnalyses = analysesList.filter(
        (a) => a.riskLevel === "HIGH" || (a.riskScore !== undefined && a.riskScore >= 70)
      ).length;

      const lastActive =
        analysesList[0]?.createdAt ||
        targetUser.updated_at ||
        targetUser.created_at;

      return res.status(200).json({
        success: true,
        data: {
          user: toSafeUser(targetUser),
          metrics: {
            totalAnalyses,
            highRiskAnalyses,
            feedbackCount: feedbackItems.length,
            lastActive,
          },
          recentAnalyses: analysesList.slice(0, 5),
          recentFeedback: feedbackItems.slice(0, 5),
          adminNotes: targetUser.admin_notes || [],
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Add internal staff note to a user profile
   */
  async addUserNote(req, res, next) {
    try {
      const { id } = req.params;
      const { text } = req.body || {};

      if (!text || typeof text !== "string" || !text.trim()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Note text cannot be empty.",
            requestId: req.id,
          },
        });
      }

      const targetUser = await userRepository.findById(id);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found.",
            requestId: req.id,
          },
        });
      }

      const updatedUser = await userRepository.addAdminNote(id, {
        text: text.trim(),
        authorId: req.user.id,
        authorName: req.user.name || req.user.email,
      });

      return res.status(201).json({
        success: true,
        message: "Staff note added successfully.",
        data: {
          user: toSafeUser(updatedUser),
          adminNotes: updatedUser.admin_notes || [],
        },
      });
    } catch (err) {
      next(err);
    }
  },
};
