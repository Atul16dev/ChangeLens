import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { scanRepository } from "../analyzer/repository-scanner.js";
import { resolveRepositoryDependencies } from "../analyzer/dependency-resolver.js";
import { buildDependencyGraph } from "../analyzer/dependency-graph.js";
import { classifyImpactPolicies } from "../analyzer/change-classifier.js";
import {
  calculateRiskLevel,
  formatPRMarkdownComment,
  buildDeterministicNarrative,
  generateImpactExplanation,
} from "../analyzer/ai-explainer.js";

test("calculateRiskLevel correctly assigns risk tiers", () => {
  assert.equal(calculateRiskLevel({ brokenImportsCount: 2 }), "CRITICAL");
  assert.equal(calculateRiskLevel({ brokenImportsCount: 0, directDependentsCount: 1 }), "HIGH");
  assert.equal(calculateRiskLevel({ brokenImportsCount: 0, directDependentsCount: 0, transitiveDependentsCount: 3 }), "MEDIUM");
  assert.equal(calculateRiskLevel({ brokenImportsCount: 0, directDependentsCount: 0, transitiveDependentsCount: 0 }), "LOW");
});

test("formatPRMarkdownComment generates GitHub-flavored markdown with alerts and tables", () => {
  const mockImpact = {
    summary: {
      totalChangedFiles: 1,
      impactedFilesCount: 2,
      brokenImportsCount: 1,
      directDependentsCount: 1,
      transitiveDependentsCount: 1,
    },
    brokenImports: [
      {
        deletedFile: "server/models/user.js",
        affectedFile: "server/controllers/user-controller.js",
        evidence: {
          location: { startLine: 4 },
          rawSource: "const User = require('../models/user');",
        },
      },
    ],
    blastRadius: [
      {
        file: "server/controllers/user-controller.js",
        depth: 1,
        path: ["server/models/user.js", "server/controllers/user-controller.js"],
      },
    ],
  };

  const md = formatPRMarkdownComment({
    impactAnalysis: mockImpact,
    changes: [{ path: "server/models/user.js", status: "deleted" }],
    riskLevel: "CRITICAL",
  });

  assert.ok(md.includes("## 🔍 ChangeLens Impact Analysis Report"));
  assert.ok(md.includes("CRITICAL RISK"));
  assert.ok(md.includes("> [!CAUTION]"));
  assert.ok(md.includes("CRITICAL BROKEN IMPORTS DETECTED"));
  assert.ok(md.includes("const User = require('../models/user');"));
  assert.ok(md.includes("<details>"));
  assert.ok(md.includes("Reviewer & Author Checklist"));
});

test("generateImpactExplanation runs end-to-end on real mern-sample analysis", async () => {
  const targetDir = path.resolve(process.cwd(), "tests/fixtures/mern-sample");
  const scanReport = await scanRepository(targetDir);
  const dependencies = resolveRepositoryDependencies(scanReport);
  const allFiles = scanReport.files.map((f) => f.path.split(path.sep).join("/"));
  const graph = buildDependencyGraph(dependencies, allFiles);

  const impactAnalysis = classifyImpactPolicies({
    changes: [{ path: "server/models/user.js", status: "modified" }],
    graph,
  });

  const explanation = await generateImpactExplanation({
    impactAnalysis,
    changes: [{ path: "server/models/user.js", status: "modified" }],
    options: { provider: "mock" },
  });

  assert.ok(explanation);
  assert.equal(explanation.riskLevel, "HIGH");
  assert.equal(explanation.aiEnhanced, false);
  assert.ok(explanation.executiveSummary.includes("Modifications in 1 file(s)"));
  assert.ok(Array.isArray(explanation.actionItems));
  assert.ok(explanation.actionItems.length > 0);
  assert.ok(explanation.prCommentMarkdown.includes("ChangeLens Impact Analysis Report"));
  assert.ok(explanation.prCommentMarkdown.includes("Depth 1 (Direct)"));
});
