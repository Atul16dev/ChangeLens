process.env.NODE_ENV = "test";

import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../api/app.js";
import {
  parseGitHubUrl,
  analyzeRepositorySync,
} from "../api/services/github.js";
import { analysesStore } from "../api/store.js";

test("GitHub Repository Connect & Cumulative Push Sync Test Suite", async (t) => {
  analysesStore.clear();

  const app = createApp();
  let server;
  let baseUrl;

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    analysesStore.clear();
  });

  await t.test("parseGitHubUrl accurately parses both full and short repository URLs", () => {
    const full = parseGitHubUrl("https://github.com/facebook/react");
    assert.strictEqual(full.type, "repo");
    assert.strictEqual(full.owner, "facebook");
    assert.strictEqual(full.repo, "react");

    const short = parseGitHubUrl("expressjs/express");
    assert.strictEqual(short.type, "repo");
    assert.strictEqual(short.owner, "expressjs");
    assert.strictEqual(short.repo, "express");

    const withGit = parseGitHubUrl("https://github.com/vercel/next.js.git");
    assert.strictEqual(withGit.type, "repo");
    assert.strictEqual(withGit.owner, "vercel");
    assert.strictEqual(withGit.repo, "next.js");
  });

  await t.test("POST /api/v1/github/connect-repo validates repository input", async () => {
    const res = await fetch(`${baseUrl}/api/v1/github/connect-repo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, "INVALID_REPO_URL");
  });

  await t.test("analyzeRepositorySync executes blast radius with single commit mode", async () => {
    // We run on our local mern-sample fixture
    const result = await analyzeRepositorySync({
      repoUrl: "https://github.com/changelens/mern-sample",
      mode: "single",
      commitSha: "a1b2c3d4e5f6789012345678901234567890abcd",
      // If we don't mock fetch, analyzeRepositorySync handles file analysis on the fixture
      repoPath: "tests/fixtures/mern-sample",
    });

    assert.ok(result.analysisId, "Must return analysisId");
    assert.ok(result.syncDetails, "Must return syncDetails");
    assert.strictEqual(result.syncDetails.owner, "changelens");
    assert.strictEqual(result.syncDetails.repo, "mern-sample");
    assert.ok(result.impactAnalysis, "Must return impact findings");

    const saved = await analysesStore.get(result.analysisId);
    assert.ok(saved, "Record must be saved in store");
    assert.ok(saved.githubSync, "githubSync metadata must be preserved in store");
  });

  await t.test("POST /api/v1/github/sync-commits endpoint validates required fields and computes blast radius", async () => {
    // Missing repoUrl returns 400
    const invalidRes = await fetch(`${baseUrl}/api/v1/github/sync-commits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.strictEqual(invalidRes.status, 400);

    // Valid sync call on local fixture
    const validRes = await fetch(`${baseUrl}/api/v1/github/sync-commits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repoUrl: "my-org/my-project",
        mode: "single",
        commitSha: "c0ffee1234567890abcdef1234567890abcdef12",
        repoPath: "tests/fixtures/mern-sample",
      }),
    });

    assert.strictEqual(validRes.status, 201);
    const body = await validRes.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.analysisId);
    assert.strictEqual(body.data.syncDetails.mode, "single");
    assert.ok(body.data.summary);

    // Verify What-If simulation works on this GitHub repository analysis
    const simRes = await fetch(`${baseUrl}/api/v1/analyses/${body.data.analysisId}/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        simulatedFile: "server/models/user.js",
        changeType: "modified",
      }),
    });

    assert.strictEqual(simRes.status, 200);
    const simBody = await simRes.json();
    assert.strictEqual(simBody.success, true);
    assert.strictEqual(simBody.data.simulatedFile, "server/models/user.js");
    assert.ok(simBody.data.impactAnalysis);
    assert.ok(simBody.data.graph);
    assert.ok(simBody.data.explanation);
    assert.strictEqual(simBody.data.summary.impactedFilesCount, 3);
  });
});
