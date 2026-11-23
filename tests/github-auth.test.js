process.env.NODE_ENV = "test";

import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../api/app.js";
import { userRepository } from "../api/db/user-repository.js";
import {
  isGitHubAuthConfigured,
  getGitHubAuthUrl,
} from "../api/services/github-auth.js";

test("GitHub OAuth Authentication Test Suite", async (t) => {
  // Save initial env
  const origClientId = process.env.GITHUB_CLIENT_ID;
  const origClientSecret = process.env.GITHUB_CLIENT_SECRET;
  const origMockAuth = process.env.MOCK_GITHUB_OAUTH;

  userRepository.clearMemory();

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
    process.env.GITHUB_CLIENT_ID = origClientId;
    process.env.GITHUB_CLIENT_SECRET = origClientSecret;
    process.env.MOCK_GITHUB_OAUTH = origMockAuth;
  });

  // Helper to extract session cookie from response
  function extractCookie(res) {
    const setCookie = res.headers.get("set-cookie");
    if (!setCookie) return null;
    const match = setCookie.match(/changelens\.sid=([^;]+)/);
    return match ? `changelens.sid=${match[1]}` : null;
  }

  // --- Service Unit Tests ---
  await t.test("GitHub Service: isGitHubAuthConfigured() detects presence of credentials", () => {
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    assert.equal(isGitHubAuthConfigured(), false);

    process.env.GITHUB_CLIENT_ID = "test_client_id";
    assert.equal(isGitHubAuthConfigured(), false);

    process.env.GITHUB_CLIENT_SECRET = "test_client_secret";
    assert.equal(isGitHubAuthConfigured(), true);
  });

  await t.test("GitHub Service: getGitHubAuthUrl() builds authorization URL with state", () => {
    process.env.GITHUB_CLIENT_ID = "test_client_id";
    const url = getGitHubAuthUrl("random_state_123");
    assert.ok(url.startsWith("https://github.com/login/oauth/authorize"));
    assert.ok(url.includes("client_id=test_client_id"));
    assert.ok(url.includes("state=random_state_123"));
    assert.ok(url.includes("scope=read%3Auser+user%3Aemail"));
  });

  // --- API Endpoint Tests ---
  await t.test("GET /api/v1/auth/github returns 503 when OAuth not configured", async () => {
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;

    const res = await fetch(`${baseUrl}/api/v1/auth/github`, { redirect: "manual" });
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.error.code, "GITHUB_AUTH_UNAVAILABLE");
  });

  await t.test("GET /api/v1/auth/github redirects to GitHub OAuth with state", async () => {
    process.env.GITHUB_CLIENT_ID = "test_client_id";
    process.env.GITHUB_CLIENT_SECRET = "test_client_secret";

    const res = await fetch(`${baseUrl}/api/v1/auth/github`, { redirect: "manual" });
    assert.equal(res.status, 302);
    const location = res.headers.get("location");
    assert.ok(location.startsWith("https://github.com/login/oauth/authorize"));
    assert.ok(location.includes("client_id=test_client_id"));

    // Session cookie must be set with the state
    const cookie = extractCookie(res);
    assert.ok(cookie, "Session cookie should be generated for state");
  });

  await t.test("GET /api/v1/auth/github/callback rejects missing or mismatched state", async () => {
    process.env.GITHUB_CLIENT_ID = "test_client_id";
    process.env.GITHUB_CLIENT_SECRET = "test_client_secret";

    // No session state
    const res = await fetch(`${baseUrl}/api/v1/auth/github/callback?code=abc&state=xyz`);
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error.code, "INVALID_OAUTH_STATE");
  });

  await t.test("GET /api/v1/auth/github/callback successfully logs in / creates new GitHub user", async () => {
    process.env.GITHUB_CLIENT_ID = "test_client_id";
    process.env.GITHUB_CLIENT_SECRET = "test_client_secret";
    process.env.MOCK_GITHUB_OAUTH = "true";

    // Step 1: Initiate OAuth to obtain state and session cookie
    const initRes = await fetch(`${baseUrl}/api/v1/auth/github`, { redirect: "manual" });
    const cookie = extractCookie(initRes);
    const location = initRes.headers.get("location");
    const stateMatch = location.match(/state=([^&]+)/);
    assert.ok(stateMatch, "State should be in redirect URL");
    const state = decodeURIComponent(stateMatch[1]);

    // Step 2: Callback with matching state and mock code
    const callbackRes = await fetch(
      `${baseUrl}/api/v1/auth/github/callback?code=mock_gh_code_123&state=${state}`,
      {
        headers: { Cookie: cookie },
        redirect: "manual",
      }
    );

    assert.equal(callbackRes.status, 302);
    const postLoginCookie = extractCookie(callbackRes) || cookie;

    // Step 3: Verify authenticated user with GET /api/v1/auth/me
    const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Cookie: postLoginCookie },
    });
    assert.equal(meRes.status, 200);
    const meBody = await meRes.json();
    assert.equal(meBody.success, true);
    assert.equal(meBody.data.user.email, "octocat@github.dev");
    assert.equal(meBody.data.user.github_username, "octocat-dev");
    assert.equal(meBody.data.user.auth_provider, "github");
    assert.equal(meBody.data.user.is_email_verified, true);
  });

  await t.test("GET /api/v1/auth/github/callback links GitHub account to existing user with matching email", async () => {
    userRepository.clearMemory();
    // Create an existing local user with matching email
    const localUser = await userRepository.create({
      name: "Existing Developer",
      email: "octocat@github.dev",
      passwordHash: "hash123",
      authProvider: "local",
      isEmailVerified: 1,
    });

    process.env.GITHUB_CLIENT_ID = "test_client_id";
    process.env.GITHUB_CLIENT_SECRET = "test_client_secret";
    process.env.MOCK_GITHUB_OAUTH = "true";

    // Initiate OAuth
    const initRes = await fetch(`${baseUrl}/api/v1/auth/github`, { redirect: "manual" });
    const cookie = extractCookie(initRes);
    const location = initRes.headers.get("location");
    const state = decodeURIComponent(location.match(/state=([^&]+)/)[1]);

    // Callback
    const callbackRes = await fetch(
      `${baseUrl}/api/v1/auth/github/callback?code=mock_gh_code_123&state=${state}`,
      {
        headers: { Cookie: cookie },
        redirect: "manual",
      }
    );
    assert.equal(callbackRes.status, 302);
    const postLoginCookie = extractCookie(callbackRes) || cookie;

    // Check user info
    const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Cookie: postLoginCookie },
    });
    const meBody = await meRes.json();
    assert.equal(meBody.data.user.id, localUser.id);
    assert.equal(meBody.data.user.github_username, "octocat-dev");
  });

  await t.test("POST /api/v1/auth/login gives clear error for passwordless GitHub accounts", async () => {
    userRepository.clearMemory();
    // Create user with null password and authProvider github
    await userRepository.create({
      name: "GitHub Only User",
      email: "ghonly@example.com",
      passwordHash: null,
      authProvider: "github",
      githubId: "gh_12345",
      isEmailVerified: 1,
    });

    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ghonly@example.com", password: "SomePassword123!" }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, "GITHUB_ACCOUNT_NO_PASSWORD");
  });
});
