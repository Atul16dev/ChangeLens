import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanRepository } from "../analyzer/repository-scanner.js";
import { resolveRepositoryDependencies } from "../analyzer/dependency-resolver.js";
import { buildDependencyGraph } from "../analyzer/dependency-graph.js";
import {
  classifyImpactPolicies,
  IMPACT_SEVERITY,
} from "../analyzer/change-classifier.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const sampleRepository = path.join(testDirectory, "fixtures", "mern-sample");

test("classifyImpactPolicies flags CRITICAL broken imports when a dependency is deleted", async () => {
  const scanReport = await scanRepository(sampleRepository);
  const dependencies = resolveRepositoryDependencies(scanReport);
  const graph = buildDependencyGraph(dependencies);

  // Suppose server/models/user.js was deleted in a commit/PR
  const changes = [
    {
      path: "server/models/user.js",
      status: "deleted",
      statusCode: "D",
    },
  ];

  const result = classifyImpactPolicies({ changes, graph });

  assert.equal(result.summary.brokenImportsCount, 1);
  assert.equal(result.summary.criticalAlerts, true);

  const broken = result.brokenImports[0];
  assert.equal(broken.type, "broken_import");
  assert.equal(broken.severity, IMPACT_SEVERITY.CRITICAL);
  assert.equal(broken.deletedFile, "server/models/user.js");
  assert.equal(broken.affectedFile, "server/controllers/user-controller.js");
  assert.ok(broken.explanation.includes("DELETED"));
  assert.ok(broken.recommendation.includes("remove or replace"));
});

test("classifyImpactPolicies flags HIGH stale import paths when a file is renamed", async () => {
  const scanReport = await scanRepository(sampleRepository);
  const dependencies = resolveRepositoryDependencies(scanReport);
  const graph = buildDependencyGraph(dependencies);

  // Suppose user.js was renamed to Customer.js, but user-controller.js still imports old path
  const changes = [
    {
      path: "server/models/Customer.js",
      oldPath: "server/models/user.js",
      status: "renamed",
      statusCode: "R",
    },
  ];

  const result = classifyImpactPolicies({ changes, graph });

  assert.equal(result.summary.staleRenamesCount, 1);

  const stale = result.staleRenames[0];
  assert.equal(stale.type, "stale_import_path");
  assert.equal(stale.severity, IMPACT_SEVERITY.HIGH);
  assert.equal(stale.oldPath, "server/models/user.js");
  assert.equal(stale.newPath, "server/models/Customer.js");
  assert.equal(stale.affectedFile, "server/controllers/user-controller.js");
});

test("classifyImpactPolicies prioritizes modified files with HIGH, MEDIUM, LOW severity based on depth", async () => {
  const scanReport = await scanRepository(sampleRepository);
  const dependencies = resolveRepositoryDependencies(scanReport);
  const graph = buildDependencyGraph(dependencies);

  // Modify user.js
  const changes = [
    {
      path: "server/models/user.js",
      status: "modified",
      statusCode: "M",
    },
  ];

  const result = classifyImpactPolicies({ changes, graph });

  assert.equal(result.blastRadius.length, 3);

  // Depth 1 -> HIGH severity
  const depth1 = result.blastRadius.find((f) => f.depth === 1);
  assert.equal(depth1.severity, IMPACT_SEVERITY.HIGH);
  assert.equal(depth1.affectedFile, "server/controllers/user-controller.js");

  // Depth 2 -> MEDIUM severity
  const depth2 = result.blastRadius.find((f) => f.depth === 2);
  assert.equal(depth2.severity, IMPACT_SEVERITY.MEDIUM);
  assert.equal(depth2.affectedFile, "server/routes/user-routes.js");

  // Depth 3 -> LOW severity
  const depth3 = result.blastRadius.find((f) => f.depth === 3);
  assert.equal(depth3.severity, IMPACT_SEVERITY.LOW);
  assert.equal(depth3.affectedFile, "server/index.js");
});

test("classifyImpactPolicies orders allFindings with CRITICAL alerts strictly first", async () => {
  const scanReport = await scanRepository(sampleRepository);
  const dependencies = resolveRepositoryDependencies(scanReport);
  const graph = buildDependencyGraph(dependencies);

  // Multiple changes: One deleted file (CRITICAL) and one modified file (HIGH/MEDIUM)
  const changes = [
    {
      path: "client/src/styles.css",
      status: "modified",
    },
    {
      path: "server/models/user.js",
      status: "deleted",
    },
  ];

  const result = classifyImpactPolicies({ changes, graph });

  // First finding in allFindings MUST be the CRITICAL broken import
  assert.ok(result.allFindings.length >= 2);
  assert.equal(result.allFindings[0].severity, IMPACT_SEVERITY.CRITICAL);
  assert.equal(result.allFindings[0].type, "broken_import");
});

test("classifyImpactPolicies flags unresolved local imports as CRITICAL broken imports", async () => {
  const unresolvedDependencies = [
    {
      sourcePath: "server/controllers/user-controller.js",
      targetPath: "server/models/missing-model.js",
      specifier: "../models/missing-model.js",
      resolutionStatus: "unresolved-local",
      location: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 45 },
      rawSource: 'import User from "../models/missing-model.js";',
    },
  ];

  const graph = { getDependents: () => [] };
  const result = classifyImpactPolicies({
    changes: [{ path: "server/controllers/user-controller.js", status: "modified" }],
    graph,
    unresolvedDependencies,
  });

  assert.equal(result.summary.brokenImportsCount, 1);
  assert.equal(result.summary.criticalAlerts, true);
  assert.equal(result.brokenImports[0].severity, IMPACT_SEVERITY.CRITICAL);
  assert.equal(result.brokenImports[0].affectedFile, "server/controllers/user-controller.js");
  assert.ok(result.brokenImports[0].explanation.includes("cannot be resolved"));
});
