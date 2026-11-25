const SESSION_COOKIE_NAME = "changelens.sid";

function splitOrigins(raw) {
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

/**
 * Builds the CORS origin allowlist from local defaults and configured frontend URLs.
 */
export function parseAllowedOrigins() {
  const defaults = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
  ];

  const configured = [
    ...splitOrigins(process.env.FRONTEND_ORIGIN),
    ...splitOrigins(process.env.FRONTEND_URL),
  ];

  return [...new Set([...defaults, ...configured])];
}

/**
 * Resolves session cookie flags compatible with both single-host and split-domain deployments.
 */
export function getSessionCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  const secure =
    process.env.COOKIE_SECURE === "true" ||
    (process.env.COOKIE_SECURE !== "false" && isProd);

  const configuredOrigins = [
    ...splitOrigins(process.env.FRONTEND_ORIGIN),
    ...splitOrigins(process.env.FRONTEND_URL),
  ];
  const hasHttpsFrontendOrigin = configuredOrigins.some((origin) =>
    origin.startsWith("https://")
  );

  let sameSite = process.env.COOKIE_SAMESITE
    ? process.env.COOKIE_SAMESITE.trim().toLowerCase()
    : secure && hasHttpsFrontendOrigin
    ? "none"
    : "lax";

  // Modern browsers reject SameSite=None without Secure=true
  if (sameSite === "none" && !secure) {
    sameSite = "lax";
  }

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

/**
 * Clears the session cookie using matching path, SameSite, and Secure attributes.
 */
export function clearSessionCookie(res) {
  const { httpOnly, secure, sameSite, path } = getSessionCookieOptions();
  res.clearCookie(SESSION_COOKIE_NAME, { path, httpOnly, secure, sameSite });
}
