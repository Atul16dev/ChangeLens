import { userRepository, toSafeUser } from "../db/user-repository.js";
import { clearSessionCookie } from "../utils/session-cookie.js";

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
        clearSessionCookie(res);
        req.user = null;
        next();
      });
      return;
    }

    // Invalidate session if password was reset/changed after this session was issued
    if (req.session.passwordChangedAtSnapshot !== undefined) {
      const currentSnapshot = rawUser.password_changed_at ? String(rawUser.password_changed_at) : null;
      if (currentSnapshot !== req.session.passwordChangedAtSnapshot) {
        req.session.destroy(() => {
          clearSessionCookie(res);
          req.user = null;
          next();
        });
        return;
      }
    } else if (rawUser.password_changed_at && req.session.sessionIssuedAt) {
      if (new Date(rawUser.password_changed_at).getTime() > req.session.sessionIssuedAt) {
        req.session.destroy(() => {
          clearSessionCookie(res);
          req.user = null;
          next();
        });
        return;
      }
    }

    req.user = toSafeUser(rawUser);
    next();
  } catch (err) {
    console.error("[Auth Middleware] Hydrate user error:", err);
    req.user = null;
    next();
  }
}

function rejectIfUnauthenticatedOrBanned(
  req,
  res,
  unauthorizedMessage = "You must be logged in to perform this action."
) {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: unauthorizedMessage,
        requestId: req.id,
      },
    });
    return true;
  }

  if (req.user.status === "banned") {
    res.status(403).json({
      success: false,
      error: {
        code: "ACCOUNT_BANNED",
        message: `Your account has been suspended by an administrator. Reason: ${req.user.ban_reason || "Violation of platform policies"}`,
        requestId: req.id,
      },
    });
    return true;
  }

  return false;
}

/**
 * Route guard requiring authenticated session
 */
export function requireAuth(req, res, next) {
  if (rejectIfUnauthenticatedOrBanned(req, res)) return;
  next();
}

/**
 * Route guard requiring verified email
 */
export function requireVerified(req, res, next) {
  if (rejectIfUnauthenticatedOrBanned(req, res, "Authentication required.")) return;

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
 * Route guard requiring admin or superadmin role
 */
export function requireAdmin(req, res, next) {
  if (rejectIfUnauthenticatedOrBanned(req, res)) return;

  if (req.user.role !== "admin" && req.user.role !== "superadmin") {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN_ADMIN_REQUIRED",
        message: "Admin privileges are required to access this resource.",
        requestId: req.id,
      },
    });
  }

  next();
}

/**
 * Route guard strictly requiring superadmin role (site owner)
 */
export function requireSuperAdmin(req, res, next) {
  if (rejectIfUnauthenticatedOrBanned(req, res)) return;

  if (req.user.role !== "superadmin") {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN_SUPER_ADMIN_REQUIRED",
        message: "Super Admin privileges are required to perform this action.",
        requestId: req.id,
      },
    });
  }

  next();
}

/**
 * Route guard checking specific admin accessibility permission
 * (Super Admin automatically satisfies all permissions)
 */
export function requirePermission(permissionName) {
  return function permissionGuard(req, res, next) {
    if (rejectIfUnauthenticatedOrBanned(req, res)) return;

    if (req.user.role === "superadmin") {
      return next();
    }

    if (req.user.role === "admin" && req.user.permissions?.[permissionName]) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN_PERMISSION_REQUIRED",
        message: `You do not have the required '${permissionName}' permission to perform this action.`,
        requestId: req.id,
      },
    });
  };
}

/**
 * Route guard checking permission to manage users
 * (Super Admin or Admin with canManageUsers: true)
 */
export function requireUserManagement(req, res, next) {
  if (rejectIfUnauthenticatedOrBanned(req, res)) return;

  if (req.user.role === "superadmin") {
    return next();
  }

  if (req.user.role === "admin" && req.user.permissions?.canManageUsers) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: {
      code: "FORBIDDEN_USER_MANAGEMENT_REQUIRED",
      message: "You do not have the required 'canManageUsers' permission to perform user management actions.",
      requestId: req.id,
    },
  });
}

/**
 * Isolated per-endpoint sliding window rate limiter
 */
export function createRateLimiter({ windowMs = 60 * 1000, max = 15, message = "Too many requests, please try again later." } = {}) {
  const rateLimitMap = new Map();

  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap.entries()) {
      if (now > entry.resetTime) {
        rateLimitMap.delete(ip);
      }
    }
  }, Math.max(windowMs, 60 * 1000));

  if (typeof cleanupTimer.unref === "function") {
    cleanupTimer.unref();
  }

  return function rateLimiter(req, res, next) {
    if (process.env.NODE_ENV === "test" && !process.env.TEST_RATE_LIMIT) {
      return next(); // bypass in tests unless specifically testing rate limiter
    }

    const ip = req.ip || req.socket?.remoteAddress || "global";
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
