import {
  parseGitHubUrl,
  fetchPullRequestDetails,
  fetchPullRequestFiles,
  analyzeGitHubPR,
  postPRComment,
  getGitHubActionWorkflowYaml,
} from "../services/github.js";

/**
 * POST /api/v1/github/inspect-pr
 * Inspects a GitHub PR URL and fetches its metadata & modified file list.
 */
export async function inspectPullRequest(req, res, next) {
  try {
    const { prUrl, token } = req.body || {};
    if (!prUrl) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PR_URL",
          message: "A valid GitHub PR URL is required (e.g. https://github.com/owner/repo/pull/123).",
        },
      });
    }

    const parsed = parseGitHubUrl(prUrl);
    if (parsed.type !== "pull") {
      return res.status(400).json({
        success: false,
        error: {
          code: "NOT_A_PULL_REQUEST",
          message: "The URL must point to a Pull Request (containing /pull/NUMBER).",
        },
      });
    }

    const [details, files] = await Promise.all([
      fetchPullRequestDetails({
        owner: parsed.owner,
        repo: parsed.repo,
        pullNumber: parsed.pullNumber,
        token,
      }),
      fetchPullRequestFiles({
        owner: parsed.owner,
        repo: parsed.repo,
        pullNumber: parsed.pullNumber,
        token,
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        pr: details,
        files,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/github/analyze-pr
 * Performs end-to-end ChangeLens AST Blast Radius Analysis on a GitHub PR.
 */
export async function analyzePullRequest(req, res, next) {
  try {
    const { prUrl, token, repoPath, maxDepth } = req.body || {};
    if (!prUrl) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PR_URL",
          message: "A valid GitHub PR URL is required.",
        },
      });
    }

    const userId = req.user?.id || null;
    const result = await analyzeGitHubPR({
      prUrl,
      token,
      repoPath,
      maxDepth: maxDepth ? Number(maxDepth) : 10,
      userId,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/github/post-comment
 * Posts or updates the ChangeLens Blast Radius Report on a GitHub PR.
 */
export async function postCommentToPullRequest(req, res, next) {
  try {
    const { owner, repo, pullNumber, token, analysisId, customMarkdown } = req.body || {};
    if (!token) {
      return res.status(400).json({
        success: false,
        error: {
          code: "TOKEN_REQUIRED",
          message: "GitHub Personal Access Token is required to post comments.",
        },
      });
    }
    if (!owner || !repo || !pullNumber) {
      return res.status(400).json({
        success: false,
        error: {
          code: "PR_PARAMS_REQUIRED",
          message: "Owner, repo, and pullNumber are required.",
        },
      });
    }

    const result = await postPRComment({
      owner,
      repo,
      pullNumber: Number(pullNumber),
      token,
      analysisId,
      customMarkdown,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/github/workflow-template
 * Returns standard `.github/workflows/changelens.yml` template.
 */
export async function getWorkflowTemplate(req, res) {
  const failOnCritical = req.query.failOnCritical !== "false";
  const failOnHigh = req.query.failOnHigh === "true";
  const nodeVersion = req.query.nodeVersion || "22";

  const yaml = getGitHubActionWorkflowYaml({
    failOnCritical,
    failOnHigh,
    nodeVersion,
  });

  res.status(200).json({
    success: true,
    data: {
      filename: ".github/workflows/changelens.yml",
      yaml,
    },
  });
}
