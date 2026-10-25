import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { WebSocket } from "ws";
import { createApp } from "../api/app.js";
import { initBridgeRelay } from "../api/services/bridge-relay.js";
import { connectCloudTunnel } from "../analyzer/local-agent.js";

const FIXTURE_DIR = path.resolve("tests/fixtures/mern-sample");

test("ChangeLens Cloud & Terminal WebSocket Tunnel Relay Suite (Phase 2)", async (t) => {
  const app = createApp();
  let server;
  let baseUrl;
  let wsUrl;
  let bridgeRelay;

  // Start HTTP and WebSocket relay server on ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      wsUrl = `ws://127.0.0.1:${address.port}/api/v1/bridge/tunnel`;
      bridgeRelay = initBridgeRelay(server);
      resolve();
    });
  });

  t.after(async () => {
    if (bridgeRelay) await bridgeRelay.close();
    await new Promise((resolve) => server.close(resolve));
  });

  const sessionCode = "CL-TUNNEL1";

  await t.test("GET /api/v1/bridge/status returns connected: false when no agent is online", async () => {
    const res = await fetch(`${baseUrl}/api/v1/bridge/status/${sessionCode}`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.connected, false);
  });

  await t.test("Agent connects via WebSocket, registers workspace metadata, and status updates", async () => {
    const agentTunnel = connectCloudTunnel({
      sessionCode,
      targetDir: FIXTURE_DIR,
      cloudUrl: wsUrl,
      isGit: false,
      gitBranch: "feature/auth",
      uncommittedCount: 1,
      quiet: true,
    });

    try {
      // Wait briefly for WebSocket handshake
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Query REST status endpoint
      const res = await fetch(`${baseUrl}/api/v1/bridge/status/${sessionCode}`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.connected, true);
      assert.equal(data.sessionCode, sessionCode);
      assert.equal(data.workspace.path, FIXTURE_DIR);
      assert.equal(data.workspace.branch, "feature/auth");
    } finally {
      agentTunnel.close();
    }
  });

  await t.test("End-to-End Tunnel: POST /api/v1/bridge/scan executes AST blast radius on local agent", async () => {
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

      // Trigger blast radius calculation via Cloud Server
      const res = await fetch(`${baseUrl}/api/v1/bridge/scan/${sessionCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changedFiles: ["server/models/user.js"],
          maxDepth: 10,
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.riskLevel, "HIGH");
      assert.equal(data.summary.impactedFilesCount, 3);
      assert.equal(data.summary.directDependentsCount, 1);
      assert.ok(Array.isArray(data.graph.nodes));
      assert.ok(Array.isArray(data.graph.edges));
      assert.ok(data.graph.nodes.length >= 3);
    } finally {
      agentTunnel.close();
    }
  });

  await t.test("Browser client receives real-time WebSocket events from tunnel", async () => {
    const browserWs = new WebSocket(`${wsUrl}?session=${sessionCode}&role=client`);

    try {
      const initialMsg = await new Promise((resolve) => {
        browserWs.once("message", (raw) => resolve(JSON.parse(raw.toString())));
      });

      assert.equal(initialMsg.type, "SESSION_STATUS");
      assert.equal(initialMsg.sessionCode, sessionCode);
    } finally {
      browserWs.close();
    }
  });
});
