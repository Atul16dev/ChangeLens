import http from "node:http";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { existsSync } from "node:fs";
import { WebSocket } from "ws";
import { isGitRepository, getWorkingTreeChanges, executeGit } from "./local-git.js";
import { calculateRiskLevel } from "./ai-explainer.js";
import { performAnalysis } from "../api/controllers/analyses.controller.js";

/**
 * Generates a human-friendly pairing code for pairing local terminals with the ChangeLens web app.
 * E.g., "CL-7842" or "CL-9K4P" (excludes confusing characters like 0, O, 1, I).
 *
 * @param {string} [prefix="CL"]
 * @returns {string}
 */
export function generateSessionCode(prefix = "CL") {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.randomBytes(4);
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `${prefix}-${code}`;
}

/**
 * Safely determines the current active Git branch.
 *
 * @param {string} directoryPath
 * @returns {Promise<string|null>}
 */
export async function getGitBranch(directoryPath) {
  try {
    const isGit = await isGitRepository(directoryPath);
    if (!isGit) return null;
    const { stdout } = await executeGit(["rev-parse", "--abbrev-ref", "HEAD"], directoryPath);
    return stdout.trim() || "HEAD";
  } catch {
    return null;
  }
}

/**
 * Parses CLI arguments for the ChangeLens bridge & runner.
 *
 * @param {string[]} [argv=process.argv.slice(2)]
 * @returns {object} Parsed options
 */
export function parseBridgeArgs(argv = process.argv.slice(2)) {
  const options = {
    command: "connect",
    targetDir: process.cwd(),
    port: 3099,
    sessionCode: null,
    webUrl: "http://localhost:5173",
    cloudUrl: process.env.CHANGELENS_CLOUD_URL || "ws://localhost:5000/api/v1/bridge/tunnel",
    files: null,
    depth: 10,
    quiet: false,
    autoDetect: false,
    noCloud: false,
    help: false,
    version: false,
  };

  const positional = [];

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--version" || arg === "-v") {
      options.version = true;
    } else if (arg === "--quiet" || arg === "-q") {
      options.quiet = true;
    } else if (arg === "--no-cloud") {
      options.noCloud = true;
      options.cloudUrl = false;
    } else if (arg.startsWith("--cloud-url=")) {
      options.cloudUrl = arg.split("=")[1].trim();
    } else if (arg === "--auto-detect") {
      options.autoDetect = true;
    } else if (arg.startsWith("--port=")) {
      options.port = parseInt(arg.split("=")[1].trim(), 10) || 3099;
    } else if (arg.startsWith("--session=")) {
      options.sessionCode = arg.split("=")[1].trim().toUpperCase();
    } else if (arg.startsWith("--dir=") || arg.startsWith("--repo=")) {
      options.targetDir = path.resolve(arg.split("=")[1].trim());
    } else if (arg.startsWith("--web-url=")) {
      options.webUrl = arg.split("=")[1].trim().replace(/\/$/, "");
    } else if (arg.startsWith("--files=")) {
      options.files = arg
        .split("=")[1]
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);
    } else if (arg.startsWith("--depth=")) {
      options.depth = parseInt(arg.split("=")[1].trim(), 10) || 10;
    } else if (!arg.startsWith("-")) {
      positional.push(arg);
    }
  }

  // Handle command dispatch: connect | scan | ci | help
  if (positional.length > 0) {
    const first = positional[0].toLowerCase();
    if (["connect", "scan", "ci", "help", "status"].includes(first)) {
      options.command = first;
      if (positional.length > 1) {
        options.targetDir = path.resolve(positional[1]);
      }
    } else {
      // Positional path passed directly, e.g. "npx changelens ./my-project"
      options.targetDir = path.resolve(positional[0]);
    }
  }

  if (!options.sessionCode) {
    options.sessionCode = generateSessionCode();
  }

  return options;
}

/**
 * Builds formatted ASCII terminal dashboard for the Local Bridge Agent.
 */
export function formatTerminalDashboard({
  sessionCode,
  targetDir,
  port,
  webUrl,
  isGit,
  gitBranch,
  uncommittedCount,
  hostname,
  platform,
}) {
  const line = "═".repeat(72);
  const thin = "─".repeat(72);
  const gitInfo = isGit
    ? `Branch: ${gitBranch || "main"} (${uncommittedCount} uncommitted files)`
    : "Non-Git Directory (Manual file scan mode)";

  const targetAppUrl = `${webUrl}/app?session=${sessionCode}&bridge=http://127.0.0.1:${port}`;

  return [
    `╔${line}╗`,
    `║  ⚡ CHANGELENS LOCAL WORKSPACE BRIDGE AGENT (v0.1.0)                     ║`,
    `╠${line}╣`,
    `║  🔑 Session Pairing Code :  \x1b[1m\x1b[36m${sessionCode.padEnd(46)}\x1b[0m ║`,
    `║  📁 Workspace Path       :  ${targetDir.slice(0, 48).padEnd(48)} ║`,
    `║  🌿 Git Status           :  ${gitInfo.slice(0, 48).padEnd(48)} ║`,
    `║  🖥️  Machine              :  ${`${hostname} (${platform})`.slice(0, 48).padEnd(48)} ║`,
    `║  🔌 Local Bridge API     :  http://127.0.0.1:${String(port).padEnd(41)} ║`,
    `╠${thin}╣`,
    `║  🌐 Open ChangeLens Web Dashboard to connect:                           ║`,
    `║     \x1b[1m\x1b[32m${targetAppUrl.slice(0, 64).padEnd(64)}\x1b[0m ║`,
    `╠${line}╣`,
    `║  🟢 Bridge active & ready for Blast Radius calculations.                 ║`,
    `║  🔒 Privacy Guarantee: Source code never leaves your local machine.      ║`,
    `║  Press Ctrl+C to disconnect and stop agent.                              ║`,
    `╚${line}╝`,
  ].join("\n");
}

/**
 * Connects the local agent to the remote ChangeLens cloud relay via outbound WebSocket.
 * Enables zero-config pairing across firewalls, NAT, and hosted web environments.
 *
 * @param {object} options
 * @returns {{ getWebSocket: () => WebSocket, close: () => void }}
 */
export function connectCloudTunnel({
  sessionCode,
  targetDir,
  cloudUrl = "ws://localhost:5000/api/v1/bridge/tunnel",
  isGit = false,
  gitBranch = null,
  uncommittedCount = 0,
  quiet = false,
}) {
  let ws = null;
  let isClosed = false;
  let reconnectTimer = null;

  const log = (...args) => {
    if (!quiet) console.log(...args);
  };

  const connect = () => {
    if (isClosed) return;

    try {
      const fullUrl = `${cloudUrl}?session=${encodeURIComponent(sessionCode)}&role=agent`;
      ws = new WebSocket(fullUrl);

      ws.on("open", () => {
        log(`\x1b[36m[Cloud Tunnel]\x1b[0m 🌐 Secure tunnel established with ChangeLens Cloud (${cloudUrl})`);
        ws.send(
          JSON.stringify({
            type: "REGISTER_AGENT",
            sessionCode,
            workspace: {
              path: targetDir,
              isGit,
              branch: gitBranch,
              uncommittedCount,
              platform: process.platform,
              hostname: os.hostname(),
            },
          })
        );
      });

      ws.on("message", async (raw) => {
        try {
          const msg = JSON.parse(raw.toString());

          if (msg.type === "PING") {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "PONG" }));
            }
            return;
          }

          if (msg.type === "REQUEST_CHANGES") {
            const currentChanges = isGit ? await getWorkingTreeChanges(targetDir) : { changes: [] };
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "CHANGES_RESULT",
                  requestId: msg.requestId,
                  success: true,
                  data: currentChanges.changes || [],
                })
              );
            }
            return;
          }

          if (msg.type === "REQUEST_SCAN") {
            const changedFiles = Array.isArray(msg.changedFiles)
              ? msg.changedFiles
              : typeof msg.changedFiles === "string"
              ? msg.changedFiles.split(",").map((s) => s.trim()).filter(Boolean)
              : [];
            log(
              `\x1b[36m[Cloud Tunnel]\x1b[0m ⚡ Received remote Blast Radius scan request (${changedFiles.length || "auto"} files)...`
            );
            const startTime = Date.now();
            try {
              const analysisRecord = await performAnalysis({
                repoPath: targetDir,
                changedFiles: changedFiles.length > 0 ? changedFiles : undefined,
                maxDepth: Number(msg.maxDepth) || 10,
              });

              const durationMs = Date.now() - startTime;
              const riskLevel = calculateRiskLevel(analysisRecord.summary);

              log(
                `\x1b[32m[Cloud Tunnel]\x1b[0m ✓ Blast Radius calculated in ${durationMs}ms | Risk: ${riskLevel} | Relaying to web dashboard...`
              );

              if (ws.readyState === WebSocket.OPEN) {
                ws.send(
                  JSON.stringify({
                    type: "SCAN_RESULT",
                    requestId: msg.requestId,
                    success: true,
                    data: {
                      success: true,
                      sessionCode,
                      analysisId: analysisRecord.analysisId,
                      targetDir,
                      riskLevel,
                      durationMs,
                      summary: analysisRecord.summary,
                      changes: analysisRecord.changes,
                      graph: analysisRecord.graph,
                      impactAnalysis: analysisRecord.impactAnalysis,
                    },
                  })
                );
              }
            } catch (scanErr) {
              log(`\x1b[31m[Cloud Tunnel Scan Error]\x1b[0m ${scanErr.message}`);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(
                  JSON.stringify({
                    type: "SCAN_RESULT",
                    requestId: msg.requestId,
                    success: false,
                    error: scanErr.message,
                  })
                );
              }
            }
            return;
          }
        } catch (err) {
          log(`\x1b[31m[Cloud Tunnel Message Error]\x1b[0m ${err.message}`);
        }
      });

      ws.on("close", () => {
        if (!isClosed) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      });

      ws.on("error", (err) => {
        if (!isClosed && !quiet && err.code !== "ECONNREFUSED") {
          log(`\x1b[33m[Cloud Tunnel Warning]\x1b[0m ${err.message}`);
        }
      });
    } catch (err) {
      if (!isClosed) reconnectTimer = setTimeout(connect, 5000);
    }
  };

  connect();

  return {
    getWebSocket: () => ws,
    close: () => {
      isClosed = true;
      clearTimeout(reconnectTimer);
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
    },
  };
}

/**
 * Starts the lightweight local bridge HTTP agent server with CORS enabled.
 * Enables the hosted ChangeLens web dashboard to request blast radius computations
 * without raw source code ever leaving the user's laptop.
 *
 * @param {object} options
 * @param {string} [options.targetDir=process.cwd()]
 * @param {number} [options.port=3099]
 * @param {string} [options.sessionCode]
 * @param {string} [options.webUrl="http://localhost:5173"]
 * @param {boolean} [options.quiet=false]
 * @returns {Promise<{ server: http.Server, port: number, sessionCode: string, targetDir: string, close: () => Promise<void> }>}
 */
export async function startLocalBridgeServer(options = {}) {
  const targetDir = path.resolve(options.targetDir || process.cwd());
  const webUrl = (options.webUrl || "http://localhost:5173").replace(/\/$/, "");
  const sessionCode = options.sessionCode || generateSessionCode();
  const quiet = Boolean(options.quiet);

  if (!existsSync(targetDir)) {
    throw new Error(`Target directory does not exist: ${targetDir}`);
  }

  const isGit = await isGitRepository(targetDir);
  const gitBranch = await getGitBranch(targetDir);
  const workingTree = isGit ? await getWorkingTreeChanges(targetDir) : { changes: [] };
  const uncommittedChanges = workingTree.changes || [];

  const log = (...args) => {
    if (!quiet) console.log(...args);
  };

  // Helper to read JSON request body
  const readJsonBody = (req) => {
    return new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
        if (data.length > 5 * 1024 * 1024) {
          req.destroy(new Error("Request body too large (max 5MB)"));
        }
      });
      req.on("end", () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (err) {
          reject(new Error("Invalid JSON body"));
        }
      });
      req.on("error", reject);
    });
  };

  // Create native HTTP bridge server
  const server = http.createServer(async (req, res) => {
    // 1. CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Session-Code");
    res.setHeader("Access-Control-Max-Age", "86400");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, "http://127.0.0.1");
    const pathname = parsedUrl.pathname;

    try {
      // Endpoint 1: GET / or GET /api/status
      if (pathname === "/" || pathname === "/api/status") {
        const currentChanges = isGit ? await getWorkingTreeChanges(targetDir) : { changes: [] };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "ready",
            sessionCode,
            version: "0.1.0",
            workspace: {
              path: targetDir,
              isGit,
              gitBranch,
              uncommittedCount: (currentChanges.changes || []).length,
              platform: process.platform,
              hostname: os.hostname(),
            },
            bridgeUrl: `http://127.0.0.1:${server.address()?.port || options.port || 3099}`,
            webUrl: `${webUrl}/app?session=${sessionCode}`,
            endpoints: {
              status: "GET /api/status",
              changes: "GET /api/changes",
              scan: "POST /api/scan",
            },
          })
        );
        return;
      }

      // Endpoint 2: GET /api/changes (Uncommitted Git changes)
      if (pathname === "/api/changes") {
        const currentChanges = isGit ? await getWorkingTreeChanges(targetDir) : { changes: [] };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            isGit,
            branch: gitBranch,
            changes: currentChanges.changes || [],
            count: (currentChanges.changes || []).length,
          })
        );
        return;
      }

      // Endpoint 3: POST /api/scan (Calculate Blast Radius locally)
      if (pathname === "/api/scan" && req.method === "POST") {
        const body = await readJsonBody(req);
        const changedFiles = Array.isArray(body.changedFiles)
          ? body.changedFiles
          : typeof body.changedFiles === "string"
          ? body.changedFiles.split(",").map((s) => s.trim()).filter(Boolean)
          : [];
        const maxDepth = Number(body.maxDepth) || options.depth || 10;

        const startTime = Date.now();
        log(`\x1b[36m[Bridge]\x1b[0m ⚡ Received Blast Radius calculation request (${changedFiles.length || "auto-detect"} files)...`);

        const analysisRecord = await performAnalysis({
          repoPath: targetDir,
          changedFiles: changedFiles.length > 0 ? changedFiles : undefined,
          maxDepth,
        });

        const durationMs = Date.now() - startTime;
        const riskLevel = calculateRiskLevel(analysisRecord.summary);

        log(
          `\x1b[32m[Bridge]\x1b[0m ✓ Analysis completed in ${durationMs}ms | Risk: ${riskLevel} | Impacted Files: ${analysisRecord.summary.impactedFilesCount}`
        );

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            sessionCode,
            analysisId: analysisRecord.analysisId,
            targetDir,
            riskLevel,
            durationMs,
            summary: analysisRecord.summary,
            changes: analysisRecord.changes,
            graph: analysisRecord.graph,
            impactAnalysis: analysisRecord.impactAnalysis,
          })
        );
        return;
      }

      // Unknown route
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Route not found", pathname }));
    } catch (err) {
      log(`\x1b[31m[Bridge Error]\x1b[0m ${err.message}`);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message || "Internal server error" }));
    }
  });

  // Attempt listening on desired port; if taken, automatically increment up to 10 ports
  const basePort = options.port || 3099;
  let activePort = basePort;

  const tryListen = (portToTry) => {
    return new Promise((resolve, reject) => {
      server.once("error", (err) => {
        if (err.code === "EADDRINUSE") {
          reject(err);
        } else {
          reject(err);
        }
      });
      server.listen(portToTry, "127.0.0.1", () => {
        resolve(portToTry);
      });
    });
  };

  let listening = false;
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      await tryListen(basePort + attempt);
      activePort = basePort + attempt;
      listening = true;
      break;
    } catch (err) {
      if (err.code !== "EADDRINUSE") throw err;
    }
  }

  // If all 10 ports busy, listen on any free OS port (0)
  if (!listening) {
    await tryListen(0);
    activePort = server.address().port;
  }

  // Connect to Cloud Relay via outbound WebSocket tunnel if enabled
  let cloudTunnel = null;
  const cloudUrl =
    options.cloudUrl !== false && options.cloudUrl !== "false"
      ? options.cloudUrl || process.env.CHANGELENS_CLOUD_URL || "ws://localhost:5000/api/v1/bridge/tunnel"
      : null;

  if (cloudUrl) {
    cloudTunnel = connectCloudTunnel({
      sessionCode,
      targetDir,
      cloudUrl,
      isGit,
      gitBranch,
      uncommittedCount: uncommittedChanges.length,
      quiet,
    });
  }

  return {
    server,
    port: activePort,
    sessionCode,
    targetDir,
    cloudTunnel,
    isGit,
    gitBranch,
    uncommittedCount: uncommittedChanges.length,
    hostname: os.hostname(),
    platform: process.platform,
    close: async () => {
      if (cloudTunnel) {
        cloudTunnel.close();
      }
      await new Promise((resolve) => {
        server.close(() => resolve());
      });
    },
  };
}

/**
 * Runs a one-shot scan directly in the terminal and prints impact summary.
 *
 * @param {object} options
 */
export async function runLocalScan(options = {}) {
  const targetDir = path.resolve(options.targetDir || process.cwd());
  const files = options.files || [];
  const depth = options.depth || 10;

  console.log(`\n🔍 ChangeLens Fast Scan: ${targetDir}`);
  if (files.length > 0) {
    console.log(`   Target files: ${files.join(", ")}`);
  } else {
    console.log(`   Target files: Auto-detecting uncommitted Git changes...`);
  }

  const result = await performAnalysis({
    repoPath: targetDir,
    changedFiles: files.length > 0 ? files : undefined,
    maxDepth: depth,
  });

  const riskLevel = calculateRiskLevel(result.summary);

  console.log("\n" + "─".repeat(50));
  console.log(`📊 BLAST RADIUS SCAN RESULTS:`);
  console.log(`   Risk Level:               ${riskLevel}`);
  console.log(`   Total Changed Files:      ${result.summary.totalChanges}`);
  console.log(`   Total Impacted Files:     ${result.summary.impactedFilesCount}`);
  console.log(`   Direct Dependents:        ${result.summary.directDependentsCount}`);
  console.log(`   Transitive Dependents:    ${result.summary.transitiveDependentsCount}`);
  console.log(`   Broken Imports:           ${result.summary.brokenImportsCount}`);
  console.log("─".repeat(50) + "\n");

  return { success: true, riskLevel, summary: result.summary, changes: result.changes };
}
