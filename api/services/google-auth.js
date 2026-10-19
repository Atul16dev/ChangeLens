import { OAuth2Client } from "google-auth-library";

export function isGoogleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/v1/auth/google/callback";

  if (!clientId || !clientSecret) {
    return null;
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

export function getGoogleAuthUrl(state) {
  const client = getGoogleOAuthClient();
  if (!client) {
    throw new Error("Google OAuth credentials are not configured in environment variables.");
  }

  return client.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "profile", "email"],
    state,
    prompt: "select_account",
  });
}

export async function verifyGoogleCode(code) {
  const client = getGoogleOAuthClient();
  if (!client) {
    throw new Error("Google OAuth credentials are not configured.");
  }

  const { tokens } = await client.getToken(code);
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error("Failed to parse Google ID token payload.");
  }

  if (!payload.email_verified) {
    throw new Error("Google account email is not verified.");
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split("@")[0],
    picture: payload.picture,
  };
}
