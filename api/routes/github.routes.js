import { Router } from "express";
import {
  inspectPullRequest,
  analyzePullRequest,
  postCommentToPullRequest,
  getWorkflowTemplate,
} from "../controllers/github.controller.js";

const router = Router();

// Inspect GitHub PR metadata and modified file list
router.post("/inspect-pr", inspectPullRequest);

// Run full ChangeLens AST Blast Radius Analysis on a PR
router.post("/analyze-pr", analyzePullRequest);

// Post ChangeLens report comment directly to GitHub PR
router.post("/post-comment", postCommentToPullRequest);

// Get .github/workflows/changelens.yml template
router.get("/workflow-template", getWorkflowTemplate);

export const githubRoutes = router;
