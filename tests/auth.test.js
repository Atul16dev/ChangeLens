process.env.NODE_ENV = "test";

import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../api/app.js";
import { userRepository } from "../api/db/user-repository.js";
import { otpRepository } from "../api/db/otp-repository.js";
import { getSentEmails, clearSentEmails, findLatestEmailFor } from "../api/services/email.js";
import { hashPassword } from "../api/services/hash.js";

test("ChangeLens Authentication System Test Suite", async (t) => {
  // Reset in-memory stores for clean test isolation
  userRepository.clearMemory();
  otpRepository.clearMemory();
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

  // Helper to extract 6-digit OTP from email
  function extractOtpFromEmail(emailObj) {
    if (!emailObj) return null;
    const match = emailObj.text.match(/\b\d{6}\b/);
    return match ? match[0] : null;
  }

  // --- Registration Tests ---
  await t.test("POST /api/v1/auth/register validates required fields and password strength", async () => {
    // Missing name
    let res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", email: "dev@example.com", password: "Password123!", confirmPassword: "Password123!" }),
    });
    assert.equal(res.status, 400);
    let body = await res.json();
    assert.equal(body.error.code, "VALIDATION_ERROR");

    // Invalid email format
    res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Dev User", email: "invalid-email", password: "Password123!", confirmPassword: "Password123!" }),
    });
    assert.equal(res.status, 400);

    // Mismatched passwords
    res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Dev User", email: "dev@example.com", password: "Password123!", confirmPassword: "PasswordXYZ!" }),
    });
    assert.equal(res.status, 400);

    // Weak password (no special char)
    res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Dev User", email: "dev@example.com", password: "Password123", confirmPassword: "Password123" }),
    });
    assert.equal(res.status, 400);
    body = await res.json();
    assert.equal(body.error.code, "WEAK_PASSWORD");
  });

  await t.test("POST /api/v1/auth/register successfully registers unverified user and sends OTP email", async () => {
    clearSentEmails();

    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice Engineer",
        email: "alice@company.dev",
        password: "SuperSecretPassword123!",
        confirmPassword: "SuperSecretPassword123!",
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.email, "alice@company.dev");

    // Check email was sent
    const email = findLatestEmailFor("alice@company.dev");
    assert.ok(email);
    assert.ok(email.subject.includes("Verification Code"));

    // Verify OTP exists in message
    const otp = extractOtpFromEmail(email);
    assert.ok(otp);
    assert.match(otp, /^\d{6}$/);

    // Verify user in DB is unverified and has no plaintext password
    const userInDb = await userRepository.findByEmail("alice@company.dev");
    assert.ok(userInDb);
    assert.equal(userInDb.is_email_verified, 0);
    assert.ok(userInDb.password_hash.startsWith("$argon2id$"));
    assert.notEqual(userInDb.password_hash, "SuperSecretPassword123!");
  });

  // --- Email Verification Tests ---
  await t.test("POST /api/v1/auth/verify-email rejects invalid or expired OTP", async () => {
    // Bad OTP format
    let res = await fetch(`${baseUrl}/api/v1/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "alice@company.dev", otp: "abc" }),
    });
    assert.equal(res.status, 400);
    let body = await res.json();
    assert.equal(body.error.code, "INVALID_OTP_FORMAT");

    // Incorrect OTP
    res = await fetch(`${baseUrl}/api/v1/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "alice@company.dev", otp: "000000" }),
    });
    assert.equal(res.status, 400);
    body = await res.json();
    assert.equal(body.error.code, "INVALID_OTP");
  });

  let aliceSessionCookie;

  await t.test("POST /api/v1/auth/verify-email succeeds with valid OTP and creates session", async () => {
    const email = findLatestEmailFor("alice@company.dev");
    const otp = extractOtpFromEmail(email);

    const res = await fetch(`${baseUrl}/api/v1/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "alice@company.dev", otp }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.user.email, "alice@company.dev");
    assert.equal(body.data.user.is_email_verified, true);
    assert.equal(body.data.user.password_hash, undefined);

    // Session cookie issued
    aliceSessionCookie = extractCookie(res);
    assert.ok(aliceSessionCookie);
  });

  await t.test("GET /api/v1/auth/me returns profile for authenticated user", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Cookie: aliceSessionCookie },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.user.email, "alice@company.dev");
    assert.equal(body.data.user.name, "Alice Engineer");
    assert.equal(body.data.user.password_hash, undefined);
  });

  await t.test("GET /api/v1/auth/me returns 401 when unauthenticated", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, "UNAUTHORIZED");
  });

  await t.test("POST /api/v1/auth/register prevents duplicate verified registration", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice Clone",
        email: "alice@company.dev",
        password: "NewPassword999!",
        confirmPassword: "NewPassword999!",
      }),
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.error.code, "EMAIL_ALREADY_EXISTS");
  });

  // --- Login Tests ---
  await t.test("POST /api/v1/auth/login validates credentials with timing-safe generic errors", async () => {
    // Non-existent email
    let res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nobody@example.com", password: "Password123!" }),
    });
    assert.equal(res.status, 401);
    let body = await res.json();
    assert.equal(body.error.code, "INVALID_CREDENTIALS");

    // Wrong password
    res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "alice@company.dev", password: "WrongPassword123!" }),
    });
    assert.equal(res.status, 401);
    body = await res.json();
    assert.equal(body.error.code, "INVALID_CREDENTIALS");
  });

  await t.test("POST /api/v1/auth/login blocks unverified accounts with 403", async () => {
    // Create an unverified user
    const hash = await hashPassword("ValidPass123!");
    await userRepository.create({
      name: "Bob Unverified",
      email: "bob@company.dev",
      passwordHash: hash,
      isEmailVerified: 0,
    });

    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "bob@company.dev", password: "ValidPass123!" }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error.code, "EMAIL_NOT_VERIFIED");
  });

  await t.test("POST /api/v1/auth/login succeeds for verified user and rotates session", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "alice@company.dev", password: "SuperSecretPassword123!" }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.user.email, "alice@company.dev");

    const newCookie = extractCookie(res);
    assert.ok(newCookie);

    // Verify session works
    const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Cookie: newCookie },
    });
    assert.equal(meRes.status, 200);
  });

  // --- Logout Tests ---
  await t.test("POST /api/v1/auth/logout invalidates session and clears cookie", async () => {
    // Login to get fresh cookie
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "alice@company.dev", password: "SuperSecretPassword123!" }),
    });
    const cookie = extractCookie(loginRes);

    // Logout
    const logoutRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
    assert.equal(logoutRes.status, 200);

    // Subsequent /me returns 401
    const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Cookie: cookie },
    });
    assert.equal(meRes.status, 401);
  });

  // --- Forgot Password & Reset Tests ---
  await t.test("Password Reset Flow: Forgot -> Verify OTP -> Reset -> Invalidate Sessions", async () => {
    clearSentEmails();

    // 1. Request password reset
    const forgotRes = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "alice@company.dev" }),
    });
    assert.equal(forgotRes.status, 200);

    const email = findLatestEmailFor("alice@company.dev");
    assert.ok(email);
    assert.ok(email.subject.includes("Password Reset Code"));
    const resetOtp = extractOtpFromEmail(email);
    assert.ok(resetOtp);

    // 2. Verify reset OTP
    const verifyOtpRes = await fetch(`${baseUrl}/api/v1/auth/verify-reset-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "alice@company.dev", otp: resetOtp }),
    });
    assert.equal(verifyOtpRes.status, 200);
    const verifyBody = await verifyOtpRes.json();
    assert.ok(verifyBody.data.resetToken);
    const resetToken = verifyBody.data.resetToken;

    // 3. Reset password with new password
    const resetRes = await fetch(`${baseUrl}/api/v1/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "alice@company.dev",
        resetToken,
        newPassword: "BrandNewSecurePassword456!",
        confirmPassword: "BrandNewSecurePassword456!",
      }),
    });
    assert.equal(resetRes.status, 200);

    // 4. Old password fails
    const oldLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "alice@company.dev", password: "SuperSecretPassword123!" }),
    });
    assert.equal(oldLoginRes.status, 401);

    // 5. New password succeeds
    const newLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "alice@company.dev", password: "BrandNewSecurePassword456!" }),
    });
    assert.equal(newLoginRes.status, 200);
  });

  // --- Cooldown Enforcement Test ---
  await t.test("POST /api/v1/auth/resend-verification-otp enforces 60-second cooldown", async () => {
    // Register unverified user Charlie
    await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Charlie Dev",
        email: "charlie@company.dev",
        password: "Passcode123!",
        confirmPassword: "Passcode123!",
      }),
    });

    // Immediate resend should trigger 429 COOLDOWN_ACTIVE
    const resendRes = await fetch(`${baseUrl}/api/v1/auth/resend-verification-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "charlie@company.dev" }),
    });

    assert.equal(resendRes.status, 429);
    const body = await resendRes.json();
    assert.equal(body.error.code, "COOLDOWN_ACTIVE");
    assert.ok(body.error.retryAfter > 0);
  });
});
