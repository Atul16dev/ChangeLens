import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateDetailedRiskScore,
  getTierFromScore,
  RISK_TIERS,
} from "../analyzer/risk-engine.js";

test("Explainable Risk Engine (0-100 Score) Suite", async (t) => {
  await t.test("getTierFromScore correctly maps numerical ranges to tiers", () => {
    assert.equal(getTierFromScore(15), "LOW");
    assert.equal(getTierFromScore(30), "LOW");
    assert.equal(getTierFromScore(31), "MEDIUM");
    assert.equal(getTierFromScore(55), "MEDIUM");
    assert.equal(getTierFromScore(61), "HIGH");
    assert.equal(getTierFromScore(80), "HIGH");
    assert.equal(getTierFromScore(81), "CRITICAL");
    assert.equal(getTierFromScore(100), "CRITICAL");
  });

  await t.test("Broken imports or missing symbols escalate score to CRITICAL tier (≥ 81)", () => {
    const result = calculateDetailedRiskScore({
      summary: { brokenImportsCount: 2, brokenSymbolsCount: 0, directDependentsCount: 1 },
      changes: ["src/deleted-file.js"],
    });

    assert.ok(result.score >= 81);
    assert.equal(result.tier, "CRITICAL");
    assert.ok(result.factors.some((f) => f.id === "broken_imports"));
    assert.ok(result.recommendation.includes("Do not merge"));
  });

  await t.test("Modifying authentication or database modules adds domain criticality points (+25 pts for auth)", () => {
    const authResult = calculateDetailedRiskScore({
      summary: { directDependentsCount: 1 },
      changes: ["api/middleware/auth.js"],
    });

    const standardResult = calculateDetailedRiskScore({
      summary: { directDependentsCount: 1 },
      changes: ["src/utils/string-helper.js"],
    });

    assert.ok(authResult.score > standardResult.score);
    const authFactor = authResult.factors.find((f) => f.id === "sensitive_auth_security");
    assert.ok(authFactor);
    assert.equal(authFactor.points, 25);
  });

  await t.test("Broken symbol references assign +20 points and blast radius depth > 3 assigns +15 points", () => {
    const symbolResult = calculateDetailedRiskScore({
      summary: { brokenImportsCount: 0, brokenSymbolsCount: 1, directDependentsCount: 1 },
      changes: ["src/user.js"],
      impactAnalysis: {
        blastRadius: [
          { depth: 1, file: "a.js" },
          { depth: 2, file: "b.js" },
          { depth: 3, file: "c.js" },
          { depth: 4, file: "d.js" }, // Depth > 3
        ],
      },
    });

    const symbolFactor = symbolResult.factors.find((f) => f.id === "broken_symbols");
    assert.ok(symbolFactor);
    assert.equal(symbolFactor.points, 20);

    const depthFactor = symbolResult.factors.find((f) => f.id === "deep_propagation");
    assert.ok(depthFactor);
    assert.equal(depthFactor.points, 15);
  });

  await t.test("Targeted automated test coverage mitigates risk score", () => {
    const withTests = calculateDetailedRiskScore({
      summary: { directDependentsCount: 2 },
      changes: ["src/feature.js"],
      testImpact: { totalTestsCount: 5, affectedTestsCount: 2 },
    });

    const withoutTests = calculateDetailedRiskScore({
      summary: { directDependentsCount: 2 },
      changes: ["src/feature.js"],
      testImpact: { totalTestsCount: 5, affectedTestsCount: 0 },
    });

    assert.ok(withTests.score < withoutTests.score);
    assert.ok(withTests.factors.some((f) => f.id === "test_mitigation"));
  });

  await t.test("Score is strictly clamped to [0, 100]", () => {
    const hugePR = calculateDetailedRiskScore({
      summary: {
        brokenImportsCount: 10,
        brokenSymbolsCount: 10,
        directDependentsCount: 50,
        transitiveDependentsCount: 100,
        impactedFilesCount: 150,
      },
      changes: Array.from({ length: 25 }, (_, i) => `src/file_${i}.js`),
    });

    assert.equal(hugePR.score, 100);
    assert.equal(hugePR.tier, "CRITICAL");
  });
});
