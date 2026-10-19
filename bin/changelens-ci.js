#!/usr/bin/env node

/**
 * ChangeLens CI - Automated Pull Request Impact Analysis Runner
 * 
 * Inspects Git branch diffs, calculates AST dependency blast radiuses,
 * detects breaking imports, outputs GitHub Flavored Markdown reports,
 * and posts/updates PR review comments in GitHub Actions.
 */

import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { isGitRepository, getWorkingTreeChanges, getCommitDiff } from "../analyzer/local-git.js";
import { scanRepository } from "../analyzer/repository-scanner.js";
import { resolveRepositoryDependencies } from "../analyzer/dependency-resolver.js";
import { buildDependencyGraph } from "../analyzer/dependency-graph.js";
import { classifyImpactPolicies, IMPACT_SEVERITY } from "../analyzer/change-classifier.js";
import { calculateRiskLevel, formatPRMarkdownComment, generateImpactExplanation } from "../analyzer/ai-explainer.js";

export function parseCliArgs(argv = process.argv.slice(2)) {
  const options = {
    targetDir: process.cwd(),
    baseRef: null,
    failOnCritical: false,
    failOnHigh: false,
    outputFile: null,
    json: false,
    quiet: false,
    comment: false,
    files: null,
  };

  for (const arg of argv) {
    if (arg === "--fail-on-critical") {
      options.failOnCritical = true;
    } else if (arg === "--fail-on-high") {
      options.failOnHigh = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--quiet") {
      options.quiet = true;
    } else if (arg === "--comment" || arg === "--post-pr-comment") {
      options.comment = true;
    } else if (arg.startsWith("--base=")) {
      options.baseRef = arg.split("=")[1].trim();
    } else if (arg.startsWith("--repo=")) {
      options.targetDir = path.resolve(arg.split("=")[1].trim());
    } else if (arg.startsWith("--output-file=")) {
      options.outputFile = path.resolve(arg.split("=")[1].trim());
    } else if (arg.startsWith("--files=")) {
      options.files = arg
        .split("=")[1]
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);
    } else if (!arg.startsWith("--")) {
      options.targetDir = path.resolve(arg);
    }
  }

  // Default baseRef in GitHub Actions PR workflow
  if (!options.baseRef && process.env.GITHUB_BASE_REF) {
    options.baseRef = `origin/${process.env.GITHUB_BASE_REF}`;
  }

  return options;
}

/**
 * Posts or updates a comment on a GitHub Pull Request using GitHub REST API.
 */
export async function postOrUpdatePRComment({ markdown, githubToken, repository, prNumber }) {
  if (!githubToken || !repository || !prNumber) {
    return { success: false, reason: "Missing GITHUB_TOKEN, repository, or PR number" };
  }

  const marker = "<!-- changelens-impact-report -->";
  const bodyContent = `${marker}\n${markdown}`;
  const apiUrl = `https://api.github.com/repos/${repository}/issues/${prNumber}/comments`;
  const headers = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "ChangeLens-CI-Action",
    "Content-Type": "application/json",
  };

  try {
    // 1. Check for existing comment created by ChangeLens to avoid comment spam
    const listRes = await fetch(apiUrl, { headers });
    if (listRes.ok) {
      const existingComments = await listRes.json();
      const previousComment = Array.isArray(existingComments)
        ? existingComments.find((c) => c.body && c.body.includes(marker))
        : null;

      if (previousComment) {
        // Update previous comment
        const updateUrl = `https://api.github.com/repos/${repository}/issues/comments/${previousComment.id}`;
        const updateRes = await fetch(updateUrl, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ body: bodyContent }),
        });
        if (updateRes.ok) {
          return { success: true, action: "updated", commentId: previousComment.id };
        }
      }
    }

    // 2. Otherwise create a new comment
    const createRes = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ body: bodyContent }),
    });

    if (!createRes.ok) {
      const errorText = await createRes.text();
      return { success: false, reason: `GitHub API error: ${createRes.status} ${errorText}` };
    }

    const createdData = await createRes.json();
    return { success: true, action: "created", commentId: createdData.id };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

/**
 * Main execution function for CI runner.
 */
export async function runChangeLensCI(options = parseCliArgs()) {
  const log = options.quiet || options.json ? () => {} : console.log;
  const errorLog = options.json ? () => {} : console.error;

  log("=================================================");
  log("          CHANGELENS CI IMPACT ANALYZER          ");
  log("=================================================");
  log(`📁 Target Directory: ${options.targetDir}`);

  // 1. Verify git repository
  const isGit = await isGitRepository(options.targetDir);
  if (!isGit && !options.files) {
    errorLog(`\n❌ Error: Directory is not a Git repository: ${options.targetDir}`);
    return { success: false, exitCode: 1, error: "NOT_A_GIT_REPOSITORY" };
  }

  // 2. Detect changes
  let changes = [];
  if (options.files && options.files.length > 0) {
    log(`🔍 Using explicitly provided changed files (${options.files.length} files)\n`);
    changes = options.files.map((f) => ({
      path: f.split(path.sep).join("/").replace(/^\.\//, ""),
      status: "modified",
      statusCode: "M",
    }));
  } else if (options.baseRef) {
    log(`🔍 Inspecting Git Diff against base ref: ${options.baseRef}..HEAD\n`);
    const diffResult = await getCommitDiff({ directoryPath: options.targetDir, baseRef: options.baseRef });
    changes = diffResult.changes;
  } else {
    log(`🔍 Inspecting local working tree (staged & unstaged changes)\n`);
    const statusResult = await getWorkingTreeChanges(options.targetDir);
    changes = statusResult.changes;
  }

  // 3. Scan codebase & build dependency graph
  log("⚙️  Parsing ASTs and resolving module specifiers...");
  const scanReport = await scanRepository(options.targetDir);
  const dependencies = resolveRepositoryDependencies(scanReport);
  const allFiles = scanReport.files.map((f) => f.path.split(path.sep).join("/"));
  const graph = buildDependencyGraph(dependencies, allFiles);

  // 4. Classify impact policies
  const impactAnalysis = classifyImpactPolicies({
    changes,
    graph,
  });

  const { summary, brokenImports, allFindings } = impactAnalysis;
  const riskLevel = calculateRiskLevel(summary);
  const prCommentMarkdown = formatPRMarkdownComment({ impactAnalysis, changes, riskLevel });
  const explanation = generateImpactExplanation({ impactAnalysis, changes });

  // 5. Console summary
  log("\n📊 IMPACT ANALYSIS SUMMARY:");
  log(`   - Risk Level:                    ${riskLevel}`);
  log(`   - Total Files Changed:           ${summary.totalChanges}`);
  log(`   - Broken Imports:                ${summary.brokenImportsCount} ${summary.brokenImportsCount > 0 ? "🚨 (CRITICAL)" : "✅"}`);
  log(`   - Blast Radius Impacted Files:   ${summary.impactedFilesCount}`);
  log(`   - Direct Consumers (Depth 1):    ${summary.directDependentsCount}`);
  log(`   - Transitive Ripple (Depth 2+):  ${summary.transitiveDependentsCount}`);
  log("-------------------------------------------------\n");

  if (brokenImports.length > 0) {
    log(`🚨 CAUTION: ${brokenImports.length} broken imports detected! Compile/runtime failures likely.`);
    for (const b of brokenImports) {
      log(`   • ${b.affectedFile} imports deleted ${b.deletedFile}`);
    }
    log("");
  }

  // 6. Output to file if requested
  if (options.outputFile) {
    await fs.mkdir(path.dirname(options.outputFile), { recursive: true });
    await fs.writeFile(options.outputFile, prCommentMarkdown, "utf8");
    log(`📝 Report written to: ${options.outputFile}`);
  }

  // 7. Write to GitHub Actions Step Summary if running in GitHub Actions
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `\n${prCommentMarkdown}\n`, "utf8");
      log(`📋 Appended report to GITHUB_STEP_SUMMARY`);
    } catch (err) {
      errorLog(`⚠️ Could not append to GITHUB_STEP_SUMMARY: ${err.message}`);
    }
  }

  // 8. Post PR comment if requested or in CI
  let commentResult = null;
  const githubToken = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  let prNumber = process.env.PR_NUMBER || process.env.GITHUB_PR_NUMBER;

  if (!prNumber && process.env.GITHUB_EVENT_PATH && existsSync(process.env.GITHUB_EVENT_PATH)) {
    try {
      const eventJson = JSON.parse(await fs.readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
      prNumber = eventJson?.pull_request?.number || eventJson?.number;
    } catch {
      // event file unreadable
    }
  }

  if (options.comment || (githubToken && repository && prNumber)) {
    log(`💬 Posting/Updating Pull Request Comment on PR #${prNumber || "?"}...`);
    commentResult = await postOrUpdatePRComment({
      markdown: prCommentMarkdown,
      githubToken,
      repository,
      prNumber,
    });
    if (commentResult.success) {
      log(`✅ PR comment ${commentResult.action} successfully! (ID: ${commentResult.commentId})`);
    } else {
      log(`⚠️ PR commenting skipped/failed: ${commentResult.reason}`);
    }
  }

  // 9. Output JSON if requested
  if (options.json) {
    const jsonOutput = {
      success: true,
      riskLevel,
      summary,
      brokenImports,
      allFindings,
      explanation,
      prCommentMarkdown,
      commentResult,
    };
    console.log(JSON.stringify(jsonOutput, null, 2));
  }

  // 10. Compute exit code based on risk gating flags
  let exitCode = 0;
  if (options.failOnCritical && (riskLevel === "CRITICAL" || summary.brokenImportsCount > 0)) {
    errorLog(`\n❌ CI FAILURE: Failing build because critical broken imports were detected (--fail-on-critical active).`);
    exitCode = 1;
  } else if (options.failOnHigh && (riskLevel === "CRITICAL" || riskLevel === "HIGH")) {
    errorLog(`\n❌ CI FAILURE: Failing build because high/critical impact was detected (--fail-on-high active).`);
    exitCode = 1;
  }

  return {
    success: exitCode === 0,
    exitCode,
    riskLevel,
    summary,
    brokenImports,
    allFindings,
    prCommentMarkdown,
  };
}

// Execute directly if run as a script
if (process.argv[1] && (process.argv[1].endsWith("changelens-ci.js") || process.argv[1].endsWith("changelens-ci"))) {
  runChangeLensCI()
    .then((result) => {
      process.exit(result.exitCode);
    })
    .catch((err) => {
      console.error("\n❌ Uncaught error during ChangeLens CI run:", err);
      process.exit(1);
    });
}
