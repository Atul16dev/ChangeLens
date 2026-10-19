import { Router } from "express";
import {
  runAnalysis,
  getAnalysis,
  getAnalysisGraph,
  getAnalysisImpact,
  getAnalysisExplanation,
  handleAnalysisChat,
  simulateAnalysisImpact,
  listAnalyses,
  getAnalysisHistory,
  deleteAnalysisRecord,
  toggleAnalysisPin,
} from "../controllers/analyses.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Run new analysis
router.post("/analyze", runAnalysis);

// List user analysis history (search, pagination)
router.get("/analyses/history", requireAuth, getAnalysisHistory);

// List recent analyses
router.get("/analyses", listAnalyses);

// Toggle/set pin status of an analysis record (prevents 30-day auto-deletion)
router.patch("/analyses/:id/pin", requireAuth, toggleAnalysisPin);

// Delete an analysis record (owner only)
router.delete("/analyses/:id", requireAuth, deleteAnalysisRecord);

// Get analysis details by ID
router.get("/analyses/:id", getAnalysis);

// Get React Flow graph data for visual dashboard
router.get("/analyses/:id/graph", getAnalysisGraph);

// Get impact findings and recommendations
router.get("/analyses/:id/impact", getAnalysisImpact);

// Get AI explanation, risk score, and PR comment markdown
router.get("/analyses/:id/explain", getAnalysisExplanation);

// Context-aware AI Chatbot query
router.post("/analyses/:id/chat", handleAnalysisChat);

// What-If live blast radius simulation on an arbitrary file
router.post("/analyses/:id/simulate", simulateAnalysisImpact);

export const analysesRoutes = router;
