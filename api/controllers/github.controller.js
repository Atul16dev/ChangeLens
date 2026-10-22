import {
  parseGitHubUrl,
  fetchPullRequestDetails,
  fetchPullRequestFiles,
  analyzeGitHubPR,
  postPRComment,
  getGitHubActionWorkflowYaml,
  fetchRepositoryDetails,
  fetchLatestCommits,
  analyzeRepositorySync,
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

/**
 * POST /api/v1/github/connect-repo
 * Connects to a GitHub repository, fetches repo overview and recent commits.
 */
export async function connectRepository(req, res, next) {
  try {
    const { repoUrl, token } = req.body || {};
    if (!repoUrl) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REPO_URL",
          message: "A valid GitHub repository URL is required (e.g. https://github.com/owner/repo or owner/repo).",
        },
      });
    }

    const parsed = parseGitHubUrl(repoUrl);
    const [details, latestCommits] = await Promise.all([
      fetchRepositoryDetails({
        owner: parsed.owner,
        repo: parsed.repo,
        token,
      }),
      fetchLatestCommits({
        owner: parsed.owner,
        repo: parsed.repo,
        token,
        perPage: 10,
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        repo: details,
        latestCommits,
        currentSha: latestCommits.length > 0 ? latestCommits[0].sha : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/github/sync-commits
 * Synchronizes and computes blast radius for GitHub commits.
 * Supports:
 * - mode: "cumulative" (All pushes between baseSha and headSha)
 * - mode: "single" (Only specified commitSha or latest push)
 */
export async function syncRepositoryCommits(req, res, next) {
  try {
    const {
      repoUrl,
      token,
      mode = "cumulative",
      baseSha,
      headSha,
      commitSha,
      repoPath,
      maxDepth,
    } = req.body || {};

    if (!repoUrl) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REPO_URL",
          message: "A valid GitHub repository URL is required.",
        },
      });
    }

    const userId = req.user?.id || null;
    const result = await analyzeRepositorySync({
      repoUrl,
      token,
      mode,
      baseSha,
      headSha,
      commitSha,
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
 * GET /api/v1/github/repo-commits
 * Fetches fresh commit list for an active repository.
 */
export async function getRepositoryCommits(req, res, next) {
  try {
    const repoUrl = req.query.repoUrl;
    const token = req.query.token;
    const branch = req.query.branch;
    const perPage = req.query.perPage ? parseInt(req.query.perPage, 10) : 10;

    if (!repoUrl) {
      return res.status(400).json({
        success: false,
        error: {
          code: "REPO_URL_REQUIRED",
          message: "Repository URL query parameter is required.",
        },
      });
    }

    const parsed = parseGitHubUrl(repoUrl);
    const commits = await fetchLatestCommits({
      owner: parsed.owner,
      repo: parsed.repo,
      branch,
      token,
      perPage,
    });

    res.status(200).json({
      success: true,
      data: {
        commits,
      },
    });
  } catch (err) {
    next(err);
  }
}
