import "./env.js";
import { connectMongoDB, isMongoConnected } from "./db/mongodb.js";
import { createApp } from "./app.js";

const PORT = process.env.PORT || 5000;

async function startServer() {
  // Initialize MongoDB connection if MONGODB_URI is configured
  if (process.env.MONGODB_URI) {
    try {
      console.log("🍃 [MongoDB] Connecting to MongoDB Atlas...");
      await connectMongoDB(process.env.MONGODB_URI);
    } catch (err) {
      console.error("⚠️ [MongoDB] Startup connection error:", err.message);
    }
  }

  const app = createApp();

  const server = app.listen(PORT, () => {
    console.log("=================================================");
    console.log("          CHANGELENS REST API SERVER             ");
    console.log("=================================================");
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`🩺 Health check:      http://localhost:${PORT}/api/v1/health`);
    console.log(`🔍 Trigger Analysis:  POST http://localhost:${PORT}/api/v1/analyze`);
    console.log(`🗄️ Database:          ${isMongoConnected() ? "🍃 MongoDB Atlas (Connected)" : "⚡ In-Memory (Dev/Test Fallback)"}`);
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
}

startServer().catch((err) => {
  console.error("❌ Fatal server startup error:", err);
  process.exit(1);
});
