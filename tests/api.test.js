import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../api/app.js";

test("ChangeLens REST API Endpoints Suite", async (t) => {
  const app = createApp();
  let server;
  let baseUrl;

  // Start server on an ephemeral port before running tests
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  let createdAnalysisId;

  await t.test("GET /api/v1/health returns 200 and healthy envelope", async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, "healthy");
    assert.equal(body.data.service, "ChangeLens API");
    assert.ok(body.data.timestamp);
  });

  await t.test("POST /api/v1/analyze executes impact analysis on mern-sample", async () => {
    const res = await fetch(`${baseUrl}/api/v1/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        changedFiles: ["server/models/user.js"],
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();

    assert.equal(body.success, true);
    assert.ok(body.data.analysisId);
    createdAnalysisId = body.data.analysisId;

    assert.equal(body.data.status, "completed");
    assert.equal(body.data.summary.impactedFilesCount, 3);
    assert.equal(body.data.summary.directDependentsCount, 1);
    assert.equal(body.data.summary.transitiveDependentsCount, 2);
  });

  await t.test("GET /api/v1/analyses/:id returns analysis metadata", async () => {
    assert.ok(createdAnalysisId);

    const res = await fetch(`${baseUrl}/api/v1/analyses/${createdAnalysisId}`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.analysisId, createdAnalysisId);
    assert.equal(body.data.status, "completed");
  });

  await t.test("GET /api/v1/analyses/:id/graph returns React Flow nodes and edges", async () => {
    assert.ok(createdAnalysisId);

    const res = await fetch(`${baseUrl}/api/v1/analyses/${createdAnalysisId}/graph`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);

    const { nodes, edges } = body.data;
    assert.ok(Array.isArray(nodes));
    assert.ok(Array.isArray(edges));
    assert.ok(nodes.length >= 6);

    // Verify changed node styling/data
    const userModelNode = nodes.find((n) => n.id === "server/models/user.js");
    assert.ok(userModelNode);
    assert.equal(userModelNode.data.isChanged, true);

    // Verify impacted node styling/data
    const controllerNode = nodes.find(
      (n) => n.id === "server/controllers/user-controller.js",
    );
    assert.ok(controllerNode);
    assert.equal(controllerNode.data.isImpacted, true);
    assert.equal(controllerNode.data.severity, "HIGH");
    assert.equal(controllerNode.data.depth, 1);

    // Verify React Flow position coordinates exist
    assert.ok(typeof userModelNode.position.x === "number");
    assert.ok(typeof userModelNode.position.y === "number");
  });

  await t.test("GET /api/v1/analyses/:id/impact returns prioritized findings", async () => {
    assert.ok(createdAnalysisId);

    const res = await fetch(`${baseUrl}/api/v1/analyses/${createdAnalysisId}/impact`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);

    const { allFindings, summary } = body.data;
    assert.equal(summary.impactedFilesCount, 3);
    assert.equal(allFindings.length, 3);

    // Depth 1 finding check
    const directFinding = allFindings.find((f) => f.depth === 1);
    assert.ok(directFinding);
    assert.equal(directFinding.affectedFile, "server/controllers/user-controller.js");
    assert.equal(directFinding.severity, "HIGH");
    assert.ok(directFinding.recommendation);
    assert.equal(directFinding.evidence.location.startLine, 1);
  });

  await t.test("GET /api/v1/analyses/:id/explain returns risk level and PR comment markdown", async () => {
    assert.ok(createdAnalysisId);

    const res = await fetch(`${baseUrl}/api/v1/analyses/${createdAnalysisId}/explain`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.riskLevel, "HIGH");
    assert.ok(body.data.executiveSummary);
    assert.ok(Array.isArray(body.data.actionItems));
    assert.ok(body.data.prCommentMarkdown.includes("ChangeLens Impact Analysis Report"));
  });

  await t.test("POST /api/v1/analyses/:id/simulate computes What-If blast radius on the fly", async () => {
    assert.ok(createdAnalysisId);

    const res = await fetch(`${baseUrl}/api/v1/analyses/${createdAnalysisId}/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        simulatedFile: "server/models/user.js",
        changeType: "modified",
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.simulatedFile, "server/models/user.js");
    assert.equal(body.data.changeType, "modified");
    assert.equal(body.data.summary.impactedFilesCount, 3);
    assert.equal(body.data.summary.directDependentsCount, 1);
    assert.equal(body.data.summary.transitiveDependentsCount, 2);

    // Verify recolored graph nodes
    const { nodes, edges } = body.data.graph;
    assert.ok(Array.isArray(nodes));
    assert.ok(Array.isArray(edges));
    const simulatedRoot = nodes.find((n) => n.id === "server/models/user.js");
    assert.ok(simulatedRoot);
    assert.equal(simulatedRoot.data.isChanged, true);

    const directConsumer = nodes.find((n) => n.id === "server/controllers/user-controller.js");
    assert.ok(directConsumer);
    assert.equal(directConsumer.data.isImpacted, true);
    assert.equal(directConsumer.data.severity, "HIGH");

    // Verify explanation generated for simulated scenario
    assert.ok(body.data.explanation.riskLevel);
    assert.ok(body.data.explanation.prCommentMarkdown.includes("ChangeLens Impact Analysis Report"));
  });

  await t.test("POST /api/v1/analyses/:id/simulate validates simulatedFile input", async () => {
    assert.ok(createdAnalysisId);

    const res = await fetch(`${baseUrl}/api/v1/analyses/${createdAnalysisId}/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        simulatedFile: "   ",
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, "INVALID_REQUEST");
  });

  await t.test("GET /api/v1/non-existent returns 404 with structured error envelope", async () => {
    const res = await fetch(`${baseUrl}/api/v1/non-existent`);
    assert.equal(res.status, 404);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, "ROUTE_NOT_FOUND");
    assert.ok(body.error.requestId);
  });
});
