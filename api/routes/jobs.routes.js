import { Router } from "express";
import {
  getJobStatus,
  streamJobEvents,
  createAnalysisJob,
  listJobs,
} from "../controllers/jobs.controller.js";

const router = Router();

// Create new async analysis job
router.post("/analyze", createAnalysisJob);
router.post("/", createAnalysisJob);

// List recent jobs & queue metrics
router.get("/", listJobs);

// SSE streaming endpoint for real-time progress
router.get("/:jobId/events", streamJobEvents);

// Get single job status & progress
router.get("/:jobId", getJobStatus);

export const jobsRoutes = router;
