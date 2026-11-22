process.env.NODE_ENV = "test";
process.env.SUPER_ADMIN_EMAILS = "owner@changelens.io";

import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../api/app.js";
import { userRepository } from "../api/db/user-repository.js";
import { otpRepository } from "../api/db/otp-repository.js";
import { adminInvitationRepository } from "../api/db/admin-invitation-repository.js";
import { clearSentEmails } from "../api/services/email.js";
import { hashPassword } from "../api/services/hash.js";

test("ChangeLens User Moderation & Banning Suite", async (t) => {
  // Clean in-memory stores before test run
  userRepository.clearMemory();
  otpRepository.clearMemory();
  adminInvitationRepository.clearMemory();
  clearSentEmails();

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
  });

  // Helper to extract session cookie from response
  function extractCookie(res) {
    const setCookie = res.headers.get("set-cookie");
    if (!setCookie) return null;
    const match = setCookie.match(/changelens\.sid=([^;]+)/);
    return match ? `changelens.sid=${match[1]}` : null;
  }

  const defaultPassword = "Password@123";
  const defaultPasswordHash = await hashPassword(defaultPassword);

  // 1. Super Admin (Owner)
  const ownerUser = await userRepository.create({
    name: "Platform Owner",
    email: "owner@changelens.io",
    passwordHash: defaultPasswordHash,
    isEmailVerified: 1,
  });

  // 2. Admin with user management permission
  const userManagerAdmin = await userRepository.create({
    name: "User Manager Admin",
    email: "moderator@changelens.io",
    passwordHash: defaultPasswordHash,
    isEmailVerified: 1,
    role: "admin",
    permissions: {
      canManageUsers: true,
      canModerateFeedback: true,
    },
  });

  // 3. Admin without user management permission
  const restrictedAdmin = await userRepository.create({
    name: "Restricted Admin",
    email: "restricted@changelens.io",
    passwordHash: defaultPasswordHash,
    isEmailVerified: 1,
    role: "admin",
    permissions: {
      canManageUsers: false,
      canModerateFeedback: true,
    },
  });

  // 4. Regular User A (To be banned)
  const regularUserA = await userRepository.create({
    name: "Developer Spammer",
    email: "spammer@example.com",
    passwordHash: defaultPasswordHash,
    isEmailVerified: 1,
  });

  // 5. Regular User B (Standard clean user)
  const regularUserB = await userRepository.create({
    name: "Clean Developer",
    email: "clean@example.com",
    passwordHash: defaultPasswordHash,
    isEmailVerified: 1,
  });

  async function login(email, password = defaultPassword) {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const cookie = extractCookie(res);
    const body = await res.json();
    return { status: res.status, cookie, body };
  }

  let ownerCookie;
  let managerCookie;
  let restrictedCookie;
  let userACookie;

  await t.test("Setup sessions for test roles", async () => {
    const ownerRes = await login("owner@changelens.io");
    assert.equal(ownerRes.status, 200);
    ownerCookie = ownerRes.cookie;

    const managerRes = await login("moderator@changelens.io");
    assert.equal(managerRes.status, 200);
    managerCookie = managerRes.cookie;

    const restrictedRes = await login("restricted@changelens.io");
    assert.equal(restrictedRes.status, 200);
    restrictedCookie = restrictedRes.cookie;

    const userARes = await login("spammer@example.com");
    assert.equal(userARes.status, 200);
    userACookie = userARes.cookie;
  });

  await t.test("Restricted Admin cannot ban users without canManageUsers (403)", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/users/${regularUserA.id}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: restrictedCookie },
      body: JSON.stringify({ reason: "Unauthorized attempt" }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error.code, "FORBIDDEN_USER_MANAGEMENT_REQUIRED");
  });

  await t.test("Super Admin cannot ban themselves", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/users/${ownerUser.id}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: ownerCookie },
      body: JSON.stringify({ reason: "Self ban attempt" }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error.code, "CANNOT_MANAGE_SELF");
  });

  await t.test("Admin with canManageUsers cannot ban another Admin or Super Admin", async () => {
    // Attempt to ban Super Admin
    const resSuper = await fetch(`${baseUrl}/api/v1/admin/users/${ownerUser.id}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ reason: "Illegal staff action" }),
    });
    assert.equal(resSuper.status, 403);
    const bodySuper = await resSuper.json();
    assert.equal(bodySuper.error.code, "FORBIDDEN_STAFF_MODERATION");

    // Attempt to ban another Admin
    const resAdmin = await fetch(`${baseUrl}/api/v1/admin/users/${restrictedAdmin.id}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ reason: "Illegal admin moderation" }),
    });
    assert.equal(resAdmin.status, 403);
    const bodyAdmin = await resAdmin.json();
    assert.equal(bodyAdmin.error.code, "FORBIDDEN_STAFF_MODERATION");
  });

  await t.test("Admin with canManageUsers successfully bans a regular user with reason", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/users/${regularUserA.id}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ reason: "Repeated malicious AST inputs and abusive feedback." }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.user.status, "banned");
    assert.equal(body.data.user.ban_reason, "Repeated malicious AST inputs and abusive feedback.");
    assert.equal(body.data.user.banned_by.email, "moderator@changelens.io");
    assert.ok(body.data.user.banned_at);
  });

  await t.test("Banned user cannot make authenticated requests (403 ACCOUNT_BANNED)", async () => {
    // Using userACookie that was created before the ban
    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Cookie: userACookie },
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error.code, "ACCOUNT_BANNED");
    assert.ok(body.error.message.includes("Repeated malicious AST inputs"));
  });

  await t.test("Banned user cannot log in (403 ACCOUNT_BANNED)", async () => {
    const loginRes = await login("spammer@example.com");
    assert.equal(loginRes.status, 403);
    assert.equal(loginRes.body.error.code, "ACCOUNT_BANNED");
    assert.ok(loginRes.body.error.message.includes("Repeated malicious AST inputs"));
  });

  await t.test("Admin can view user activity dossier and forensic metrics", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/users/${regularUserA.id}/activity`, {
      headers: { Cookie: managerCookie },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.user.id, regularUserA.id);
    assert.equal(body.data.user.status, "banned");
    assert.equal(body.data.metrics.totalAnalyses, 0);
    assert.equal(body.data.metrics.feedbackCount, 0);
  });

  await t.test("Admin can append internal staff notes to a user profile", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/users/${regularUserA.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ text: "Spammer account detected by automated rate limiter. Evidence confirmed." }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.adminNotes.length >= 1);
    assert.equal(body.data.adminNotes[0].text, "Spammer account detected by automated rate limiter. Evidence confirmed.");
    assert.equal(body.data.adminNotes[0].author_name, "User Manager Admin");
  });

  await t.test("Super Admin can unban a suspended user", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/users/${regularUserA.id}/unban`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: ownerCookie },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.user.status, "active");
    assert.equal(body.data.user.ban_reason, null);

    // Verify user can now log in again
    const loginRes = await login("spammer@example.com");
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.data.user.status, "active");
  });

  await t.test("Filtering users by status works accurately", async () => {
    // Re-ban regularUserA
    await fetch(`${baseUrl}/api/v1/admin/users/${regularUserA.id}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: ownerCookie },
      body: JSON.stringify({ reason: "Final suspension" }),
    });

    // Query banned users
    const resBanned = await fetch(`${baseUrl}/api/v1/admin/users?status=banned`, {
      headers: { Cookie: ownerCookie },
    });
    assert.equal(resBanned.status, 200);
    const bodyBanned = await resBanned.json();
    assert.equal(bodyBanned.data.users.length, 1);
    assert.equal(bodyBanned.data.users[0].id, regularUserA.id);
    assert.equal(bodyBanned.data.stats.banned, 1);
    assert.ok(bodyBanned.data.stats.active >= 4);
    assert.ok(bodyBanned.data.stats.total >= 5);

    // Query active users
    const resActive = await fetch(`${baseUrl}/api/v1/admin/users?status=active`, {
      headers: { Cookie: ownerCookie },
    });
    assert.equal(resActive.status, 200);
    const bodyActive = await resActive.json();
    assert.ok(bodyActive.data.users.length >= 4);
    assert.ok(bodyActive.data.users.every((u) => u.status === "active"));
    assert.equal(bodyActive.data.stats.banned, 1);
    assert.ok(bodyActive.data.stats.active >= 4);
  });
});
