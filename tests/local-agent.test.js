import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import {
  generateSessionCode,
  parseBridgeArgs,
  startLocalBridgeServer,
} from "../analyzer/local-agent.js";

const FIXTURE_DIR = path.resolve("tests/fixtures/mern-sample");

test("ChangeLens Local Bridge Agent Suite (Phase 1)", async (t) => {
  await t.test("generateSessionCode generates valid format tokens", () => {
    const code1 = generateSessionCode();
    const code2 = generateSessionCode();

    assert.match(code1, /^CL-[2-9A-HJ-NP-Z]{4}$/);
    assert.match(code2, /^CL-[2-9A-HJ-NP-Z]{4}$/);
    assert.notEqual(code1, code2);
  });

  await t.test("parseBridgeArgs correctly parses flags and commands", () => {
    const args = [
      "connect",
      "--dir=tests/fixtures/mern-sample",
      "--port=4500",
      "--session=CL-9999",
      "--files=server/models/user.js,server/index.js",
      "--web-url=https://changelens.dev",
      "--depth=5",
      "--quiet",
    ];

    const parsed = parseBridgeArgs(args);
    assert.equal(parsed.command, "connect");
    assert.equal(parsed.targetDir, path.resolve("tests/fixtures/mern-sample"));
    assert.equal(parsed.port, 4500);
    assert.equal(parsed.sessionCode, "CL-9999");
    assert.deepEqual(parsed.files, ["server/models/user.js", "server/index.js"]);
    assert.equal(parsed.webUrl, "https://changelens.dev");
    assert.equal(parsed.depth, 5);
    assert.equal(parsed.quiet, true);
  });

  await t.test("startLocalBridgeServer provides HTTP endpoints & CORS headers", async () => {
    const agent = await startLocalBridgeServer({
      targetDir: FIXTURE_DIR,
      port: 4899,
      sessionCode: "CL-TEST",
      cloudUrl: false,
      quiet: true,
    });

    try {
      const baseUrl = `http://127.0.0.1:${agent.port}`;

      // 1. OPTIONS preflight CORS test
      const optionsRes = await fetch(`${baseUrl}/api/status`, { method: "OPTIONS" });
      assert.equal(optionsRes.status, 204);
      assert.equal(optionsRes.headers.get("access-control-allow-origin"), "*");
      assert.ok(optionsRes.headers.get("access-control-allow-methods").includes("POST"));

      // 2. GET /api/status test
      const statusRes = await fetch(`${baseUrl}/api/status`);
      assert.equal(statusRes.status, 200);
      const statusData = await statusRes.json();
      assert.equal(statusData.status, "ready");
      assert.equal(statusData.sessionCode, "CL-TEST");
      assert.equal(statusData.workspace.path, FIXTURE_DIR);

      // 3. GET /api/changes test
      const changesRes = await fetch(`${baseUrl}/api/changes`);
      assert.equal(changesRes.status, 200);
      const changesData = await changesRes.json();
      assert.equal(changesData.success, true);
      assert.ok(Array.isArray(changesData.changes));

      // 4. POST /api/scan test (Local blast radius execution)
      const scanRes = await fetch(`${baseUrl}/api/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changedFiles: ["server/models/user.js"],
          maxDepth: 10,
        }),
      });

      assert.equal(scanRes.status, 200);
      const scanData = await scanRes.json();
      assert.equal(scanData.success, true);
      assert.equal(scanData.riskLevel, "HIGH");
      assert.equal(scanData.summary.impactedFilesCount, 3);
      assert.equal(scanData.summary.directDependentsCount, 1);
      assert.ok(Array.isArray(scanData.graph.nodes));
      assert.ok(Array.isArray(scanData.graph.edges));
      assert.ok(scanData.graph.nodes.length >= 3);
    } finally {
      await agent.close();
    }
  });
});
