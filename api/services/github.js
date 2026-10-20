import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { performAnalysis } from "../controllers/analyses.controller.js";
import { formatPRMarkdownComment, calculateRiskLevel } from "../../analyzer/ai-explainer.js";
import { analysesStore } from "../store.js";

const execAsync = promisify(exec);

/**
 * Parses GitHub URLs into structured components.
 * Supports:
 * - https://github.com/owner/repo/pull/123
 * - https://github.com/owner/repo/pull/123/files
 * - github.com/owner/repo/pull/123
 * - owner/repo#123
 * - https://github.com/owner/repo
 */
export function parseGitHubUrl(input) {
  if (!input || typeof input !== "string") {
    throw new Error("GitHub URL or reference is required.");
  }

  const clean = input.trim();

  // Pattern: owner/repo#123
  const hashMatch = clean.match(/^([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)#(\d+)$/);
  if (hashMatch) {
    return {
      type: "pull",
      owner: hashMatch[1],
      repo: hashMatch[2],
      pullNumber: parseInt(hashMatch[3], 10),
      rawUrl: `https://github.com/${hashMatch[1]}/${hashMatch[2]}/pull/${hashMatch[3]}`,
    };
  }

  // Pattern: https://github.com/owner/repo/pull/123...
  const pullMatch = clean.match(/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)\/pull\/(\d+)/i);
  if (pullMatch) {
    return {
      type: "pull",
      owner: pullMatch[1],
      repo: pullMatch[2],
      pullNumber: parseInt(pullMatch[3], 10),
      rawUrl: `https://github.com/${pullMatch[1]}/${pullMatch[2]}/pull/${pullMatch[3]}`,
    };
  }

  // Pattern: https://github.com/owner/repo...
  const repoMatch = clean.match(/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)(\/|$)/i);
  if (repoMatch) {
    return {
      type: "repo",
      owner: repoMatch[1],
      repo: repoMatch[2].replace(/\.git$/i, ""),
      pullNumber: null,
      rawUrl: `https://github.com/${repoMatch[1]}/${repoMatch[2].replace(/\.git$/i, "")}`,
    };
  }

  throw new Error("Invalid GitHub URL. Please provide a PR link (e.g., https://github.com/owner/repo/pull/42) or repository URL.");
}

/**
 * Builds standard GitHub REST API headers with optional Auth token.
 */
function buildGitHubHeaders(token) {
  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "ChangeLens-SaaS-Connector/1.0",
  };
  if (token && typeof token === "string" && token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }
  return headers;
}

/**
 * Fetches pull request overview from GitHub API.
 */
export async function fetchPullRequestDetails({ owner, repo, pullNumber, token }) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`;
  const response = await fetch(apiUrl, {
    headers: buildGitHubHeaders(token),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`GitHub PR not found: ${owner}/${repo}#${pullNumber}. Verify the repository and PR number.`);
    }
    if (response.status === 403 || response.status === 429) {
      throw new Error("GitHub API rate limit exceeded or access forbidden. Please provide a GitHub Personal Access Token.");
    }
    const errText = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${errText}`);
  }

  const data = await response.json();

  return {
    owner,
    repo,
    number: data.number,
    title: data.title,
    body: data.body || "",
    state: data.state,
    htmlUrl: data.html_url,
    diffUrl: data.diff_url,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    author: {
      login: data.user?.login || "anonymous",
      avatarUrl: data.user?.avatar_url || null,
      htmlUrl: data.user?.html_url || null,
    },
    base: {
      ref: data.base?.ref,
      sha: data.base?.sha,
      repoFullName: data.base?.repo?.full_name,
    },
    head: {
      ref: data.head?.ref,
      sha: data.head?.sha,
      repoFullName: data.head?.repo?.full_name,
      cloneUrl: data.head?.repo?.clone_url,
    },
    changedFilesCount: data.changed_files || 0,
    additions: data.additions || 0,
    deletions: data.deletions || 0,
    mergeable: data.mergeable,
  };
}

/**
 * Fetches changed files list from GitHub PR files endpoint.
 */
export async function fetchPullRequestFiles({ owner, repo, pullNumber, token }) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/files?per_page=100`;
  const response = await fetch(apiUrl, {
    headers: buildGitHubHeaders(token),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to fetch PR changed files (${response.status}): ${errText}`);
  }

  const rawFiles = await response.json();
  if (!Array.isArray(rawFiles)) {
    return [];
  }

  return rawFiles.map((f) => {
    let statusCode = "M";
    if (f.status === "added") statusCode = "A";
    else if (f.status === "removed") statusCode = "D";
    else if (f.status === "renamed") statusCode = "R";

    return {
      path: f.filename.split("\\").join("/"),
      oldPath: f.previous_filename ? f.previous_filename.split("\\").join("/") : null,
      status: f.status,
      statusCode,
      additions: f.additions || 0,
      deletions: f.deletions || 0,
      changes: f.changes || 0,
      patch: f.patch || "",
      rawUrl: f.raw_url || null,
    };
  });
}

/**
 * Analyzes a GitHub PR by inspecting files and computing AST Blast Radius.
 */
export async function analyzeGitHubPR({ prUrl, token, repoPath, maxDepth = 10, userId = null }) {
  const parsed = parseGitHubUrl(prUrl);
  if (parsed.type !== "pull") {
    throw new Error("URL must point to a specific pull request (e.g. https://github.com/owner/repo/pull/123)");
  }

  // 1. Fetch PR details and files list
  const prDetails = await fetchPullRequestDetails({
    owner: parsed.owner,
    repo: parsed.repo,
    pullNumber: parsed.pullNumber,
    token,
  });

  const prFiles = await fetchPullRequestFiles({
    owner: parsed.owner,
    repo: parsed.repo,
    pullNumber: parsed.pullNumber,
    token,
  });

  // Extract changed paths for blast radius inspection
  const changedPaths = prFiles.map((f) => f.path);

  // 2. Perform end-to-end AST Blast Radius Analysis
  // If repoPath is provided, use it; otherwise, use local workspace / sample fixture
  const targetDir = repoPath || path.resolve(process.cwd(), "tests/fixtures/mern-sample");

  const analysisRecord = await performAnalysis(
    {
      repoPath: targetDir,
      changedFiles: changedPaths,
      maxDepth,
    },
    userId
  );

  // 3. Attach GitHub PR metadata to the saved analysis record
  analysisRecord.githubPR = {
    owner: prDetails.owner,
    repo: prDetails.repo,
    pullNumber: prDetails.number,
    title: prDetails.title,
    author: prDetails.author,
    htmlUrl: prDetails.htmlUrl,
    baseRef: prDetails.base.ref,
    headRef: prDetails.head.ref,
    headSha: prDetails.head.sha,
    changedFilesCount: prDetails.changedFilesCount,
    additions: prDetails.additions,
    deletions: prDetails.deletions,
    files: prFiles,
  };

  // Re-save updated analysis with GitHub metadata
  await analysesStore.save(analysisRecord.analysisId, analysisRecord, userId);

  return {
    analysisId: analysisRecord.analysisId,
    prDetails,
    changedFiles: prFiles,
    summary: analysisRecord.summary,
    coverage: analysisRecord.coverage,
    impactAnalysis: analysisRecord.impactAnalysis,
  };
}

/**
 * Posts or updates a GitHub PR comment with the ChangeLens Blast Radius Report.
 */
export async function postPRComment({ owner, repo, pullNumber, token, analysisId, customMarkdown }) {
  if (!token) {
    throw new Error("GitHub Personal Access Token (PAT) is required to post PR comments.");
  }

  let markdown = customMarkdown;

  if (!markdown && analysisId) {
    const analysis = await analysesStore.get(analysisId);
    if (!analysis) {
      throw new Error(`Analysis "${analysisId}" not found.`);
    }

    const { summary, impactAnalysis } = analysis;
    const explanation = {
      summary: summary || {},
      explanation: `Automated ChangeLens Blast Radius evaluation for PR #${pullNumber}.`,
      findings: impactAnalysis?.allFindings || [],
      riskLevel: calculateRiskLevel(summary),
      suggestedTests: [
        "npm test",
        ...(impactAnalysis?.allFindings || [])
          .filter((f) => f.affectedFile && f.affectedFile.includes("test"))
          .map((f) => `npm test ${f.affectedFile}`),
      ],
      brokenSymbols: impactAnalysis?.brokenSymbols || [],
    };

    markdown = formatPRMarkdownComment(explanation, analysisId, impactAnalysis);
  }

  if (!markdown) {
    throw new Error("No markdown content to post as PR comment.");
  }

  const marker = "<!-- changelens-impact-report -->";
  const bodyContent = `${marker}\n${markdown}`;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${pullNumber}/comments`;

  const headers = {
    Authorization: `Bearer ${token.trim()}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "ChangeLens-SaaS-Connector/1.0",
    "Content-Type": "application/json",
  };

  // 1. Check for existing comment to avoid duplicate spam
  const listRes = await fetch(apiUrl, { headers });
  if (listRes.ok) {
    const existing = await listRes.json();
    if (Array.isArray(existing)) {
      const prev = existing.find((c) => c.body && c.body.includes(marker));
      if (prev) {
        const updateRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/comments/${prev.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ body: bodyContent }),
        });
        if (updateRes.ok) {
          const updatedData = await updateRes.json();
          return {
            success: true,
            action: "updated",
            commentId: prev.id,
            commentUrl: updatedData.html_url,
          };
        }
      }
    }
  }

  // 2. Otherwise create fresh comment
  const createRes = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ body: bodyContent }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`GitHub comment creation failed (${createRes.status}): ${errText}`);
  }

  const createdData = await createRes.json();
  return {
    success: true,
    action: "created",
    commentId: createdData.id,
    commentUrl: createdData.html_url,
  };
}

/**
 * Returns GitHub Actions Workflow YAML configuration.
 */
export function getGitHubActionWorkflowYaml({
  failOnCritical = true,
  failOnHigh = false,
  nodeVersion = "22",
} = {}) {
  const flags = [];
  if (failOnCritical) flags.push("--fail-on-critical");
  if (failOnHigh) flags.push("--fail-on-high");
  flags.push("--comment");

  const flagStr = flags.join(" ");

  return `name: "ChangeLens Blast Radius Impact Analysis"

on:
  pull_request:
    branches: [ main, master, develop ]

permissions:
  contents: read
  pull-requests: write

jobs:
  impact-analysis:
    name: "AST Blast Radius Check"
    runs-on: ubuntu-latest
    steps:
      - name: "Checkout repository"
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: "Setup Node.js environment"
        uses: actions/setup-node@v4
        with:
          node-version: "${nodeVersion}"

      - name: "Run ChangeLens CI Blast Radius Inspection"
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          npx changelens-ci \\
            --base=origin/\${{ github.base_ref }} \\
            ${flagStr}
`;
}
