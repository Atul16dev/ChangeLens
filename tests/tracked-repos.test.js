process.env.NODE_ENV = "test";
process.env.MOCK_GITHUB_API = "true";

import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../api/app.js";
import { userRepository } from "../api/db/user-repository.js";
import { repoRepository } from "../api/db/repo-repository.js";
import { hashPassword } from "../api/services/hash.js";

test("Tracked Repositories Hub (Phase 8 & 10) Test Suite", async (t) => {
  userRepository.clearMemory();
  repoRepository.clearMemory();

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
    userRepository.clearMemory();
    repoRepository.clearMemory();
    delete process.env.MOCK_GITHUB_API;
  });

  async function createAndLoginUser(email, name = "Dev User") {
    const password = "StrongPassword123!";
    const passwordHash = await hashPassword(password);
    const user = await userRepository.create({
      name,
      email,
      passwordHash,
      authProvider: "local",
      isEmailVerified: 1,
    });

    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(loginRes.status, 200);
    const setCookie = loginRes.headers.get("set-cookie");
    const match = setCookie?.match(/changelens\.sid=([^;]+)/);
    assert.ok(match, "Session cookie must be present");
    return { user, cookie: `changelens.sid=${match[1]}` };
  }

  await t.test("Unauthenticated requests to /api/v1/repos are rejected with 401", async () => {
    const res = await fetch(`${baseUrl}/api/v1/repos`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, "UNAUTHORIZED");
  });

  await t.test("POST /api/v1/repos validates URL and tracks new GitHub repository", async () => {
    const { cookie } = await createAndLoginUser("alice@changelens.dev", "Alice");

    // Invalid URL rejected
    const invalidRes = await fetch(`${baseUrl}/api/v1/repos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({ repoUrl: "not-a-valid-repo-url" }),
    });
    assert.equal(invalidRes.status, 400);
    const invalidBody = await invalidRes.json();
    assert.equal(invalidBody.error.code, "INVALID_REPO_URL");

    // Valid shorthand URL saved
    const res = await fetch(`${baseUrl}/api/v1/repos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({ repoUrl: "facebook/react" }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.created, true);
    assert.equal(body.data.repository.fullName, "facebook/react");
    assert.equal(body.data.repository.owner, "facebook");
    assert.equal(body.data.repository.repo, "react");
    assert.equal(body.data.repository.isPinned, false);

    // Re-adding same repo performs upsert instead of duplicating
    const upsertRes = await fetch(`${baseUrl}/api/v1/repos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({ repoUrl: "https://github.com/facebook/react" }),
    });
    assert.equal(upsertRes.status, 200);
    const upsertBody = await upsertRes.json();
    assert.equal(upsertBody.data.created, false);
  });

  await t.test("Pinning prioritizes repository in GET /api/v1/repos and enforces user isolation", async () => {
    const alice = await createAndLoginUser("alice2@changelens.dev", "Alice Two");
    const bob = await createAndLoginUser("bob@changelens.dev", "Bob");

    // Alice tracks two repos
    const r1 = await (
      await fetch(`${baseUrl}/api/v1/repos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: alice.cookie },
        body: JSON.stringify({ repoUrl: "expressjs/express" }),
      })
    ).json();

    const r2 = await (
      await fetch(`${baseUrl}/api/v1/repos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: alice.cookie },
        body: JSON.stringify({ repoUrl: "vercel/next.js" }),
      })
    ).json();

    // Pin the first repo (expressjs/express)
    const pinRes = await fetch(`${baseUrl}/api/v1/repos/${r1.data.repository.id}/pin`, {
      method: "PATCH",
      headers: { Cookie: alice.cookie },
    });
    assert.equal(pinRes.status, 200);
    const pinBody = await pinRes.json();
    assert.equal(pinBody.data.repository.isPinned, true);

    // Pinned repo should appear first in Alice's list
    const listRes = await fetch(`${baseUrl}/api/v1/repos`, {
      headers: { Cookie: alice.cookie },
    });
    const listBody = await listRes.json();
    assert.equal(listBody.data.repositories.length, 2);
    assert.equal(listBody.data.repositories[0].fullName, "expressjs/express");
    assert.equal(listBody.data.repositories[1].fullName, "vercel/next.js");

    // Bob should have 0 tracked repos and cannot pin or delete Alice's repo
    const bobList = await (
      await fetch(`${baseUrl}/api/v1/repos`, { headers: { Cookie: bob.cookie } })
    ).json();
    assert.equal(bobList.data.repositories.length, 0);

    const bobPin = await fetch(`${baseUrl}/api/v1/repos/${r1.data.repository.id}/pin`, {
      method: "PATCH",
      headers: { Cookie: bob.cookie },
    });
    assert.equal(bobPin.status, 404);

    const bobDelete = await fetch(`${baseUrl}/api/v1/repos/${r2.data.repository.id}`, {
      method: "DELETE",
      headers: { Cookie: bob.cookie },
    });
    assert.equal(bobDelete.status, 404);
  });

  await t.test("GET /api/v1/repos/:id/pulls lists open PRs for 1-click analysis & DELETE removes repo", async () => {
    const { user, cookie } = await createAndLoginUser("carol@changelens.dev", "Carol");

    const addBody = await (
      await fetch(`${baseUrl}/api/v1/repos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ repoUrl: "Atul16dev/ChangeLens" }),
      })
    ).json();
    const repoId = addBody.data.repository.id;

    // Fetch open PRs for the tracked repo
    const pullsRes = await fetch(`${baseUrl}/api/v1/repos/${repoId}/pulls`, {
      headers: { Cookie: cookie },
    });
    assert.equal(pullsRes.status, 200);
    const pullsBody = await pullsRes.json();
    assert.equal(pullsBody.success, true);
    assert.ok(Array.isArray(pullsBody.data.pulls));
    assert.ok(pullsBody.data.pulls.length > 0);
    assert.equal(pullsBody.data.pulls[0].number, 101);

    // Update last analysis telemetry
    const updatedRepo = await repoRepository.updateLastAnalysis({
      userId: user.id,
      fullName: "Atul16dev/ChangeLens",
      analysisId: "anl_test_999",
      riskScore: 68,
      riskLevel: "HIGH",
    });
    assert.equal(updatedRepo.lastAnalysisId, "anl_test_999");
    assert.equal(updatedRepo.lastRiskScore, 68);
    assert.equal(updatedRepo.lastRiskLevel, "HIGH");
    assert.ok(updatedRepo.lastAnalyzedAt);

    // Verify GET reflects updated telemetry
    const afterList = await (
      await fetch(`${baseUrl}/api/v1/repos`, { headers: { Cookie: cookie } })
    ).json();
    assert.equal(afterList.data.repositories[0].lastAnalysisId, "anl_test_999");
    assert.equal(afterList.data.repositories[0].lastRiskScore, 68);

    // Delete repository
    const delRes = await fetch(`${baseUrl}/api/v1/repos/${repoId}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    assert.equal(delRes.status, 200);

    const finalList = await (
      await fetch(`${baseUrl}/api/v1/repos`, { headers: { Cookie: cookie } })
    ).json();
    assert.equal(finalList.data.repositories.length, 0);
  });
});
