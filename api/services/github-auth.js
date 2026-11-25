/**
 * GitHub OAuth Integration Service for ChangeLens
 * 
 * Provides 1-click GitHub authentication for developers.
 */

export function isGitHubAuthConfigured() {
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

export function getGitHubAuthUrl(state) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri =
    process.env.GITHUB_REDIRECT_URI || "http://localhost:5000/api/v1/auth/github/callback";

  if (!clientId) {
    throw new Error("GITHUB_CLIENT_ID is not configured in environment variables.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user user:email",
    state,
    allow_signup: "true",
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeGitHubCode(code) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri =
    process.env.GITHUB_REDIRECT_URI || "http://localhost:5000/api/v1/auth/github/callback";

  if (!clientId || !clientSecret) {
    throw new Error("GitHub OAuth credentials are not configured on this server.");
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange GitHub authorization code: HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  if (!data.access_token) {
    throw new Error("No access token returned from GitHub OAuth endpoint.");
  }

  return data.access_token;
}

export async function getGitHubUserProfile(accessToken) {
  // 1. Fetch GitHub User Profile
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "ChangeLens-Platform",
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!userRes.ok) {
    throw new Error(`Failed to fetch GitHub user profile: HTTP ${userRes.status}`);
  }

  const userData = await userRes.json();
  let email = userData.email;

  // 2. If email is private or null, fetch from /user/emails
  if (!email) {
    try {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "ChangeLens-Platform",
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (emailsRes.ok) {
        const emails = await emailsRes.json();
        if (Array.isArray(emails) && emails.length > 0) {
          const primary = emails.find((e) => e.primary && e.verified);
          const verified = emails.find((e) => e.verified);
          email = primary?.email || verified?.email || emails[0]?.email;
        }
      }
    } catch (emailErr) {
      console.warn("[GitHubAuth] Failed to fetch user emails:", emailErr.message);
    }
  }

  // Fallback to GitHub noreply email if still missing
  if (!email && userData.login) {
    email = `${userData.id}+${userData.login}@users.noreply.github.com`;
  }

  return {
    githubId: String(userData.id),
    username: userData.login,
    name: userData.name || userData.login,
    email: email.trim().toLowerCase(),
    avatar: userData.avatar_url || null,
  };
}

/**
 * End-to-end verifier combining token exchange and profile retrieval
 */
export async function verifyGitHubCode(code) {
  if (!code || typeof code !== "string") {
    throw new Error("Missing or invalid GitHub authorization code.");
  }

  // Mock hook for unit testing and CI sandbox environments
  if (process.env.MOCK_GITHUB_OAUTH === "true" && code.startsWith("mock_gh_")) {
    return {
      githubId: "gh_98765432",
      username: "octocat-dev",
      name: "The Octocat",
      email: "octocat@github.dev",
      avatar: "https://avatars.githubusercontent.com/u/583231?v=4",
    };
  }

  const accessToken = await exchangeGitHubCode(code);
  return await getGitHubUserProfile(accessToken);
}
