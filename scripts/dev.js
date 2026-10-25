import { spawn } from "node:child_process";

console.log("=================================================");
console.log("       LAUNCHING CHANGELENS FULL-STACK DEV       ");
console.log("=================================================");
console.log("🚀 Starting Backend Express Server (Port 5000)...");
console.log("⚡ Starting Frontend Vite Dev Server (Port 5173)...");
console.log("=================================================\n");

const isWin = process.platform === "win32";

const api = spawn("node", ["--watch", "api/server.js"], {
  stdio: "inherit",
  shell: isWin,
});

const frontend = spawn(isWin ? "npm.cmd" : "npm", ["run", "dev", "--prefix", "frontend"], {
  stdio: "inherit",
  shell: isWin,
});

function cleanup() {
  try {
    if (api && !api.killed) api.kill();
    if (frontend && !frontend.killed) frontend.kill();
  } catch {}
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);
