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

  await t.test("Unpinned analysis report is scheduled for 30-day auto-deletion", async () => {
    // Run an analysis for Alice
    const runRes = await fetch(`${baseUrl}/api/v1/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: aliceCookie,
      },
      body: JSON.stringify({
        changedFiles: ["server/models/order.js"],
      }),
    });
    const runBody = await runRes.json();
    const analysisId = runBody.data.analysisId;

    const record = await analysesStore.get(analysisId);
    assert.ok(record);
    assert.strictEqual(record.isPinned, false, "Default isPinned must be false");
    assert.ok(record.expireAt, "Must have expireAt scheduled");

    const expireDate = new Date(record.expireAt);
    const createdDate = new Date(record.createdAt);
    const diffDays = Math.round((expireDate.getTime() - createdDate.getTime()) / (24 * 60 * 60 * 1000));
    assert.strictEqual(diffDays, 30, "expireAt must be exactly 30 days after creation");
  });

  await t.test("Alice can pin/save an analysis report to keep it permanently", async () => {
    const listRes = await fetch(`${baseUrl}/api/v1/analyses/history`, {
      headers: { Cookie: aliceCookie },
    });
    const listBody = await listRes.json();
    const target = listBody.data.analyses[0];
    assert.ok(target);

    // Alice pins the report
    const pinRes = await fetch(`${baseUrl}/api/v1/analyses/${target.analysisId}/pin`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: aliceCookie,
      },
      body: JSON.stringify({ isPinned: true }),
    });

    assert.strictEqual(pinRes.status, 200);
    const pinBody = await pinRes.json();
    assert.strictEqual(pinBody.success, true);
    assert.strictEqual(pinBody.data.isPinned, true);
    assert.strictEqual(pinBody.data.expireAt, null, "Pinned report must have expireAt = null (permanent retention)");

    // Check in store
    const stored = await analysesStore.get(target.analysisId);
    assert.strictEqual(stored.isPinned, true);
    assert.strictEqual(stored.expireAt, null);
  });

  await t.test("Bob cannot toggle pin on Alice's analysis report (forbidden/not found)", async () => {
    const listRes = await fetch(`${baseUrl}/api/v1/analyses/history`, {
      headers: { Cookie: aliceCookie },
    });
    const listBody = await listRes.json();
    const target = listBody.data.analyses[0];

    const bobPinRes = await fetch(`${baseUrl}/api/v1/analyses/${target.analysisId}/pin`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: bobCookie,
      },
      body: JSON.stringify({ isPinned: false }),
    });

    assert.strictEqual(bobPinRes.status, 404, "Bob cannot modify Alice's report pin state");
  });

  await t.test("Alice can unpin report and expireAt reverts to 30 days from creation", async () => {
    const listRes = await fetch(`${baseUrl}/api/v1/analyses/history`, {
      headers: { Cookie: aliceCookie },
    });
    const listBody = await listRes.json();
    const target = listBody.data.analyses.find((a) => a.isPinned);
    assert.ok(target, "Should find pinned report");

    const unpinRes = await fetch(`${baseUrl}/api/v1/analyses/${target.analysisId}/pin`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: aliceCookie,
      },
      body: JSON.stringify({ isPinned: false }),
    });

    assert.strictEqual(unpinRes.status, 200);
    const unpinBody = await unpinRes.json();
    assert.strictEqual(unpinBody.data.isPinned, false);
    assert.ok(unpinBody.data.expireAt, "expireAt must be restored when unpinned");
  });

  await t.test("Expired unpinned reports (> 30 days old) are automatically purged from history", async () => {
    // Inject an old unpinned report created 35 days ago
    const expiredId = "analysis_expired_test";
    const pastDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
    const expiredExpireAt = new Date(pastDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 5 days ago

    await analysesStore.save(
      expiredId,
      {
        analysisId: expiredId,
        createdAt: pastDate.toISOString(),
        expireAt: expiredExpireAt.toISOString(),
        isPinned: false,
        summary: { riskLevel: "LOW" },
        changes: [{ path: "old.js" }],
      },
      userA.id
    );

    // Also inject an old PINNED report created 35 days ago
    const pinnedOldId = "analysis_pinned_old_test";
    await analysesStore.save(
      pinnedOldId,
      {
        analysisId: pinnedOldId,
        createdAt: pastDate.toISOString(),
        expireAt: null,
        isPinned: true,
        summary: { riskLevel: "HIGH" },
        changes: [{ path: "important.js" }],
      },
      userA.id
    );

    const historyRes = await fetch(`${baseUrl}/api/v1/analyses/history`, {
      headers: { Cookie: aliceCookie },
    });
    const historyBody = await historyRes.json();
    const ids = historyBody.data.analyses.map((a) => a.analysisId);

    assert.ok(!ids.includes(expiredId), "Expired unpinned report must be purged/excluded from history");
    assert.ok(ids.includes(pinnedOldId), "Pinned report must be preserved regardless of age");
  });
});
