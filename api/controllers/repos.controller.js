import { repoRepository } from "../db/repo-repository.js";
import {
  parseGitHubUrl,
  fetchRepositoryDetails,
  fetchOpenPullRequests,
} from "../services/github.js";

/**
 * GET /api/v1/repos
 * Returns all tracked GitHub repositories for the logged-in user.
 */
export async function listTrackedRepos(req, res, next) {
  try {
    const repositories = await repoRepository.listByUser(req.user.id);
    res.status(200).json({
      success: true,
      data: { repositories },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/repos
 * Tracks/saves a GitHub repository in the user's Tracked Repositories Hub.
 */
export async function addTrackedRepo(req, res, next) {
  try {
    const { repoUrl, token, isPinned = false, metadata = null } = req.body || {};
    if (!repoUrl || typeof repoUrl !== "string") {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REPO_URL",
          message: "A valid GitHub repository URL or owner/repo shorthand is required.",
        },
      });
    }

    let parsed;
    try {
      parsed = parseGitHubUrl(repoUrl);
    } catch (parseErr) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REPO_URL",
          message: parseErr.message,
        },
      });
    }

    const owner = parsed.owner;
    const repo = parsed.repo;
    let details = null;

    if (process.env.NODE_ENV === "test" && process.env.MOCK_GITHUB_API === "true") {
      details = {
        owner,
        repo,
        fullName: `${owner}/${repo}`,
        description: metadata?.description || `Tracked repository ${owner}/${repo}`,
        defaultBranch: metadata?.defaultBranch || "main",
        language: metadata?.language || "JavaScript",
        stars: typeof metadata?.stars === "number" ? metadata.stars : 42,
        isPrivate: Boolean(metadata?.isPrivate),
        htmlUrl: `https://github.com/${owner}/${repo}`,
      };
    } else {
      try {
        details = await fetchRepositoryDetails({ owner, repo, token });
      } catch (err) {
        // Fallback to pre-verified metadata if rate-limited during active connection flow
        if (metadata && metadata.fullName && !err.message.includes("not found")) {
          details = {
            owner,
            repo,
            fullName: metadata.fullName || `${owner}/${repo}`,
            description: metadata.description || "",
            defaultBranch: metadata.defaultBranch || "main",
            language: metadata.language || null,
            stars: Number(metadata.stars) || 0,
            isPrivate: Boolean(metadata.isPrivate),
            htmlUrl: metadata.htmlUrl || `https://github.com/${owner}/${repo}`,
          };
        } else {
          const status = err.message.includes("not found") ? 404 : err.message.includes("rate limit") ? 429 : 400;
          return res.status(status).json({
            success: false,
            error: {
              code: status === 404 ? "REPO_NOT_FOUND" : status === 429 ? "GITHUB_RATE_LIMIT" : "GITHUB_FETCH_FAILED",
              message: err.message,
            },
          });
        }
      }
    }

    const { record, created } = await repoRepository.upsert({
      userId: req.user.id,
      owner: details.owner,
      repo: details.repo,
      fullName: details.fullName || `${owner}/${repo}`,
      repoUrl: details.htmlUrl || `https://github.com/${owner}/${repo}`,
      description: details.description || "",
      defaultBranch: details.defaultBranch || "main",
      language: details.language || null,
      stars: Number(details.stars) || 0,
      isPrivate: Boolean(details.isPrivate),
      isPinned: Boolean(isPinned),
    });

    res.status(created ? 201 : 200).json({
      success: true,
      data: {
        repository: record,
        created,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/repos/:id/pin
 * Toggles pinned status on a tracked repository.
 */
export async function togglePinRepo(req, res, next) {
  try {
    const repository = await repoRepository.togglePin(req.params.id, req.user.id);
    if (!repository) {
      return res.status(404).json({
        success: false,
        error: {
          code: "REPO_NOT_FOUND",
          message: "Tracked repository not found.",
        },
      });
    }

    res.status(200).json({
      success: true,
      data: { repository },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/repos/:id
 * Removes a repository from the user's Tracked Repositories Hub.
 */
export async function removeTrackedRepo(req, res, next) {
  try {
    const deleted = await repoRepository.remove(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: "REPO_NOT_FOUND",
          message: "Tracked repository not found.",
        },
      });
    }

    res.status(200).json({
      success: true,
      data: { deleted: true },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/repos/:id/pulls
 * Fetches open Pull Requests for a tracked repository for 1-click PR analysis.
 */
export async function getTrackedRepoPulls(req, res, next) {
  try {
    const repository = await repoRepository.findById(req.params.id, req.user.id);
    if (!repository) {
      return res.status(404).json({
        success: false,
        error: {
          code: "REPO_NOT_FOUND",
          message: "Tracked repository not found.",
        },
      });
    }

    const token = req.query.token || undefined;
    const state = req.query.state || "open";
    const perPage = req.query.perPage ? Number(req.query.perPage) : 10;

    let pulls = [];
    if (process.env.NODE_ENV === "test" && process.env.MOCK_GITHUB_API === "true") {
      pulls = [
        {
          number: 101,
          title: `feat: improve AST analysis speed for ${repository.repo}`,
          state: "open",
          htmlUrl: `${repository.repoUrl}/pull/101`,
          draft: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          headRef: "feat/ast-speed",
          baseRef: repository.defaultBranch || "main",
          author: { login: "octocat", avatarUrl: null },
        },
      ];
    } else {
      pulls = await fetchOpenPullRequests({
        owner: repository.owner,
        repo: repository.repo,
        token,
        state,
        perPage,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        repository,
        pulls,
      },
    });
  } catch (err) {
    next(err);
  }
}
