import { createApp } from "./app.js";

const PORT = process.env.PORT || 5000;
const app = createApp();

const server = app.listen(PORT, () => {
  console.log("=================================================");
  console.log("          CHANGELENS REST API SERVER             ");
  console.log("=================================================");
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🩺 Health check:      http://localhost:${PORT}/api/v1/health`);
  console.log(`🔍 Trigger Analysis:  POST http://localhost:${PORT}/api/v1/analyze`);
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
