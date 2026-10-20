import test from "node:test";
import assert from "node:assert/strict";
import { parseGitHubUrl, getGitHubActionWorkflowYaml } from "../api/services/github.js";
import { createApp } from "../api/app.js";

test("GitHub Connector: parseGitHubUrl parses various GitHub URL formats", () => {
  // Full PR URL
  const pr1 = parseGitHubUrl("https://github.com/facebook/react/pull/28000");
  assert.equal(pr1.type, "pull");
  assert.equal(pr1.owner, "facebook");
  assert.equal(pr1.repo, "react");
  assert.equal(pr1.pullNumber, 28000);

  // PR URL with /files suffix
  const pr2 = parseGitHubUrl("https://github.com/vercel/next.js/pull/50000/files");
  assert.equal(pr2.type, "pull");
  assert.equal(pr2.owner, "vercel");
  assert.equal(pr2.repo, "next.js");
  assert.equal(pr2.pullNumber, 50000);

  // Shorthand owner/repo#number
  const pr3 = parseGitHubUrl("owner-name/my_repo#42");
  assert.equal(pr3.type, "pull");
  assert.equal(pr3.owner, "owner-name");
  assert.equal(pr3.repo, "my_repo");
  assert.equal(pr3.pullNumber, 42);

  // Repository root URL
  const repo1 = parseGitHubUrl("https://github.com/expressjs/express");
  assert.equal(repo1.type, "repo");
  assert.equal(repo1.owner, "expressjs");
  assert.equal(repo1.repo, "express");
  assert.equal(repo1.pullNumber, null);

  // Invalid URLs throw descriptive errors
  assert.throws(() => parseGitHubUrl("not-a-url"), /Invalid GitHub URL/);
  assert.throws(() => parseGitHubUrl(""), /required/);
});

test("GitHub Connector: getGitHubActionWorkflowYaml generates standard workflow", () => {
  const yamlDefault = getGitHubActionWorkflowYaml();
  assert.ok(yamlDefault.includes('name: "ChangeLens Blast Radius Impact Analysis"'));
  assert.ok(yamlDefault.includes("pull_request:"));
  assert.ok(yamlDefault.includes("npx changelens-ci"));
  assert.ok(yamlDefault.includes("--fail-on-critical"));
  assert.ok(yamlDefault.includes("--comment"));
  assert.ok(yamlDefault.includes('node-version: "22"'));

  const yamlCustom = getGitHubActionWorkflowYaml({
    failOnCritical: true,
    failOnHigh: true,
    nodeVersion: "20",
  });
  assert.ok(yamlCustom.includes("--fail-on-high"));
  assert.ok(yamlCustom.includes('node-version: "20"'));
});

test("GitHub Connector REST API: GET /api/v1/github/workflow-template returns YAML", async () => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1/github`;

  try {
    const res = await fetch(`${baseUrl}/workflow-template?failOnHigh=true`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.filename, ".github/workflows/changelens.yml");
    assert.ok(body.data.yaml.includes("npx changelens-ci"));
    assert.ok(body.data.yaml.includes("--fail-on-high"));
  } finally {
    server.close();
  }
});

test("GitHub Connector REST API: POST /api/v1/github/inspect-pr validates inputs", async () => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1/github`;

  try {
    // Missing URL
    const resEmpty = await fetch(`${baseUrl}/inspect-pr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(resEmpty.status, 400);
    const bodyEmpty = await resEmpty.json();
    assert.equal(bodyEmpty.error.code, "INVALID_PR_URL");

    // Non-PR URL (e.g. repo only)
    const resRepo = await fetch(`${baseUrl}/inspect-pr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prUrl: "https://github.com/owner/repo" }),
    });
    assert.equal(resRepo.status, 400);
    const bodyRepo = await resRepo.json();
    assert.equal(bodyRepo.error.code, "NOT_A_PULL_REQUEST");
  } finally {
    server.close();
  }
});
