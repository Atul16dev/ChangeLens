import fs from "node:fs";
import path from "node:path";

// Automatically load .env file if available in root
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath) && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(envPath);
  } catch (err) {
    console.warn("⚠️ Warning: Failed to load .env file:", err.message);
  }
}

import { connectMongoDB } from "./db/mongodb.js";
import { createApp } from "./app.js";

// Initialize MongoDB connection if MONGODB_URI is provided
if (process.env.MONGODB_URI) {
  connectMongoDB(process.env.MONGODB_URI);
}

const PORT = process.env.PORT || 5000;
const app = createApp();

const server = app.listen(PORT, () => {
  console.log("=================================================");
  console.log("          CHANGELENS REST API SERVER             ");
  console.log("=================================================");
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🩺 Health check:      http://localhost:${PORT}/api/v1/health`);
  console.log(`🔍 Trigger Analysis:  POST http://localhost:${PORT}/api/v1/analyze`);
  console.log(`🗄️ Database:          ${process.env.MONGODB_URI ? "🍃 MongoDB Atlas (Cloud Mode)" : "⚡ In-Memory (Dev/Test Fallback)"}`);
  console.log(`📧 Email Provider:    ${process.env.SMTP_HOST ? `${process.env.SMTP_HOST} (${process.env.SMTP_USER})` : "In-memory dev transport"}`);
  console.log("=================================================\n");
});

function shutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Closing server gracefully...`);
  server.close(() => {
    console.log("✅ ChangeLens API server closed.");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
