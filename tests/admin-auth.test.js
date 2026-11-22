process.env.NODE_ENV = "test";
process.env.SUPER_ADMIN_EMAILS = "owner@changelens.io,super@changelens.io";

import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../api/app.js";
import { userRepository } from "../api/db/user-repository.js";
import { otpRepository } from "../api/db/otp-repository.js";
import { adminInvitationRepository } from "../api/db/admin-invitation-repository.js";
import { clearSentEmails } from "../api/services/email.js";
import { hashPassword } from "../api/services/hash.js";

test("ChangeLens 2-Tier Admin & Role-Based Auth Suite (Phase 1)", async (t) => {
  // Clean memory stores before running tests
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
    adminInvitationRepository.clearMemory();
  });

  // Helper to extract session cookie from response
  function extractCookie(res) {
    const setCookie = res.headers.get("set-cookie");
    if (!setCookie) return null;
    const match = setCookie.match(/changelens\.sid=([^;]+)/);
    return match ? `changelens.sid=${match[1]}` : null;
  }

  // Pre-seed test users
  const defaultPassword = "Password@123";
  const defaultPasswordHash = await hashPassword(defaultPassword);

  // 1. Super Admin (Owner - matches SUPER_ADMIN_EMAILS)
  const ownerUser = await userRepository.create({
    name: "Platform Owner",
    email: "owner@changelens.io",
    passwordHash: defaultPasswordHash,
    isEmailVerified: 1,
  });

  // 2. Standard User
  const standardUser = await userRepository.create({
    name: "Regular Dev",
    email: "developer@example.com",
    passwordHash: defaultPasswordHash,
    isEmailVerified: 1,
  });

  // 3. User to be invited as Admin
  const inviteeUser = await userRepository.create({
    name: "Sarah Moderator",
    email: "sarah@example.com",
    passwordHash: defaultPasswordHash,
    isEmailVerified: 1,
  });

  // 4. User to be invited as Co-SuperAdmin
  const coOwnerUser = await userRepository.create({
    name: "Alex CoOwner",
    email: "alex@example.com",
    passwordHash: defaultPasswordHash,
    isEmailVerified: 1,
  });

  // Helper to log in a user and get session cookie
  async function login(email, password = defaultPassword) {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(res.status, 200, `Login should succeed for ${email}`);
    const cookie = extractCookie(res);
    assert.ok(cookie, "Session cookie must be returned");
    const body = await res.json();
    return { cookie, user: body.data.user };
  }

  let ownerCookie;
  let standardCookie;
  let inviteeCookie;
  let coOwnerCookie;

  await t.test("Login users and verify bootstrap roles", async () => {
    const ownerLogin = await login("owner@changelens.io");
    ownerCookie = ownerLogin.cookie;
    assert.equal(ownerLogin.user.role, "superadmin", "Owner must be automatically recognized as superadmin");
    assert.equal(ownerLogin.user.permissions.canModerateFeedback, true);
    assert.equal(ownerLogin.user.permissions.canManageUsers, true);

    const standardLogin = await login("developer@example.com");
    standardCookie = standardLogin.cookie;
    assert.equal(standardLogin.user.role, "user", "Standard user role must be 'user'");

    const inviteeLogin = await login("sarah@example.com");
    inviteeCookie = inviteeLogin.cookie;
    assert.equal(inviteeLogin.user.role, "user");

    const coOwnerLogin = await login("alex@example.com");
    coOwnerCookie = coOwnerLogin.cookie;
    assert.equal(coOwnerLogin.user.role, "user");
  });

  await t.test("Unauthenticated requests are rejected with 401", async () => {
    const resMe = await fetch(`${baseUrl}/api/v1/admin/me`);
    assert.equal(resMe.status, 401);
    const bodyMe = await resMe.json();
    assert.equal(bodyMe.error.code, "UNAUTHORIZED");

    const resInvites = await fetch(`${baseUrl}/api/v1/admin/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" }),
    });
    assert.equal(resInvites.status, 401);
  });

  await t.test("Standard users are rejected with 403 Forbidden from admin endpoints", async () => {
    const resMe = await fetch(`${baseUrl}/api/v1/admin/me`, {
      headers: { Cookie: standardCookie },
    });
    assert.equal(resMe.status, 403);
    const bodyMe = await resMe.json();
    assert.equal(bodyMe.error.code, "FORBIDDEN_ADMIN_REQUIRED");

    const resUsers = await fetch(`${baseUrl}/api/v1/admin/users`, {
      headers: { Cookie: standardCookie },
    });
    assert.equal(resUsers.status, 403);

    const resInvite = await fetch(`${baseUrl}/api/v1/admin/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: standardCookie },
      body: JSON.stringify({ email: "target@example.com" }),
    });
    assert.equal(resInvite.status, 403);
  });

  await t.test("Super Admin can view /api/v1/admin/me and user directory", async () => {
    const resMe = await fetch(`${baseUrl}/api/v1/admin/me`, {
      headers: { Cookie: ownerCookie },
    });
    assert.equal(resMe.status, 200);
    const bodyMe = await resMe.json();
    assert.equal(bodyMe.success, true);
    assert.equal(bodyMe.data.isSuperAdmin, true);
    assert.equal(bodyMe.data.user.role, "superadmin");

    const resUsers = await fetch(`${baseUrl}/api/v1/admin/users`, {
      headers: { Cookie: ownerCookie },
    });
    assert.equal(resUsers.status, 200);
    const bodyUsers = await resUsers.json();
    assert.equal(bodyUsers.success, true);
    assert.ok(Array.isArray(bodyUsers.data.users));
    assert.ok(bodyUsers.data.total >= 4);
  });

  let adminInviteToken;
  let superAdminInviteToken;

  await t.test("Super Admin sends invitation for Admin with granular permissions", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: ownerCookie },
      body: JSON.stringify({
        email: "sarah@example.com",
        role: "admin",
        permissions: {
          canModerateFeedback: true,
          canViewAnalytics: true,
          canManageUsers: false,
        },
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.invitation.role, "admin");
    assert.equal(body.data.invitation.email, "sarah@example.com");
    assert.equal(body.data.invitation.permissions.canModerateFeedback, true);
    assert.equal(body.data.invitation.permissions.canViewAnalytics, true);
    assert.equal(body.data.invitation.permissions.canManageUsers, false);
    assert.ok(body.data.token, "Invitation token must be returned");
    assert.ok(body.data.inviteUrl.includes(body.data.token));

    adminInviteToken = body.data.token;
  });

  await t.test("Super Admin sends invitation for another Super Admin (Co-Owner)", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: ownerCookie },
      body: JSON.stringify({
        email: "alex@example.com",
        role: "superadmin",
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.invitation.role, "superadmin");
    assert.equal(body.data.invitation.permissions.canManageUsers, true);
    assert.equal(body.data.invitation.permissions.canModerateFeedback, true);

    superAdminInviteToken = body.data.token;
  });

  await t.test("Public verify token endpoint checks invitation details", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/invites/verify/${adminInviteToken}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.valid, true);
    assert.equal(body.data.email, "sarah@example.com");
    assert.equal(body.data.role, "admin");
    assert.equal(body.data.permissions.canModerateFeedback, true);

    const invalidRes = await fetch(`${baseUrl}/api/v1/admin/invites/verify/fake-token-12345`);
    assert.equal(invalidRes.status, 400);
  });

  await t.test("Accepting invite enforces email matching for logged in users", async () => {
    // Attempting to accept Sarah's invite while logged in as developer@example.com
    const res = await fetch(`${baseUrl}/api/v1/admin/invites/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: standardCookie },
      body: JSON.stringify({ token: adminInviteToken }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error.code, "EMAIL_MISMATCH");
  });

  await t.test("Invited user successfully accepts Admin invitation and gains privileges", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/invites/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: inviteeCookie },
      body: JSON.stringify({ token: adminInviteToken }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.user.role, "admin");
    assert.equal(body.data.user.permissions.canModerateFeedback, true);
    assert.equal(body.data.user.permissions.canViewAnalytics, true);
    assert.equal(body.data.user.permissions.canManageUsers, false);

    // Verify Sarah can now access /api/v1/admin/me as admin
    const resMe = await fetch(`${baseUrl}/api/v1/admin/me`, {
      headers: { Cookie: inviteeCookie },
    });
    assert.equal(resMe.status, 200);
    const bodyMe = await resMe.json();
    assert.equal(bodyMe.data.isSuperAdmin, false);
    assert.equal(bodyMe.data.user.role, "admin");
  });

  await t.test("Re-using an already accepted token fails", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/invites/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: inviteeCookie },
      body: JSON.stringify({ token: adminInviteToken }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, "INVALID_OR_EXPIRED_TOKEN");
  });

  await t.test("Standard Admin CANNOT send invitations or update roles (403)", async () => {
    // Sarah is now an Admin, but NOT a Super Admin
    const resInvite = await fetch(`${baseUrl}/api/v1/admin/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: inviteeCookie },
      body: JSON.stringify({ email: "newguy@example.com", role: "admin" }),
    });
    assert.equal(resInvite.status, 403);
    const bodyInvite = await resInvite.json();
    assert.equal(bodyInvite.error.code, "FORBIDDEN_SUPER_ADMIN_REQUIRED");

    // Sarah cannot modify user accessibility
    const resAccess = await fetch(`${baseUrl}/api/v1/admin/users/${standardUser.id}/access`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: inviteeCookie },
      body: JSON.stringify({ role: "admin" }),
    });
    assert.equal(resAccess.status, 403);
  });

  await t.test("Super Admin accepts Co-SuperAdmin invitation and gains Super Admin role", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/invites/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: coOwnerCookie },
      body: JSON.stringify({ token: superAdminInviteToken }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.user.role, "superadmin");

    // Alex can now also send invitations because Alex is now a Super Admin
    const resAlexInvite = await fetch(`${baseUrl}/api/v1/admin/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: coOwnerCookie },
      body: JSON.stringify({ email: "staff@example.com", role: "admin" }),
    });
    assert.equal(resAlexInvite.status, 201);
  });

  await t.test("Super Admin can modify accessibility permissions of an existing Admin", async () => {
    // Owner modifies Sarah's permissions to grant canManageUsers: true
    const res = await fetch(`${baseUrl}/api/v1/admin/users/${inviteeUser.id}/access`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: ownerCookie },
      body: JSON.stringify({
        permissions: {
          canModerateFeedback: true,
          canManageUsers: true,
          canViewAnalytics: true,
        },
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.user.permissions.canManageUsers, true);
  });

  await t.test("Super Admin can revoke Admin access (demoting back to standard user)", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/users/${inviteeUser.id}/access`, {
      method: "DELETE",
      headers: { Cookie: ownerCookie },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.user.role, "user");
    assert.equal(body.data.user.permissions.canModerateFeedback, false);

    // Sarah should no longer be able to access /api/v1/admin/me
    const resMe = await fetch(`${baseUrl}/api/v1/admin/me`, {
      headers: { Cookie: inviteeCookie },
    });
    assert.equal(resMe.status, 403);
  });

  await t.test("Super Admin cannot demote their own account", async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/users/${ownerUser.id}/access`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: ownerCookie },
      body: JSON.stringify({ role: "user" }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, "CANNOT_DEMOTE_SELF");
  });
});
