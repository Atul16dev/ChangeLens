import fs from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import MongoStore from "connect-mongo";
import { hydrateUser } from "./middleware/auth.js";
import { healthRoutes } from "./routes/health.routes.js";
import { analysesRoutes } from "./routes/analyses.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import { githubRoutes } from "./routes/github.routes.js";

export function createApp({ sessionSecret, sessionStore } = {}) {
  const app = express();

  const secret = sessionSecret || process.env.SESSION_SECRET || "changelens-secure-session-key-entropy-32-chars";

  // Session store: MongoStore when MongoDB URI is configured, else standard MemoryStore
  let defaultStore;
  if (process.env.MONGODB_URI) {
    defaultStore = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 7 * 24 * 60 * 60, // 7 days
    });
  } else {
    defaultStore = new session.MemoryStore();
  }

  const store = sessionStore || defaultStore;

  // CORS configuration supporting credentialed cookies
  const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
  ];
  if (process.env.FRONTEND_ORIGIN) {
    allowedOrigins.push(process.env.FRONTEND_ORIGIN);
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        if (
          !origin ||
          allowedOrigins.includes(origin) ||
          origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:")
        ) {
          return callback(null, true);
        }
        callback(new Error("CORS policy violation"));
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: "5mb" }));
  app.use(cookieParser(secret));

  // Express session middleware
  app.use(
    session({
      name: "changelens.sid",
      store,
      secret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  // Request ID middleware
  app.use((req, res, next) => {
    req.id = req.headers["x-request-id"] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    res.setHeader("X-Request-Id", req.id);
    next();
  });

  // User hydration from session
  app.use(hydrateUser);

  // API v1 Routes
  app.use("/api/v1/health", healthRoutes);
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/github", githubRoutes);
  app.use("/api/v1", analysesRoutes);

  // Serve compiled frontend UI if available
  const distPath = path.resolve(process.cwd(), "frontend/dist");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.method === "GET" && !req.path.startsWith("/api/")) {
        return res.sendFile(path.join(distPath, "index.html"));
      }
      next();
    });
  }

  // 404 Catch-All
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: "ROUTE_NOT_FOUND",
        message: `Route ${req.method} ${req.originalUrl} not found.`,
        requestId: req.id,
      },
    });
  });

  // Global Error Handler
  app.use((err, req, res, _next) => {
    console.error(`[API Error] [${req.id || "no-req-id"}]`, err);

    const statusCode = err.statusCode || 500;
    const message = err.message || "An unexpected internal server error occurred.";
    const code = err.code || "INTERNAL_SERVER_ERROR";

    res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        requestId: req.id,
      },
    });
  });

  return app;
}
