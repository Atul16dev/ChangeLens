import { Router } from "express";
import {
  inspectPullRequest,
  analyzePullRequest,
  postCommentToPullRequest,
  getWorkflowTemplate,
  connectRepository,
  syncRepositoryCommits,
  getRepositoryCommits,
} from "../controllers/github.controller.js";

const router = Router();

// Connect to a direct GitHub repository & fetch overview + commits
router.post("/connect-repo", connectRepository);

// Synchronize repository commits and compute blast radius (cumulative or single)
router.post("/sync-commits", syncRepositoryCommits);

// Fetch fresh commits for a connected repository
router.get("/repo-commits", getRepositoryCommits);

// Inspect GitHub PR metadata and modified file list
router.post("/inspect-pr", inspectPullRequest);

// Run full ChangeLens AST Blast Radius Analysis on a PR
router.post("/analyze-pr", analyzePullRequest);

// Post ChangeLens report comment directly to GitHub PR
router.post("/post-comment", postCommentToPullRequest);

// Get .github/workflows/changelens.yml template
router.get("/workflow-template", getWorkflowTemplate);

export const githubRoutes = router;
