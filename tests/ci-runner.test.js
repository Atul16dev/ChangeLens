import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import fs from "node:fs/promises";
import { parseCliArgs, runChangeLensCI, postOrUpdatePRComment } from "../bin/changelens-ci.js";

const FIXTURE_DIR = path.resolve("tests/fixtures/mern-sample");

test("ChangeLens CI Suite", async (t) => {
  await t.test("parseCliArgs correctly parses flags and options", () => {
    const args = [
      "--base=origin/main",
      "--repo=/custom/repo",
      "--fail-on-critical",
      "--fail-on-high",
      "--output-file=/tmp/report.md",
      "--files=server/models/user.js,server/index.js",
      "--json",
      "--quiet",
      "--comment",
    ];

    const opts = parseCliArgs(args);
    assert.equal(opts.baseRef, "origin/main");
    assert.equal(opts.targetDir, path.resolve("/custom/repo"));
    assert.equal(opts.failOnCritical, true);
    assert.equal(opts.failOnHigh, true);
    assert.equal(opts.outputFile, path.resolve("/tmp/report.md"));
    assert.deepEqual(opts.files, ["server/models/user.js", "server/index.js"]);
    assert.equal(opts.json, true);
    assert.equal(opts.quiet, true);
    assert.equal(opts.comment, true);
  });

  await t.test("runChangeLensCI analyzes target repository with explicit changed files", async () => {
    const result = await runChangeLensCI({
      targetDir: FIXTURE_DIR,
      files: ["server/models/user.js"],
      quiet: true,
    });

    assert.equal(result.success, true);
    assert.equal(result.exitCode, 0);
    assert.equal(result.riskLevel, "HIGH");
    assert.equal(result.summary.impactedFilesCount, 3);
    assert.equal(result.summary.directDependentsCount, 1);
    assert.equal(result.summary.transitiveDependentsCount, 2);
    assert.equal(result.brokenImports.length, 0);

    // Markdown content verification
    assert.ok(result.prCommentMarkdown.includes("ChangeLens Impact Analysis Report"));
    assert.ok(result.prCommentMarkdown.includes("HIGH RISK"));
    assert.ok(result.prCommentMarkdown.includes("Blast Radius Overview"));
    assert.ok(result.prCommentMarkdown.includes("server/controllers/user-controller.js"));
  });

  await t.test("runChangeLensCI writes markdown report to output file", async () => {
    const tempReportFile = path.resolve("tests/fixtures/scratch-ci-report.md");

    try {
      const result = await runChangeLensCI({
        targetDir: FIXTURE_DIR,
        files: ["server/models/user.js"],
        outputFile: tempReportFile,
        quiet: true,
      });

      assert.equal(result.success, true);
      const fileContent = await fs.readFile(tempReportFile, "utf8");
      assert.ok(fileContent.includes("ChangeLens Impact Analysis Report"));
      assert.equal(fileContent, result.prCommentMarkdown);
    } finally {
      await fs.unlink(tempReportFile).catch(() => {});
    }
  });

  await t.test("runChangeLensCI respects --fail-on-critical flag", async () => {
    // 1. Safe change (no broken imports) should exit 0
    const cleanResult = await runChangeLensCI({
      targetDir: FIXTURE_DIR,
      files: ["server/models/user.js"],
      failOnCritical: true,
      quiet: true,
    });
    assert.equal(cleanResult.exitCode, 0);
    assert.equal(cleanResult.success, true);
  });

  await t.test("runChangeLensCI respects --fail-on-high flag", async () => {
    // High risk change should exit 1 when --fail-on-high is requested
    const highResult = await runChangeLensCI({
      targetDir: FIXTURE_DIR,
      files: ["server/models/user.js"],
      failOnHigh: true,
      quiet: true,
    });
    assert.equal(highResult.exitCode, 1);
    assert.equal(highResult.success, false);
    assert.equal(highResult.riskLevel, "HIGH");
  });

  await t.test("postOrUpdatePRComment safely handles missing credentials without throwing", async () => {
    const result = await postOrUpdatePRComment({
      markdown: "# Test Report",
      githubToken: null,
      repository: "test/repo",
      prNumber: 123,
    });

    assert.equal(result.success, false);
    assert.ok(result.reason.includes("Missing GITHUB_TOKEN"));
  });
});
