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
} from "../controllers/analyses.controller.js";

const router = Router();

// Run new analysis
router.post("/analyze", runAnalysis);

// List recent analyses
router.get("/analyses", listAnalyses);

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
