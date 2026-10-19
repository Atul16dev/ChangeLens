import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { requireAuth, createRateLimiter } from "../middleware/auth.js";

export const authRoutes = Router();

// Rate limiters for brute-force protection
const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  message: "Too many authentication attempts. Please try again after one minute.",
});

const otpLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many verification requests. Please try again after one minute.",
});

// Authentication endpoints
authRoutes.post("/register", authLimiter, authController.register);
authRoutes.post("/verify-email", otpLimiter, authController.verifyEmail);
authRoutes.post("/resend-verification-otp", otpLimiter, authController.resendVerificationOtp);
authRoutes.post("/login", authLimiter, authController.login);
authRoutes.post("/logout", authController.logout);
authRoutes.get("/me", requireAuth, authController.me);
authRoutes.patch("/profile", requireAuth, authController.updateProfile);

// Password recovery endpoints
authRoutes.post("/forgot-password", otpLimiter, authController.forgotPassword);
authRoutes.post("/verify-reset-otp", otpLimiter, authController.verifyResetOtp);
authRoutes.post("/reset-password", authLimiter, authController.resetPassword);

// Google OAuth
authRoutes.get("/google", authController.googleAuth);
authRoutes.get("/google/callback", authController.googleCallback);
