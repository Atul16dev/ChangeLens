#!/usr/bin/env node

/**
 * ChangeLens CLI & Local Workspace Bridge Agent
 *
 * Connects developer local workspaces (without pushing to GitHub) to the
 * ChangeLens Web Application via a secure local bridge.
 * Computes AST dependency blast radiuses directly on the developer's laptop
 * so source code stays 100% private.
 *
 * Usage:
 *   npx changelens connect [options]   # Start local workspace bridge agent
 *   npx changelens scan [options]      # Fast local blast radius scan in terminal
 *   npx changelens ci [options]        # Run automated GitHub Actions PR analyzer
 */

import path from "node:path";
import {
  parseBridgeArgs,
  startLocalBridgeServer,
  formatTerminalDashboard,
  runLocalScan,
} from "../analyzer/local-agent.js";
import { runChangeLensCI } from "./changelens-ci.js";

const HELP_TEXT = `
ChangeLens CLI - Blast Radius & Impact Analysis Engine (v0.1.0)

USAGE:
  $ npx changelens [command] [options]

COMMANDS:
  connect              Start the local workspace bridge agent (Default)
  scan                 Run instant blast radius scan directly in terminal
  ci                   Run automated CI impact check for Pull Requests
  help                 Display this help guide

CONNECT OPTIONS:
  --dir=<path>         Target workspace directory (default: current directory)
  --port=<number>      Bridge API port (default: 3099, auto-falls back if busy)
  --session=<code>     Custom session pairing code (e.g. CL-7842)
  --web-url=<url>      ChangeLens Web App URL (default: http://localhost:5173)
  --depth=<number>     Maximum blast radius traversal depth (default: 10)
  --quiet              Suppress non-essential console logs

SCAN OPTIONS:
  --files=<f1,f2>      Comma-separated list of changed files
  --auto-detect        Auto-detect modified files using local Git working tree

EXAMPLES:
  # 1. Start bridge for your current project (opens in browser)
  $ npx changelens connect

  # 2. Start bridge for a specific project directory
  $ npx changelens connect --dir="D:\\MyProjects\\ecommerce-api"

  # 3. Fast scan in terminal with changed files
  $ npx changelens scan --files="controllers/auth.js,models/user.js"

  # 4. Run automated Pull Request CI check
  $ npx changelens ci --fail-on-critical
`;

async function main() {
  const args = parseBridgeArgs(process.argv.slice(2));

  if (args.help || args.command === "help") {
    console.log(HELP_TEXT.trim());
    process.exit(0);
  }

  if (args.version) {
    console.log("changelens-parser-engine v0.1.0");
    process.exit(0);
  }

  // 1. CI Runner Mode
  if (args.command === "ci") {
    const ciResult = await runChangeLensCI(args);
    process.exit(ciResult.exitCode);
    return;
  }

  // 2. Fast Terminal Scan Mode
  if (args.command === "scan") {
    try {
      await runLocalScan(args);
      process.exit(0);
    } catch (err) {
      console.error(`\n❌ Scan failed: ${err.message}`);
      process.exit(1);
    }
    return;
  }

  // 3. Local Workspace Bridge Agent Mode (Default)
  try {
    const agent = await startLocalBridgeServer({
      targetDir: args.targetDir,
      port: args.port,
      sessionCode: args.sessionCode,
      webUrl: args.webUrl,
      depth: args.depth,
      quiet: args.quiet,
    });

    if (!args.quiet) {
      console.log(
        "\n" +
          formatTerminalDashboard({
            sessionCode: agent.sessionCode,
            targetDir: agent.targetDir,
            port: agent.port,
            webUrl: args.webUrl,
            isGit: agent.isGit,
            gitBranch: agent.gitBranch,
            uncommittedCount: agent.uncommittedCount,
            hostname: agent.hostname,
            platform: agent.platform,
          }) +
          "\n"
      );
    }

    const shutdown = async () => {
      console.log("\n\n🔌 Stopping ChangeLens Local Bridge Agent...");
      await agent.close();
      console.log("✓ Agent stopped successfully. Have a great day!\n");
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    console.error(`\n❌ Failed to start ChangeLens Local Bridge: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
