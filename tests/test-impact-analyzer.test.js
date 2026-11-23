import assert from "node:assert/strict";
import test from "node:test";
import {
  isTestFile,
  generateTestCommand,
  analyzeTestImpact,
} from "../analyzer/test-impact-analyzer.js";

test("Test Impact Analyzer (Predictive Test Selection) Suite", async (t) => {
  await t.test("isTestFile accurately classifies test files across multiple languages", () => {
    // JavaScript / TypeScript
    assert.equal(isTestFile("tests/auth.test.js"), true);
    assert.equal(isTestFile("src/components/__tests__/Button.spec.tsx"), true);
    assert.equal(isTestFile("specs/e2e/login.spec.js"), true);
    assert.equal(isTestFile("test/unit/utils.test.ts"), true);

    // Python
    assert.equal(isTestFile("tests/test_calculator.py"), true);
    assert.equal(isTestFile("services/user_test.py"), true);

    // Go
    assert.equal(isTestFile("pkg/api/handler_test.go"), true);

    // Java / Kotlin
    assert.equal(isTestFile("src/test/java/com/app/AuthServiceTest.java"), true);
    assert.equal(isTestFile("tests/UserTestCase.kt"), true);

    // Rust
    assert.equal(isTestFile("tests/integration_test.rs"), true);

    // Non-test source files
    assert.equal(isTestFile("api/controllers/auth.controller.js"), false);
    assert.equal(isTestFile("src/components/Button.jsx"), false);
    assert.equal(isTestFile("services/calculator.py"), false);
    assert.equal(isTestFile("cmd/server/main.go"), false);
    assert.equal(isTestFile("README.md"), false);
  });

  await t.test("generateTestCommand adapts to different programming languages", () => {
    // Node.js / JavaScript
    const jsCmd = generateTestCommand(["tests/auth.test.js", "tests/user.test.js"], ["package.json"]);
    assert.equal(jsCmd, "npm test -- tests/auth.test.js tests/user.test.js");

    // Python
    const pyCmd = generateTestCommand(["tests/test_auth.py"], ["test_auth.py"]);
    assert.equal(pyCmd, "pytest tests/test_auth.py");

    // Go
    const goCmd = generateTestCommand(["pkg/api/handler_test.go"], ["handler_test.go"]);
    assert.equal(goCmd, "go test pkg/api/handler_test.go");

    // Empty list returns null
    assert.equal(generateTestCommand([]), null);
  });

  await t.test("analyzeTestImpact handles repositories with no test files gracefully", () => {
    const result = analyzeTestImpact({
      allFiles: ["src/index.js", "src/utils.js"],
      changes: ["src/utils.js"],
    });

    assert.equal(result.totalTestsCount, 0);
    assert.equal(result.affectedTestsCount, 0);
    assert.equal(result.hasTestCoverage, false);
    assert.equal(result.recommendedCommand, null);
  });

  await t.test("analyzeTestImpact identifies direct test dependencies and calculates time saved", () => {
    const allFiles = [
      "src/auth.js",
      "src/database.js",
      "src/payments.js",
      "tests/auth.test.js",
      "tests/database.test.js",
      "tests/payments.test.js",
      "tests/e2e.test.js",
    ];

    const dependencies = [
      { sourcePath: "tests/auth.test.js", targetPath: "src/auth.js", resolutionStatus: "resolved" },
      { sourcePath: "tests/database.test.js", targetPath: "src/database.js", resolutionStatus: "resolved" },
      { sourcePath: "tests/payments.test.js", targetPath: "src/payments.js", resolutionStatus: "resolved" },
    ];

    const impactAnalysis = {
      blastRadius: [
        { file: "tests/auth.test.js", affectedFile: "tests/auth.test.js", depth: 1, changedFile: "src/auth.js" },
      ],
      summary: { directDependentsCount: 1, transitiveDependentsCount: 0 },
    };

    const result = analyzeTestImpact({
      allFiles,
      changes: ["src/auth.js"],
      impactAnalysis,
      dependencies,
    });

    assert.equal(result.totalTestsCount, 4);
    assert.equal(result.affectedTestsCount, 1);
    assert.equal(result.unaffectedTestsCount, 3);
    // 1 affected out of 4 tests = 3 saved = 75% saved
    assert.equal(result.timeSavedPercentage, 75);
    assert.equal(result.affectedTests[0].file, "tests/auth.test.js");
    assert.equal(result.affectedTests[0].impactType, "DIRECT_DEPENDENCY");
    assert.equal(result.affectedTests[0].confidence, "HIGH");
    assert.ok(result.recommendedCommand.includes("tests/auth.test.js"));
  });

  await t.test("analyzeTestImpact detects naming heuristics when dynamic imports are used", () => {
    const allFiles = [
      "src/controllers/payment.controller.js",
      "tests/payment.test.js",
      "tests/other.test.js",
    ];

    const result = analyzeTestImpact({
      allFiles,
      changes: ["src/controllers/payment.controller.js"],
      dependencies: [],
      impactAnalysis: { blastRadius: [] },
    });

    assert.equal(result.totalTestsCount, 2);
    assert.equal(result.affectedTestsCount, 1);
    assert.equal(result.affectedTests[0].file, "tests/payment.test.js");
    assert.equal(result.affectedTests[0].impactType, "NAMING_HEURISTIC");
  });
});
