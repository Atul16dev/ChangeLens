import crypto from "node:crypto";
import { userRepository, toSafeUser, normalizeEmail } from "../db/user-repository.js";
import { otpRepository } from "../db/otp-repository.js";
import { hashPassword, verifyPassword } from "../services/hash.js";
import {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  generateResetToken,
  hashResetToken,
} from "../services/otp.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../services/email.js";
import {
  isGoogleAuthConfigured,
  getGoogleAuthUrl,
  verifyGoogleCode,
} from "../services/google-auth.js";

// Validation helper for password complexity
function validatePasswordStrength(password) {
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number.";
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return "Password must contain at least one special character.";
  }
  return null;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const authController = {
  /**
   * Register a new user
   */
  async register(req, res, next) {
    try {
      const { name, email, password, confirmPassword } = req.body || {};

      if (!name || typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Name must be at least 2 characters long." },
        });
      }

      const cleanEmail = normalizeEmail(email);
      if (!cleanEmail || !isValidEmail(cleanEmail)) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Please provide a valid email address." },
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Passwords do not match." },
        });
      }

      const passwordErr = validatePasswordStrength(password);
      if (passwordErr) {
        return res.status(400).json({
          success: false,
          error: { code: "WEAK_PASSWORD", message: passwordErr },
        });
      }

      const existingUser = await userRepository.findByEmail(cleanEmail);
      let user = null;

      if (existingUser) {
        if (existingUser.is_email_verified) {
          return res.status(409).json({
            success: false,
            error: {
              code: "EMAIL_ALREADY_EXISTS",
              message: "An account with this email address already exists. Please log in.",
            },
          });
        }
        // Unverified user registering again - update credentials and resend verification
        const passwordHash = await hashPassword(password);
        user = await userRepository.updateUnverifiedCredentials(existingUser.id, {
          name: name.trim(),
          passwordHash,
        });
      } else {
        const passwordHash = await hashPassword(password);
        user = await userRepository.create({
          name: name.trim(),
          email: cleanEmail,
          passwordHash,
          authProvider: "local",
          isEmailVerified: 0,
        });
      }

      // Generate 6-digit OTP
      const otp = generateOtp();
      const otpHash = hashOtp(otp);

      // Store challenge in DB
      await otpRepository.createChallenge({
        email: cleanEmail,
        purpose: "email_verification",
        otpHash,
      });

      // Send verification email
      await sendVerificationEmail({
        to: cleanEmail,
        name: user.name,
        otp,
      });

      return res.status(201).json({
        success: true,
        message: "Verification code sent to your email. Please verify within 5 minutes.",
        data: {
          email: cleanEmail,
          userId: user.id,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Verify email via 6-digit OTP
   */
  async verifyEmail(req, res, next) {
    try {
      const { email, otp } = req.body || {};

      const cleanEmail = normalizeEmail(email);
      if (!cleanEmail || !otp) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Email and verification code are required." },
        });
      }

      const cleanOtp = String(otp).trim();
      if (!/^\d{6}$/.test(cleanOtp)) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_OTP_FORMAT", message: "Verification code must be 6 digits." },
        });
      }

      const challenge = await otpRepository.findLatestActive(cleanEmail, "email_verification");
      if (!challenge || Date.now() > challenge.expires_at) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_OR_EXPIRED_OTP",
            message: "The verification code is invalid or has expired. Please request a new one.",
          },
        });
      }

      if (challenge.attempts_count >= 5) {
        await otpRepository.consume(challenge.id);
        return res.status(400).json({
          success: false,
          error: {
            code: "MAX_ATTEMPTS_EXCEEDED",
            message: "Too many failed attempts. Please request a new verification code.",
          },
        });
      }

      const isValid = verifyOtpHash(cleanOtp, challenge.otp_hash);
      if (!isValid) {
        await otpRepository.incrementAttempts(challenge.id);
        const remaining = 4 - challenge.attempts_count;
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_OTP",
            message: `Invalid verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : "Please request a new code."}`,
          },
        });
      }

      // Mark challenge consumed
      await otpRepository.consume(challenge.id);

      // Mark user as verified
      const user = await userRepository.findByEmail(cleanEmail);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: "USER_NOT_FOUND", message: "User account could not be found." },
        });
      }

      const updatedUser = await userRepository.updateVerification(user.id, true);

      // Session regeneration to prevent fixation
      req.session.regenerate((err) => {
        if (err) return next(err);
        req.session.userId = updatedUser.id;
        return res.status(200).json({
          success: true,
          message: "Email verified successfully.",
          data: {
            user: toSafeUser(updatedUser),
          },
        });
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Resend email verification OTP
   */
  async resendVerificationOtp(req, res, next) {
    try {
      const { email } = req.body || {};
      const cleanEmail = normalizeEmail(email);

      if (!cleanEmail || !isValidEmail(cleanEmail)) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Please provide a valid email address." },
        });
      }

      const user = await userRepository.findByEmail(cleanEmail);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: "USER_NOT_FOUND", message: "No account found with this email." },
        });
      }

      if (user.is_email_verified) {
        return res.status(400).json({
          success: false,
          error: { code: "ALREADY_VERIFIED", message: "This email address is already verified. Please log in." },
        });
      }

      const existingChallenge = await otpRepository.findLatestActive(cleanEmail, "email_verification");
      const now = Date.now();
      if (existingChallenge && now < existingChallenge.resend_available_at) {
        const remainingSeconds = Math.ceil((existingChallenge.resend_available_at - now) / 1000);
        return res.status(429).json({
          success: false,
          error: {
            code: "COOLDOWN_ACTIVE",
            message: `Please wait ${remainingSeconds} seconds before requesting a new code.`,
            retryAfter: remainingSeconds,
          },
        });
      }

      const otp = generateOtp();
      const otpHash = hashOtp(otp);

      await otpRepository.createChallenge({
        email: cleanEmail,
        purpose: "email_verification",
        otpHash,
      });

      await sendVerificationEmail({
        to: cleanEmail,
        name: user.name,
        otp,
      });

      return res.status(200).json({
        success: true,
        message: "A new verification code has been sent to your email.",
        data: { email: cleanEmail },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * User login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body || {};

      const cleanEmail = normalizeEmail(email);
      if (!cleanEmail || !password) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Email and password are required." },
        });
      }

      const user = await userRepository.findByEmail(cleanEmail);
      if (!user || !user.password_hash) {
        // Generic timing-safe error
        return res.status(401).json({
          success: false,
          error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." },
        });
      }

      const isPasswordValid = await verifyPassword(user.password_hash, password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." },
        });
      }

      if (!user.is_email_verified) {
        return res.status(403).json({
          success: false,
          error: {
            code: "EMAIL_NOT_VERIFIED",
            message: "Please verify your email address to log in.",
            email: cleanEmail,
          },
        });
      }

      // Rotate session on authentication
      req.session.regenerate((err) => {
        if (err) return next(err);
        req.session.userId = user.id;
        return res.status(200).json({
          success: true,
          message: "Logged in successfully.",
          data: {
            user: toSafeUser(user),
          },
        });
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * User logout
   */
  async logout(req, res, next) {
    try {
      if (!req.session) {
        res.clearCookie("changelens.sid");
        return res.status(200).json({ success: true, message: "Logged out successfully." });
      }

      req.session.destroy((err) => {
        if (err) {
          console.error("[Auth] Session destroy error:", err);
        }
        res.clearCookie("changelens.sid");
        return res.status(200).json({
          success: true,
          message: "Logged out successfully.",
        });
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get current authenticated user
   */
  async me(req, res) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Not authenticated." },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  },

  /**
   * Update profile information of authenticated user
   */
  async updateProfile(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Not authenticated." },
        });
      }

      const { name } = req.body || {};
      if (!name || typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Name must be at least 2 characters long." },
        });
      }

      if (name.trim().length > 100) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Name must not exceed 100 characters." },
        });
      }

      const updatedUser = await userRepository.updateProfile(req.user.id, {
        name: name.trim(),
      });

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          error: { code: "USER_NOT_FOUND", message: "User account not found." },
        });
      }

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully.",
        data: {
          user: toSafeUser(updatedUser),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Request password reset code
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body || {};
      const cleanEmail = normalizeEmail(email);

      if (!cleanEmail || !isValidEmail(cleanEmail)) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Please provide a valid email address." },
        });
      }

      const user = await userRepository.findByEmail(cleanEmail);
      // To prevent account enumeration, return success even if user does not exist
      if (!user) {
        return res.status(200).json({
          success: true,
          message: "If that email address is registered, a password reset code has been sent.",
        });
      }

      const existingChallenge = await otpRepository.findLatestActive(cleanEmail, "password_reset");
      const now = Date.now();
      if (existingChallenge && now < existingChallenge.resend_available_at) {
        const remainingSeconds = Math.ceil((existingChallenge.resend_available_at - now) / 1000);
        return res.status(429).json({
          success: false,
          error: {
            code: "COOLDOWN_ACTIVE",
            message: `Please wait ${remainingSeconds} seconds before requesting a new reset code.`,
            retryAfter: remainingSeconds,
          },
        });
      }

      const otp = generateOtp();
      const otpHash = hashOtp(otp);

      await otpRepository.createChallenge({
        email: cleanEmail,
        purpose: "password_reset",
        otpHash,
      });

      await sendPasswordResetEmail({
        to: cleanEmail,
        name: user.name,
        otp,
      });

      return res.status(200).json({
        success: true,
        message: "If that email address is registered, a password reset code has been sent.",
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Verify password reset OTP and receive single-use reset token
   */
  async verifyResetOtp(req, res, next) {
    try {
      const { email, otp } = req.body || {};
      const cleanEmail = normalizeEmail(email);

      if (!cleanEmail || !otp) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Email and reset code are required." },
        });
      }

      const cleanOtp = String(otp).trim();
      if (!/^\d{6}$/.test(cleanOtp)) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_OTP_FORMAT", message: "Reset code must be 6 digits." },
        });
      }

      const challenge = await otpRepository.findLatestActive(cleanEmail, "password_reset");
      if (!challenge || Date.now() > challenge.expires_at) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_OR_EXPIRED_OTP",
            message: "The reset code is invalid or has expired. Please request a new one.",
          },
        });
      }

      if (challenge.attempts_count >= 5) {
        await otpRepository.consume(challenge.id);
        return res.status(400).json({
          success: false,
          error: {
            code: "MAX_ATTEMPTS_EXCEEDED",
            message: "Too many failed attempts. Please request a new reset code.",
          },
        });
      }

      const isValid = verifyOtpHash(cleanOtp, challenge.otp_hash);
      if (!isValid) {
        await otpRepository.incrementAttempts(challenge.id);
        const remaining = 4 - challenge.attempts_count;
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_OTP",
            message: `Invalid reset code. ${remaining > 0 ? `${remaining} attempts remaining.` : "Please request a new code."}`,
          },
        });
      }

      // Generate single-use reset token and store hash in challenge (valid 15 mins)
      const resetToken = generateResetToken();
      const resetTokenHash = hashResetToken(resetToken);
      await otpRepository.setResetToken(challenge.id, resetTokenHash);

      return res.status(200).json({
        success: true,
        message: "Code verified successfully.",
        data: {
          resetToken,
          email: cleanEmail,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Reset password using single-use reset token
   */
  async resetPassword(req, res, next) {
    try {
      const { email, resetToken, newPassword, confirmPassword } = req.body || {};
      const cleanEmail = normalizeEmail(email);

      if (!cleanEmail || !resetToken || !newPassword) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Missing required fields." },
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Passwords do not match." },
        });
      }

      const passwordErr = validatePasswordStrength(newPassword);
      if (passwordErr) {
        return res.status(400).json({
          success: false,
          error: { code: "WEAK_PASSWORD", message: passwordErr },
        });
      }

      const tokenHash = hashResetToken(resetToken);
      const challenge = await otpRepository.findByResetTokenHash(tokenHash);

      if (!challenge || challenge.email.toLowerCase() !== cleanEmail) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_RESET_TOKEN",
            message: "Password reset session is invalid or has expired. Please start over.",
          },
        });
      }

      const user = await userRepository.findByEmail(cleanEmail);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: "USER_NOT_FOUND", message: "User account could not be found." },
        });
      }

      const newPasswordHash = await hashPassword(newPassword);
      await userRepository.updatePassword(user.id, newPasswordHash);

      // Consume challenge immediately
      await otpRepository.consume(challenge.id);

      // Invalidate all active sessions for this user across devices
      if (req.sessionStore && typeof req.sessionStore.destroyUserSessions === "function") {
        req.sessionStore.destroyUserSessions(user.id);
      }

      return res.status(200).json({
        success: true,
        message: "Password has been reset successfully. Please log in with your new password.",
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Initiate Google OAuth flow
   */
  async googleAuth(req, res, next) {
    try {
      if (!isGoogleAuthConfigured()) {
        return res.status(503).json({
          success: false,
          error: {
            code: "GOOGLE_AUTH_UNAVAILABLE",
            message: "Google OAuth is not configured on this server.",
          },
        });
      }

      const state = crypto.randomBytes(32).toString("hex");
      req.session.oauthState = state;

      const url = getGoogleAuthUrl(state);
      return res.redirect(url);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Handle Google OAuth Callback
   */
  async googleCallback(req, res, next) {
    try {
      const { code, state } = req.query || {};

      if (!state || state !== req.session?.oauthState) {
        return res.status(403).json({
          success: false,
          error: { code: "INVALID_OAUTH_STATE", message: "Invalid OAuth state parameter." },
        });
      }

      delete req.session.oauthState;

      const googleProfile = await verifyGoogleCode(code);
      const cleanEmail = normalizeEmail(googleProfile.email);

      let user = await userRepository.findByEmail(cleanEmail);

      if (user) {
        if (!user.google_id) {
          user = await userRepository.linkGoogleAccount(user.id, googleProfile.googleId);
        } else if (!user.is_email_verified) {
          user = await userRepository.updateVerification(user.id, true);
        }
      } else {
        user = await userRepository.create({
          name: googleProfile.name,
          email: cleanEmail,
          passwordHash: null,
          authProvider: "google",
          googleId: googleProfile.googleId,
          isEmailVerified: 1,
        });
      }

      req.session.regenerate((err) => {
        if (err) return next(err);
        req.session.userId = user.id;
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        return res.redirect(`${frontendUrl}/?auth=success`);
      });
    } catch (err) {
      next(err);
    }
  },
};
