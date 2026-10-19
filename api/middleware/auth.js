import { userRepository, toSafeUser } from "../db/user-repository.js";

/**
 * Middleware that hydrates req.user if a session contains userId
 */
export async function hydrateUser(req, res, next) {
  if (!req.session || !req.session.userId) {
    req.user = null;
    return next();
  }

  try {
    const rawUser = await userRepository.findById(req.session.userId);
    if (!rawUser) {
      // User was deleted or no longer exists
      req.session.destroy(() => {
        res.clearCookie("changelens.sid");
        req.user = null;
        next();
      });
      return;
    }

    req.user = toSafeUser(rawUser);
    next();
  } catch (err) {
    console.error("[Auth Middleware] Hydrate user error:", err);
    req.user = null;
    next();
  }
}

/**
 * Route guard requiring authenticated session
 */
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "You must be logged in to perform this action.",
        requestId: req.id,
      },
    });
  }
  next();
}

/**
 * Route guard requiring verified email
 */
export function requireVerified(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required.",
        requestId: req.id,
      },
    });
  }

  if (!req.user.is_email_verified) {
    return res.status(403).json({
      success: false,
      error: {
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email address to access this feature.",
        requestId: req.id,
      },
    });
  }

  next();
}

/**
 * In-memory sliding window rate limiter for auth endpoints
 */
const rateLimitMap = new Map();

export function createRateLimiter({ windowMs = 60 * 1000, max = 15, message = "Too many requests, please try again later." } = {}) {
  return function rateLimiter(req, res, next) {
    if (process.env.NODE_ENV === "test" && !process.env.TEST_RATE_LIMIT) {
      return next(); // bypass in tests unless specifically testing rate limiter
    }

    const ip = req.ip || req.connection.remoteAddress || "global";
    const now = Date.now();

    let entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetTime) {
      entry = { count: 1, resetTime: now + windowMs };
      rateLimitMap.set(ip, entry);
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message,
          retryAfter,
          requestId: req.id,
        },
      });
    }

    next();
  };
}
