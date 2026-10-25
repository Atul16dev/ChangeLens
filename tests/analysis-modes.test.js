import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { performAnalysis } from "../api/controllers/analyses.controller.js";
import { createApp } from "../api/app.js";
import { initBridgeRelay } from "../api/services/bridge-relay.js";
import { connectCloudTunnel } from "../analyzer/local-agent.js";

const FIXTURE_DIR = path.resolve("tests/fixtures/mern-sample");

test("ChangeLens Dual Analysis Modes Engine Suite (Phase 3)", async (t) => {
  // ─── TEST 1: AUTO-DETECT MODE ───
  await t.test("Mode 1 (Auto-Detect): Runs automatically when no files are specified", async () => {
    const result = await performAnalysis({
      repoPath: FIXTURE_DIR,
      // No changedFiles passed
    });

    assert.equal(result.mode, "auto-detect");
    assert.equal(result.detectionMetadata.mode, "auto-detect");
    assert.equal(result.detectionMetadata.isManual, false);
    assert.equal(result.summary.mode, "auto-detect");
    assert.ok(result.changes.length > 0);
    assert.ok(result.graph.nodes.length >= 3);
  });

  // ─── TEST 2: MANUAL COMMA-SEPARATED STRING INPUT ───
  await t.test("Mode 2 (Manual Input): Accepts comma-separated string of files", async () => {
    const result = await performAnalysis({
      repoPath: FIXTURE_DIR,
      changedFiles: "server/models/user.js, server/controllers/user-controller.js",
    });

    assert.equal(result.mode, "manual");
    assert.equal(result.detectionMetadata.mode, "manual");
    assert.equal(result.detectionMetadata.isManual, true);
    assert.equal(result.detectionMetadata.userInputs.length, 2);
    assert.ok(result.changes.some((c) => c.path === "server/models/user.js"));
    assert.ok(result.changes.some((c) => c.path === "server/controllers/user-controller.js"));
    assert.ok(result.summary.impactedFilesCount >= 3);
  });

  // ─── TEST 3: SMART PATH RESOLUTION (FORGIVING INPUTS) ───
  await t.test("Mode 2 (Smart Suffix Resolution): Resolves partial paths like 'user.js'", async () => {
    const result = await performAnalysis({
      repoPath: FIXTURE_DIR,
      changedFiles: "user.js", // User did not write server/models/user.js
    });

    assert.equal(result.mode, "manual");
    assert.ok(result.detectionMetadata.resolvedFiles.includes("server/models/user.js"));
    assert.ok(result.changes.some((c) => c.path === "server/models/user.js"));
    assert.equal(result.summary.impactedFilesCount, 3);
  });

  // ─── TEST 4: END-TO-END BRIDGE TUNNEL WITH BOTH MODES ───
  await t.test("End-to-End Tunnel supports both Auto-Detect and Manual modes via REST", async () => {
    const app = createApp();
    let server;
    let baseUrl;
    let wsUrl;
    let bridgeRelay;

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        wsUrl = `ws://127.0.0.1:${address.port}/api/v1/bridge/tunnel`;
        bridgeRelay = initBridgeRelay(server);
        resolve();
      });
    });

    const sessionCode = "CL-MODES1";
    const agentTunnel = connectCloudTunnel({
      sessionCode,
      targetDir: FIXTURE_DIR,
      cloudUrl: wsUrl,
      isGit: false,
      gitBranch: "main",
      uncommittedCount: 0,
      quiet: true,
    });

    try {
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 4A: Call Scan in Auto-Detect Mode
      const autoRes = await fetch(`${baseUrl}/api/v1/bridge/scan/${sessionCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changedFiles: [], // empty -> auto-detect
        }),
      });

      assert.equal(autoRes.status, 200);
      const autoData = await autoRes.json();
      assert.equal(autoData.success, true);
      assert.ok(autoData.graph.nodes.length >= 3);

      // 4B: Call Scan in Manual Mode with comma-separated files
      const manualRes = await fetch(`${baseUrl}/api/v1/bridge/scan/${sessionCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changedFiles: "server/models/user.js",
        }),
      });

      assert.equal(manualRes.status, 200);
      const manualData = await manualRes.json();
      assert.equal(manualData.success, true);
      assert.equal(manualData.riskLevel, "HIGH");
      assert.equal(manualData.summary.impactedFilesCount, 3);
    } finally {
      agentTunnel.close();
      if (bridgeRelay) await bridgeRelay.close();
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
