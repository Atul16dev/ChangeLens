import express from "express";
import {
  submitFeedback,
  getMyFeedback,
  getPublicFeedback,
  getFeedbackStats,
  getAnalysisRating,
} from "../controllers/feedback.controller.js";
import { requireAuth, createRateLimiter } from "../middleware/auth.js";

const router = express.Router();

const feedbackRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: "Too many feedback submissions. Please try again in a few minutes.",
});

router.post("/", feedbackRateLimiter, submitFeedback);
router.get("/mine", requireAuth, getMyFeedback);
router.get("/public", getPublicFeedback);
router.get("/stats", getFeedbackStats);
router.get("/analysis/:analysisId", getAnalysisRating);

export const feedbackRoutes = router;
