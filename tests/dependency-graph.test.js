import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { scanRepository } from "../analyzer/repository-scanner.js";
import { resolveRepositoryDependencies } from "../analyzer/dependency-resolver.js";
import {
  buildDependencyGraph,
  calculateBlastRadius,
} from "../analyzer/dependency-graph.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const sampleRepository = path.join(testDirectory, "fixtures", "mern-sample");

test("buildDependencyGraph constructs forward and reverse adjacency maps from mock dependencies", () => {
  const mockDependencies = [
    {
      sourcePath: "src/A.js",
      targetPath: "src/B.js",
      specifier: "./B.js",
      resolutionStatus: "resolved",
      importedNames: ["bFunction"],
      location: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 20 },
      rawSource: 'import { bFunction } from "./B.js";',
    },
    {
      sourcePath: "src/B.js",
      targetPath: "src/C.js",
      specifier: "./C.js",
      resolutionStatus: "resolved",
      importedNames: ["cFunction"],
      location: { startLine: 2, startColumn: 1, endLine: 2, endColumn: 20 },
      rawSource: 'import { cFunction } from "./C.js";',
    },
    {
      sourcePath: "src/A.js",
      targetPath: null,
      specifier: "lodash",
      resolutionStatus: "external",
    },
  ];

  const graph = buildDependencyGraph(mockDependencies);

  // 1. Verify Nodes
  assert.equal(graph.nodes.length, 3);
  assert.deepEqual(graph.nodes, ["src/A.js", "src/B.js", "src/C.js"]);

  // 2. Verify Edges (External dependencies ignored from internal graph)
  assert.equal(graph.edges.length, 2);

  // 3. Verify Forward Dependencies (What does A import?)
  const aDeps = graph.getDependencies("src/A.js");
  assert.equal(aDeps.length, 1);
  assert.equal(aDeps[0].target, "src/B.js");

  // 4. Verify Reverse Dependents (Who imports C?)
  const cConsumers = graph.getDependents("src/C.js");
  assert.equal(cConsumers.length, 1);
  assert.equal(cConsumers[0].consumerPath, "src/B.js");

  // 5. Verify Reverse Dependents (Who imports B?)
  const bConsumers = graph.getDependents("src/B.js");
  assert.equal(bConsumers.length, 1);
  assert.equal(bConsumers[0].consumerPath, "src/A.js");
});

test("buildDependencyGraph builds complete forward and reverse graphs for mern-sample", async () => {
  const scanReport = await scanRepository(sampleRepository);
  const dependencies = resolveRepositoryDependencies(scanReport);
  const allFilePaths = scanReport.files.map((f) => f.path.split(path.sep).join("/"));

  const graph = buildDependencyGraph(dependencies, allFilePaths);

  // 1. Verify all files are registered as nodes
  assert.ok(graph.hasNode("server/models/user.js"));
  assert.ok(graph.hasNode("server/controllers/user-controller.js"));
  assert.ok(graph.hasNode("server/routes/user-routes.js"));
  assert.ok(graph.hasNode("server/index.js"));
  assert.ok(graph.hasNode("client/src/App.jsx"));
  assert.ok(graph.hasNode("client/src/styles.css"));

  // 2. Verify Reverse Chain: Who imports server/models/user.js?
  // Expectation: user-controller.js
  const userModelConsumers = graph.getDependents("server/models/user.js");
  assert.equal(userModelConsumers.length, 1);
  assert.equal(
    userModelConsumers[0].consumerPath,
    "server/controllers/user-controller.js",
  );
  assert.equal(userModelConsumers[0].specifier, "../models/user.js");

  // 3. Verify Reverse Chain: Who imports server/controllers/user-controller.js?
  // Expectation: user-routes.js
  const controllerConsumers = graph.getDependents(
    "server/controllers/user-controller.js",
  );
  assert.equal(controllerConsumers.length, 1);
  assert.equal(
    controllerConsumers[0].consumerPath,
    "server/routes/user-routes.js",
  );

  // 4. Verify Reverse Chain: Who imports server/routes/user-routes.js?
  // Expectation: server/index.js
  const routesConsumers = graph.getDependents("server/routes/user-routes.js");
  assert.equal(routesConsumers.length, 1);
  assert.equal(routesConsumers[0].consumerPath, "server/index.js");

  // 5. Verify Client-side Reverse Chain: Who imports client/src/styles.css?
  // Expectation: client/src/App.jsx
  const stylesConsumers = graph.getDependents("client/src/styles.css");
  assert.equal(stylesConsumers.length, 1);
  assert.equal(stylesConsumers[0].consumerPath, "client/src/App.jsx");

  // 6. Verify Leaf node (server/index.js is not imported by anyone)
  const indexConsumers = graph.getDependents("server/index.js");
  assert.equal(indexConsumers.length, 0);
});

test("calculateBlastRadius correctly traces direct and transitive blast radius in mern-sample", async () => {
  const scanReport = await scanRepository(sampleRepository);
  const dependencies = resolveRepositoryDependencies(scanReport);
  const graph = buildDependencyGraph(dependencies);

  // Suppose server/models/user.js is changed by a developer
  const blastRadius = calculateBlastRadius({
    graph,
    changedFiles: ["server/models/user.js"],
  });

  // Verify Summary
  assert.equal(blastRadius.summary.totalImpactedFiles, 3);
  assert.equal(blastRadius.summary.directDependentsCount, 1);
  assert.equal(blastRadius.summary.transitiveDependentsCount, 2);
  assert.equal(blastRadius.summary.totalFindings, 3);

  // 1. Finding 1: Direct dependent (Depth 1) -> user-controller.js
  const finding1 = blastRadius.findings.find(
    (f) => f.affectedFile === "server/controllers/user-controller.js",
  );
  assert.ok(finding1);
  assert.equal(finding1.depth, 1);
  assert.equal(finding1.impactType, "direct_dependency");
  assert.deepEqual(finding1.path, [
    "server/models/user.js",
    "server/controllers/user-controller.js",
  ]);
  assert.equal(finding1.evidence.location.startLine, 1);

  // 2. Finding 2: Transitive dependent (Depth 2) -> user-routes.js
  const finding2 = blastRadius.findings.find(
    (f) => f.affectedFile === "server/routes/user-routes.js",
  );
  assert.ok(finding2);
  assert.equal(finding2.depth, 2);
  assert.equal(finding2.impactType, "transitive_dependency");
  assert.deepEqual(finding2.path, [
    "server/models/user.js",
    "server/controllers/user-controller.js",
    "server/routes/user-routes.js",
  ]);

  // 3. Finding 3: Transitive dependent (Depth 3) -> server/index.js
  const finding3 = blastRadius.findings.find(
    (f) => f.affectedFile === "server/index.js",
  );
  assert.ok(finding3);
  assert.equal(finding3.depth, 3);
  assert.equal(finding3.impactType, "transitive_dependency");
  assert.deepEqual(finding3.path, [
    "server/models/user.js",
    "server/controllers/user-controller.js",
    "server/routes/user-routes.js",
    "server/index.js",
  ]);
});

test("calculateBlastRadius handles client-side changed assets", async () => {
  const scanReport = await scanRepository(sampleRepository);
  const dependencies = resolveRepositoryDependencies(scanReport);
  const graph = buildDependencyGraph(dependencies);

  // Suppose client/src/styles.css is changed
  const blastRadius = calculateBlastRadius({
    graph,
    changedFiles: ["client/src/styles.css"],
  });

  assert.equal(blastRadius.summary.totalImpactedFiles, 1);
  assert.equal(blastRadius.summary.directDependentsCount, 1);
  assert.equal(blastRadius.summary.transitiveDependentsCount, 0);

  const finding = blastRadius.findings[0];
  assert.equal(finding.affectedFile, "client/src/App.jsx");
  assert.equal(finding.depth, 1);
  assert.equal(finding.impactType, "direct_dependency");
});

test("calculateBlastRadius respects maxDepth constraint", async () => {
  const scanReport = await scanRepository(sampleRepository);
  const dependencies = resolveRepositoryDependencies(scanReport);
  const graph = buildDependencyGraph(dependencies);

  // Restrict to maxDepth = 1 (Only direct consumers)
  const blastRadius = calculateBlastRadius({
    graph,
    changedFiles: ["server/models/user.js"],
    maxDepth: 1,
  });

  // Only user-controller.js should be included, NOT routes (depth 2) or index (depth 3)
  assert.equal(blastRadius.summary.totalImpactedFiles, 1);
  assert.equal(blastRadius.findings.length, 1);
  assert.equal(blastRadius.findings[0].affectedFile, "server/controllers/user-controller.js");
});

test("calculateBlastRadius handles circular dependencies without infinite loops", () => {
  // A.js imports B.js, and B.js imports A.js
  const circularDeps = [
    {
      sourcePath: "src/A.js",
      targetPath: "src/B.js",
      specifier: "./B.js",
      resolutionStatus: "resolved",
    },
    {
      sourcePath: "src/B.js",
      targetPath: "src/A.js",
      specifier: "./A.js",
      resolutionStatus: "resolved",
    },
  ];

  const graph = buildDependencyGraph(circularDeps);

  // Change B.js
  const blastRadius = calculateBlastRadius({
    graph,
    changedFiles: ["src/B.js"],
    maxDepth: 10,
  });

  // A.js directly depends on B.js
  assert.equal(blastRadius.summary.totalImpactedFiles, 1);
  assert.equal(blastRadius.findings[0].affectedFile, "src/A.js");
  assert.equal(blastRadius.findings[0].depth, 1);
});

