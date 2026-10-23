import { isMongoConnected } from "../db/mongodb.js";

/**
 * Health check controller
 */
export function getHealth(_req, res) {
  res.status(200).json({
    success: true,
    data: {
      status: "healthy",
      service: "ChangeLens API",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      mongoConnected: isMongoConnected(),
    },
  });
}
