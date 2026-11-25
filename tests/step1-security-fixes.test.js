process.env.NODE_ENV = "test";
process.env.SUPER_ADMIN_EMAILS = "owner@changelens.io,coowner@changelens.io";

import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../api/app.js";
import { createRateLimiter } from "../api/middleware/auth.js";
import { userRepository } from "../api/db/user-repository.js";
import { otpRepository } from "../api/db/otp-repository.js";
import { feedbackRepository } from "../api/db/feedback-repository.js";
import { analysesStore } from "../api/store.js";
import { analysisQueue } from "../api/queue/analysis-queue.js";
import * as emailService from "../api/services/email.js";
import { hashPassword } from "../api/services/hash.js";
import { generateTestCommand } from "../analyzer/test-impact-analyzer.js";

test("Step 1 Regression Suite: Critical Security, Crash & Functionality Fixes", async (t) => {
  const origClientId = process.env.GITHUB_CLIENT_ID;
  const origClientSecret = process.env.GITHUB_CLIENT_SECRET;
  const origMockOAuth = process.env.MOCK_GITHUB_OAUTH;
  const origSuperAdmins = process.env.SUPER_ADMIN_EMAILS;

  userRepository.clearMemory();
  otpRepository.clearMemory();
  feedbackRepository.clearMemoryStore();
  analysesStore.clear();
  analysisQueue.clear();
  emailService.clearSentEmails?.();

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
    feedbackRepository.clearMemoryStore();
    analysesStore.clear();
    analysisQueue.clear();
    emailService.clearSentEmails?.();

    process.env.GITHUB_CLIENT_ID = origClientId;
    process.env.GITHUB_CLIENT_SECRET = origClientSecret;
    process.env.MOCK_GITHUB_OAUTH = origMockOAuth;
    process.env.SUPER_ADMIN_EMAILS = origSuperAdmins;
  });

  function extractCookie(res) {
    const setCookie = res.headers.get("set-cookie");
    if (!setCookie) return null;
    const match = setCookie.match(/changelens\.sid=([^;]+)/);
    return match ? `changelens.sid=${match[1]}` : null;
  }

  async function loginAs(email, password = "Password@123") {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return {
      status: res.status,
      cookie: extractCookie(res),
      body: await res.json(),
    };
  }

  await t.test("1. Password reset invalidates all existing sessions across devices", async () => {
    const pw = "InitialPass123!";
    const user = await userRepository.create({
      name: "Multi Device Alice",
      email: "multidevice@example.com",
      passwordHash: await hashPassword(pw),
      isEmailVerified: 1,
    });

    const sessionA = await loginAs("multidevice@example.com", pw);
    const sessionB = await loginAs("multidevice@example.com", pw);
    assert.equal(sessionA.status, 200);
    assert.equal(sessionB.status, 200);
    assert.ok(sessionA.cookie && sessionB.cookie);

    // Verify both device sessions are initially valid
    const meA1 = await fetch(`${baseUrl}/api/v1/auth/me`, { headers: { Cookie: sessionA.cookie } });
    const meB1 = await fetch(`${baseUrl}/api/v1/auth/me`, { headers: { Cookie: sessionB.cookie } });
    assert.equal(meA1.status, 200);
    assert.equal(meB1.status, 200);

    // Trigger password reset flow
    emailService.clearSentEmails?.();
    const forgotRes = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "multidevice@example.com" }),
    });
    assert.equal(forgotRes.status, 200);

    const sent = emailService.getSentEmails?.() || [];
    assert.ok(sent.length >= 1, "Password reset email should be recorded in memory");
    const lastEmailText = JSON.stringify(sent[sent.length - 1]);
    const otpMatch = lastEmailText.match(/\b(\d{6})\b/);
    assert.ok(otpMatch, "6-digit OTP should be present in recorded reset email");

    const verifyRes = await fetch(`${baseUrl}/api/v1/auth/verify-reset-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "multidevice@example.com", otp: otpMatch[1] }),
    });
    assert.equal(verifyRes.status, 200);
    const verifyBody = await verifyRes.json();
    const resetToken = verifyBody.data.resetToken;
    assert.ok(resetToken);

    const newPassword = "UpdatedPass456!";
    const resetRes = await fetch(`${baseUrl}/api/v1/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "multidevice@example.com",
        resetToken,
        newPassword,
        confirmPassword: newPassword,
      }),
    });
    assert.equal(resetRes.status, 200);

    // Both previously issued sessions must now be rejected with 401
    const meA2 = await fetch(`${baseUrl}/api/v1/auth/me`, { headers: { Cookie: sessionA.cookie } });
    const meB2 = await fetch(`${baseUrl}/api/v1/auth/me`, { headers: { Cookie: sessionB.cookie } });
    assert.equal(meA2.status, 401);
    assert.equal(meB2.status, 401);

    // Rapid consecutive updatePassword calls must advance password_changed_at strictly monotonically
    const after1 = await userRepository.updatePassword(user.id, await hashPassword("PassOne789!"));
    const changedAt1 = new Date(after1.password_changed_at).getTime();
    const after2 = await userRepository.updatePassword(user.id, await hashPassword("PassTwo789!"));
    const changedAt2 = new Date(after2.password_changed_at).getTime();
    assert.ok(changedAt2 > changedAt1);
  });

  await t.test("2. Banned users are rejected on GitHub OAuth callback and admin routes", async () => {
    process.env.GITHUB_CLIENT_ID = "test_client_id";
    process.env.GITHUB_CLIENT_SECRET = "test_client_secret";
    process.env.MOCK_GITHUB_OAUTH = "true";

    const bannedGhUser = await userRepository.create({
      name: "Banned GitHub User",
      email: "octocat@github.dev",
      passwordHash: null,
      authProvider: "github",
      githubId: "gh_banned_999",
      isEmailVerified: 1,
    });
    await userRepository.banUser(bannedGhUser.id, {
      bannedBy: "owner_id",
      reason: "Automated abuse detected",
    });

    const initRes = await fetch(`${baseUrl}/api/v1/auth/github`, { redirect: "manual" });
    const cookie = extractCookie(initRes);
    const location = initRes.headers.get("location");
    const state = decodeURIComponent(location.match(/state=([^&]+)/)[1]);

    const cbRes = await fetch(
      `${baseUrl}/api/v1/auth/github/callback?code=mock_gh_code_123&state=${encodeURIComponent(state)}`,
      {
        headers: { Cookie: cookie },
        redirect: "manual",
      }
    );
    assert.equal(cbRes.status, 302);
    const redirectLocation = cbRes.headers.get("location") || "";
    assert.ok(redirectLocation.includes("error=account_banned"), `Unexpected redirect: ${redirectLocation}`);

    // Session cookie from failed callback must not grant /me access
    const cbCookie = extractCookie(cbRes) || cookie;
    const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, { headers: { Cookie: cbCookie } });
    assert.equal(meRes.status, 401);

    // Banned admin must receive 403 ACCOUNT_BANNED on requireAdmin endpoints
    const bannedAdmin = await userRepository.create({
      name: "Suspended Admin",
      email: "suspended-admin@changelens.io",
      passwordHash: await hashPassword("Password@123"),
      isEmailVerified: 1,
      role: "admin",
      permissions: { canManageUsers: true, canModerateFeedback: true },
    });
    const adminLogin = await loginAs("suspended-admin@changelens.io");
    assert.equal(adminLogin.status, 200);

    await userRepository.banUser(bannedAdmin.id, {
      bannedById: "owner_id",
      reason: "Staff policy violation",
    });

    const adminUsersRes = await fetch(`${baseUrl}/api/v1/admin/users`, {
      headers: { Cookie: adminLogin.cookie },
    });
    assert.equal(adminUsersRes.status, 403);
    assert.equal((await adminUsersRes.json()).error.code, "ACCOUNT_BANNED");
  });

  await t.test("3. Bootstrap Super Admin cannot be demoted and admin search escapes regex safely", async () => {
    const owner = await userRepository.create({
      name: "Bootstrap Owner",
      email: "owner@changelens.io",
      passwordHash: await hashPassword("Password@123"),
      isEmailVerified: 1,
    });
    await userRepository.create({
      name: "Bootstrap CoOwner",
      email: "coowner@changelens.io",
      passwordHash: await hashPassword("Password@123"),
      isEmailVerified: 1,
    });
    const trackedDev = await userRepository.create({
      name: "Risky Dev",
      email: "risky@example.com",
      passwordHash: await hashPassword("Password@123"),
      isEmailVerified: 1,
    });

    const coOwnerLogin = await loginAs("coowner@changelens.io");
    assert.equal(coOwnerLogin.status, 200);

    // Another Super Admin trying to revoke a bootstrap Super Admin must hit CANNOT_DEMOTE_BOOTSTRAP_SUPERADMIN
    const revokeRes = await fetch(`${baseUrl}/api/v1/admin/users/${owner.id}/access`, {
      method: "DELETE",
      headers: { Cookie: coOwnerLogin.cookie },
    });
    assert.equal(revokeRes.status, 400);
    assert.equal((await revokeRes.json()).error.code, "CANNOT_DEMOTE_BOOTSTRAP_SUPERADMIN");

    // Search with unclosed regex characters must not crash
    const regexSearchRes = await fetch(
      `${baseUrl}/api/v1/admin/users?search=${encodeURIComponent("[*+(unclosed?")}`,
      { headers: { Cookie: coOwnerLogin.cookie } }
    );
    assert.equal(regexSearchRes.status, 200);
    assert.equal((await regexSearchRes.json()).success, true);

    // Seed analyses with summary.riskLevel HIGH / CRITICAL / LOW for getUserActivity
    await analysesStore.save("risk_high_1", {
      user: trackedDev.id,
      summary: { riskLevel: "HIGH", riskScore: 80 },
    });
    await analysesStore.save("risk_crit_2", {
      user: trackedDev.id,
      summary: { riskLevel: "CRITICAL", riskScore: 95 },
    });
    await analysesStore.save("risk_low_3", {
      user: trackedDev.id,
      summary: { riskLevel: "LOW", riskScore: 15 },
    });

    const activityRes = await fetch(`${baseUrl}/api/v1/admin/users/${trackedDev.id}/activity`, {
      headers: { Cookie: coOwnerLogin.cookie },
    });
    assert.equal(activityRes.status, 200);
    const activityBody = await activityRes.json();
    assert.equal(activityBody.data.metrics.totalAnalyses, 3);
    assert.equal(activityBody.data.metrics.highRiskAnalyses, 2);
  });

  await t.test("4. Rate limiter instances maintain completely isolated per-IP counters", async () => {
    const limiterA = createRateLimiter({ windowMs: 60_000, max: 2, message: "Limiter A hit" });
    const limiterB = createRateLimiter({ windowMs: 60_000, max: 2, message: "Limiter B hit" });

    const runLimiter = (limiter, ip) =>
      new Promise((resolve) => {
        const headersMap = new Map();
        const req = { ip, headers: {}, socket: { remoteAddress: ip } };
        const res = {
          statusCode: 200,
          setHeader(key, val) {
            headersMap.set(key.toLowerCase(), val);
          },
          getHeader(key) {
            return headersMap.get(key.toLowerCase());
          },
          status(code) {
            this.statusCode = code;
            return this;
          },
          json(payload) {
            resolve({ allowed: false, status: this.statusCode, payload });
          },
        };
        limiter(req, res, () => resolve({ allowed: true }));
      });

    const prevNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      assert.equal((await runLimiter(limiterA, "198.51.100.7")).allowed, true);
      assert.equal((await runLimiter(limiterA, "198.51.100.7")).allowed, true);
      const blockedA = await runLimiter(limiterA, "198.51.100.7");
      assert.equal(blockedA.allowed, false);
      assert.equal(blockedA.status, 429);

      // Separate rate limiter instance must not share limiterA's counter for the same IP
      const allowedB = await runLimiter(limiterB, "198.51.100.7");
      assert.equal(allowedB.allowed, true);
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
    }
  });

  await t.test("5. Analysis scoping, delete semantics (404 vs 403), and missing workspace guard", async () => {
    analysesStore.clear();

    await userRepository.create({
      name: "Alice Scoped",
      email: "alice-scope@example.com",
      passwordHash: await hashPassword("Password@123"),
      isEmailVerified: 1,
    });
    const bob = await userRepository.create({
      name: "Bob Scoped",
      email: "bob-scope@example.com",
      passwordHash: await hashPassword("Password@123"),
      isEmailVerified: 1,
    });

    await analysesStore.save("anon_analysis_1", {
      user: null,
      targetDir: "/var/private/internal-checkout-repo",
      summary: { riskLevel: "LOW" },
    });
    await analysesStore.save("bob_analysis_1", {
      user: bob.id,
      targetDir: "/var/private/bob-secret-repo",
      summary: { riskLevel: "HIGH" },
    });

    // Unauthenticated list: sees only anonymous analyses with basename-redacted targetDir
    const unauthListRes = await fetch(`${baseUrl}/api/v1/analyses`);
    assert.equal(unauthListRes.status, 200);
    const unauthListBody = await unauthListRes.json();
    assert.ok(Array.isArray(unauthListBody.data));
    assert.equal(unauthListBody.data.length, 1);
    assert.equal(unauthListBody.data[0].analysisId, "anon_analysis_1");
    assert.equal(unauthListBody.data[0].targetDir, "internal-checkout-repo");

    // Authenticated Alice list: must not see Bob's or anonymous analyses
    const aliceLogin = await loginAs("alice-scope@example.com");
    assert.equal(aliceLogin.status, 200);
    const aliceListRes = await fetch(`${baseUrl}/api/v1/analyses`, {
      headers: { Cookie: aliceLogin.cookie },
    });
    assert.equal(aliceListRes.status, 200);
    const aliceListBody = await aliceListRes.json();
    assert.ok(Array.isArray(aliceListBody.data));
    assert.equal(aliceListBody.data.length, 0);

    // Deleting non-existent ID returns 404 ANALYSIS_NOT_FOUND
    const delMissing = await fetch(`${baseUrl}/api/v1/analyses/does_not_exist_999`, {
      method: "DELETE",
      headers: { Cookie: aliceLogin.cookie },
    });
    assert.equal(delMissing.status, 404);
    assert.equal((await delMissing.json()).error.code, "ANALYSIS_NOT_FOUND");

    // Deleting someone else's or anonymous analysis returns 403 FORBIDDEN
    const delAnon = await fetch(`${baseUrl}/api/v1/analyses/anon_analysis_1`, {
      method: "DELETE",
      headers: { Cookie: aliceLogin.cookie },
    });
    assert.equal(delAnon.status, 403);
    assert.equal((await delAnon.json()).error.code, "FORBIDDEN");

    // Simulating on a missing non-sample targetDir fails explicitly instead of falling back to sample
    await analysesStore.save("missing_ws_1", {
      user: null,
      targetDir: "D:/non-existent-changelens-workspace-xyz-404",
      summary: { riskLevel: "LOW" },
    });
    const simRes = await fetch(`${baseUrl}/api/v1/analyses/missing_ws_1/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ simulatedFile: "api/server.js", changeType: "modified" }),
    });
    assert.equal(simRes.status, 400);
    assert.equal((await simRes.json()).error.code, "WORKSPACE_UNAVAILABLE");
  });

  await t.test("6. generateTestCommand prioritizes impacted test extensions over unrelated repo scripts", () => {
    const cmd = generateTestCommand(
      ["tests/auth.test.js", "tests/api.test.js"],
      ["scripts/deploy.py", "tests/auth.test.js", "tests/api.test.js"]
    );
    assert.equal(cmd, "npm test -- tests/auth.test.js tests/api.test.js");
  });

  await t.test("7. AnalysisQueue.reconcileStaleJobs handles disconnected Mongo safely & feedback caps >14MB inline media", async () => {
    const updated = await analysisQueue.reconcileStaleJobs();
    assert.equal(updated, 0);

    // Two 6 MB raw payloads => ~8 MB base64 each => ~16 MB inline data (> 14 MB Mongo-safe limit)
    const oversizedBase64 = Buffer.alloc(6 * 1024 * 1024, 0x41).toString("base64");
    const dataUrl = `data:video/mp4;base64,${oversizedBase64}`;

    const res = await fetch(`${baseUrl}/api/v1/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "bug_report",
        title: "Large inline video payload",
        message: "Testing aggregate base64 payload enforcement.",
        attachments: [
          { fileName: "clip1.mp4", dataUrl },
          { fileName: "clip2.mp4", dataUrl },
        ],
      }),
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, "ATTACHMENTS_TOO_LARGE");
  });
});
