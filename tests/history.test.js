process.env.NODE_ENV = "test";

import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../api/app.js";
import { userRepository } from "../api/db/user-repository.js";
import { otpRepository } from "../api/db/otp-repository.js";
import { analysesStore } from "../api/store.js";
import { hashPassword } from "../api/services/hash.js";

test("ChangeLens Analysis History & Saved Reports Test Suite", async (t) => {
  userRepository.clearMemory();
  otpRepository.clearMemory();
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
    userRepository.clearMemory();
    otpRepository.clearMemory();
    analysesStore.clear();
  });

  function extractCookie(res) {
    const setCookie = res.headers.get("set-cookie");
    if (!setCookie) return null;
    const match = setCookie.match(/changelens\.sid=([^;]+)/);
    return match ? `changelens.sid=${match[1]}` : null;
  }

  // Create two verified test users
  const passwordHash = await hashPassword("HistorySecret123!");
  const userA = await userRepository.create({
    name: "User Alice",
    email: "alice@example.com",
    passwordHash,
    isEmailVerified: 1,
  });

  const userB = await userRepository.create({
    name: "User Bob",
    email: "bob@example.com",
    passwordHash,
    isEmailVerified: 1,
  });

  // Login Alice to obtain session cookie
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "alice@example.com", password: "HistorySecret123!" }),
  });
  const aliceCookie = extractCookie(loginRes);
  assert.ok(aliceCookie, "Alice must obtain session cookie");

  // Login Bob to obtain session cookie
  const loginBobRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "bob@example.com", password: "HistorySecret123!" }),
  });
  const bobCookie = extractCookie(loginBobRes);
  assert.ok(bobCookie, "Bob must obtain session cookie");

  await t.test("GET /api/v1/analyses/history requires authentication", async () => {
    const res = await fetch(`${baseUrl}/api/v1/analyses/history`);
    assert.strictEqual(res.status, 401, "Unauthenticated request should return 401");
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, "UNAUTHORIZED");
  });

  await t.test("POST /api/v1/analyze automatically attributes analysis to authenticated user", async () => {
    const res = await fetch(`${baseUrl}/api/v1/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: aliceCookie,
      },
      body: JSON.stringify({
        changedFiles: ["server/models/user.js"],
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.ok(body.data.analysisId, "Must return analysisId");

    const saved = await analysesStore.get(body.data.analysisId);
    assert.ok(saved, "Record must exist in store");
    assert.strictEqual(saved.user, userA.id, "Record must be attributed to Alice");
  });

  await t.test("GET /api/v1/analyses/history returns user's analyses with metadata and summary", async () => {
    const res = await fetch(`${baseUrl}/api/v1/analyses/history`, {
      headers: { Cookie: aliceCookie },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data.analyses));
    assert.strictEqual(body.data.total, 1);
    assert.strictEqual(body.data.analyses[0].changedFiles[0], "server/models/user.js");
  });

  await t.test("GET /api/v1/analyses/history supports search filtering", async () => {
    // Add second analysis for Alice with different changed file
    await fetch(`${baseUrl}/api/v1/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: aliceCookie,
      },
      body: JSON.stringify({
        changedFiles: ["client/src/styles.css"],
      }),
    });

    // Search for "user.js"
    const searchRes = await fetch(`${baseUrl}/api/v1/analyses/history?search=user.js`, {
      headers: { Cookie: aliceCookie },
    });
    const searchBody = await searchRes.json();
    assert.strictEqual(searchBody.data.total, 1);
    assert.strictEqual(searchBody.data.analyses[0].changedFiles[0], "server/models/user.js");

    // Search for "styles"
    const styleRes = await fetch(`${baseUrl}/api/v1/analyses/history?search=styles`, {
      headers: { Cookie: aliceCookie },
    });
    const styleBody = await styleRes.json();
    assert.strictEqual(styleBody.data.total, 1);
    assert.strictEqual(styleBody.data.analyses[0].changedFiles[0], "client/src/styles.css");
  });

  await t.test("Bob cannot delete Alice's analysis report (ownership enforcement)", async () => {
    const aliceHistoryRes = await fetch(`${baseUrl}/api/v1/analyses/history`, {
      headers: { Cookie: aliceCookie },
    });
    const aliceHistory = await aliceHistoryRes.json();
    const targetAnalysisId = aliceHistory.data.analyses[0].analysisId;

    // Bob tries to delete Alice's analysis
    const deleteRes = await fetch(`${baseUrl}/api/v1/analyses/${targetAnalysisId}`, {
      method: "DELETE",
      headers: { Cookie: bobCookie },
    });

    assert.strictEqual(deleteRes.status, 403, "Must return 403 Forbidden for unauthorized user");
    const deleteBody = await deleteRes.json();
    assert.strictEqual(deleteBody.success, false);
    assert.strictEqual(deleteBody.error.code, "FORBIDDEN");

    // Verify it was NOT deleted
    const check = await analysesStore.get(targetAnalysisId);
    assert.ok(check, "Analysis record must still exist");
  });

  await t.test("Alice can delete her own analysis report", async () => {
    const aliceHistoryRes = await fetch(`${baseUrl}/api/v1/analyses/history`, {
      headers: { Cookie: aliceCookie },
    });
    const aliceHistory = await aliceHistoryRes.json();
    const targetAnalysisId = aliceHistory.data.analyses[0].analysisId;

    const deleteRes = await fetch(`${baseUrl}/api/v1/analyses/${targetAnalysisId}`, {
      method: "DELETE",
      headers: { Cookie: aliceCookie },
    });

    assert.strictEqual(deleteRes.status, 200);
    const deleteBody = await deleteRes.json();
    assert.strictEqual(deleteBody.success, true);

    const check = await analysesStore.get(targetAnalysisId);
    assert.strictEqual(check, null, "Analysis record must be deleted");
  });
});
