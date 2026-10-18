import assert from "node:assert/strict";
import test from "node:test";
import { computeGraphLayout, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from "../analyzer/graph-layout.js";

test("Graph Layout Engine Suite (ELK.js Layered)", async (t) => {
  await t.test("handles empty graph gracefully without crashing", async () => {
    const result = await computeGraphLayout({ nodes: [], edges: [] });
    assert.deepEqual(result.nodes, []);
    assert.deepEqual(result.edges, []);
    assert.equal(result.bounds.width, 0);
    assert.equal(result.bounds.height, 0);
  });

  await t.test("layouts a single changed file with a direct dependent in impact mode", async () => {
    const nodes = [
      { id: "server/models/user.js", data: { isChanged: true, depth: 0 } },
      { id: "server/controllers/user-controller.js", data: { isChanged: false, isImpacted: true, depth: 1 } },
    ];
    const edges = [
      {
        id: "e1",
        source: "server/controllers/user-controller.js",
        target: "server/models/user.js",
        label: "../models/user",
      },
    ];

    const result = await computeGraphLayout({ nodes, edges, mode: "impact" });
    assert.equal(result.nodes.length, 2);
    assert.equal(result.edges.length, 1);

    const rootNode = result.nodes.find((n) => n.id === "server/models/user.js");
    const childNode = result.nodes.find((n) => n.id === "server/controllers/user-controller.js");

    assert.ok(rootNode);
    assert.ok(childNode);
    // In impact mode, Root is on the left, child is to the right
    assert.ok(childNode.position.x > rootNode.position.x, `Expected child X (${childNode.position.x}) > root X (${rootNode.position.x})`);
    assert.ok(result.bounds.width > DEFAULT_NODE_WIDTH);
  });

  await t.test("arranges a deep dependency chain (Depth 0 -> 1 -> 2 -> 3) sequentially left-to-right", async () => {
    const nodes = [
      { id: "model.js", data: { isChanged: true, depth: 0 } },
      { id: "controller.js", data: { isImpacted: true, depth: 1 } },
      { id: "routes.js", data: { isImpacted: true, depth: 2 } },
      { id: "app.js", data: { isImpacted: true, depth: 3 } },
    ];
    const edges = [
      { id: "e1", source: "controller.js", target: "model.js" },
      { id: "e2", source: "routes.js", target: "controller.js" },
      { id: "e3", source: "app.js", target: "routes.js" },
    ];

    const result = await computeGraphLayout({ nodes, edges, mode: "impact" });
    const model = result.nodes.find((n) => n.id === "model.js");
    const controller = result.nodes.find((n) => n.id === "controller.js");
    const routes = result.nodes.find((n) => n.id === "routes.js");
    const app = result.nodes.find((n) => n.id === "app.js");

    assert.ok(controller.position.x > model.position.x);
    assert.ok(routes.position.x > controller.position.x);
    assert.ok(app.position.x > routes.position.x);
  });

  await t.test("handles multiple changed roots without overlapping them", async () => {
    const nodes = [
      { id: "modelA.js", data: { isChanged: true, depth: 0 } },
      { id: "modelB.js", data: { isChanged: true, depth: 0 } },
      { id: "serviceA.js", data: { isImpacted: true, depth: 1 } },
      { id: "serviceB.js", data: { isImpacted: true, depth: 1 } },
    ];
    const edges = [
      { id: "e1", source: "serviceA.js", target: "modelA.js" },
      { id: "e2", source: "serviceB.js", target: "modelB.js" },
    ];

    const result = await computeGraphLayout({ nodes, edges, mode: "impact" });
    const modelA = result.nodes.find((n) => n.id === "modelA.js");
    const modelB = result.nodes.find((n) => n.id === "modelB.js");

    // Multiple roots should be separated vertically and not occupy the same space
    const isDistinctPosition = modelA.position.x !== modelB.position.x || modelA.position.y !== modelB.position.y;
    assert.ok(isDistinctPosition);
    if (Math.abs(modelA.position.x - modelB.position.x) < 50) {
      assert.ok(Math.abs(modelA.position.y - modelB.position.y) >= DEFAULT_NODE_HEIGHT);
    }
  });

  await t.test("handles multiple files sharing the same dependency (fan-in / convergence)", async () => {
    const nodes = [
      { id: "shared-util.js", data: { isChanged: true, depth: 0 } },
      { id: "consumerA.js", data: { isImpacted: true, depth: 1 } },
      { id: "consumerB.js", data: { isImpacted: true, depth: 1 } },
      { id: "consumerC.js", data: { isImpacted: true, depth: 1 } },
    ];
    const edges = [
      { id: "e1", source: "consumerA.js", target: "shared-util.js" },
      { id: "e2", source: "consumerB.js", target: "shared-util.js" },
      { id: "e3", source: "consumerC.js", target: "shared-util.js" },
    ];

    const result = await computeGraphLayout({ nodes, edges, mode: "impact" });
    const root = result.nodes.find((n) => n.id === "shared-util.js");
    const cA = result.nodes.find((n) => n.id === "consumerA.js");
    const cB = result.nodes.find((n) => n.id === "consumerB.js");
    const cC = result.nodes.find((n) => n.id === "consumerC.js");

    // All 3 consumers should be to the right of root
    assert.ok(cA.position.x > root.position.x);
    assert.ok(cB.position.x > root.position.x);
    assert.ok(cC.position.x > root.position.x);

    // Consumers should have distinct Y positions
    const yValues = [cA.position.y, cB.position.y, cC.position.y].sort((a, b) => a - b);
    assert.ok(yValues[1] > yValues[0]);
    assert.ok(yValues[2] > yValues[1]);
  });

  await t.test("handles disconnected graph components without crashing or extreme gaps", async () => {
    const nodes = [
      { id: "active-root.js", data: { isChanged: true, depth: 0 } },
      { id: "active-child.js", data: { isImpacted: true, depth: 1 } },
      { id: "clean-unrelatedA.js", data: { isChanged: false, isImpacted: false } },
      { id: "clean-unrelatedB.js", data: { isChanged: false, isImpacted: false } },
    ];
    const edges = [
      { id: "e1", source: "active-child.js", target: "active-root.js" },
      { id: "e2", source: "clean-unrelatedB.js", target: "clean-unrelatedA.js" },
    ];

    const result = await computeGraphLayout({ nodes, edges, mode: "impact" });
    assert.equal(result.nodes.length, 4);
    assert.ok(result.bounds.width > 0);
    assert.ok(result.bounds.height > 0);
    // Bounding box must be finite and realistic
    assert.ok(result.bounds.width < 5000);
    assert.ok(result.bounds.height < 5000);
  });

  await t.test("preserves correct semantic data in dependency mode vs impact mode", async () => {
    const nodes = [
      { id: "provider.js", data: { isChanged: true } },
      { id: "consumer.js", data: { isImpacted: true } },
    ];
    const edges = [
      {
        id: "e1",
        source: "consumer.js",
        target: "provider.js",
        label: "../provider",
        data: { importer: "consumer.js", imported: "provider.js", specifier: "../provider" },
      },
    ];

    // Impact mode
    const impactResult = await computeGraphLayout({ nodes, edges, mode: "impact" });
    const impactEdge = impactResult.edges[0];
    assert.equal(impactEdge.source, "provider.js");
    assert.equal(impactEdge.target, "consumer.js");
    assert.equal(impactEdge.data.importer, "consumer.js");
    assert.equal(impactEdge.data.imported, "provider.js");

    // Dependency mode
    const depResult = await computeGraphLayout({ nodes, edges, mode: "dependency" });
    const depEdge = depResult.edges[0];
    assert.equal(depEdge.source, "consumer.js");
    assert.equal(depEdge.target, "provider.js");
    assert.equal(depEdge.data.importer, "consumer.js");
    assert.equal(depEdge.data.imported, "provider.js");
  });
});
