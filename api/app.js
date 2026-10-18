import fs from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import { healthRoutes } from "./routes/health.routes.js";
import { analysesRoutes } from "./routes/analyses.routes.js";

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "5mb" }));

  // Request ID middleware
  app.use((req, res, next) => {
    req.id = req.headers["x-request-id"] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    res.setHeader("X-Request-Id", req.id);
    next();
  });

  // API v1 Routes
  app.use("/api/v1/health", healthRoutes);
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
