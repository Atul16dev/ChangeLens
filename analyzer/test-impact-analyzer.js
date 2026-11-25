/**
 * Test Impact Analyzer (Predictive Test Selection) for ChangeLens
 * 
 * Maps code changes and AST dependency blast radius directly to test files,
 * enabling developers to run only the relevant test suites instead of
 * executing the entire test suite.
 */

import path from "node:path";

/**
 * Common test file regex patterns across major languages:
 * JavaScript / TypeScript: *.test.js, *.spec.ts, __tests__/*
 * Python: test_*.py, *_test.py, tests/*
 * Go: *_test.go
 * Java / Kotlin: *Test.java, *Tests.java, *TestCase.java, src/test/*
 * Rust: tests/*.rs, *_test.rs
 */
export const TEST_FILE_PATTERNS = [
  // JS / TS
  /\.(test|spec)\.[jt]sx?$/i,
  /(?:^|[\\/])(?:__tests__|tests?|specs?|e2e)[\\/].*\.[jt]sx?$/i,
  // Python
  /(?:^|[\\/])(?:test_[^\\/]+|[^\\/]+_test)\.py$/i,
  /(?:^|[\\/])tests?[\\/].*\.py$/i,
  // Go
  /[^\\/]+_test\.go$/i,
  // Java / Kotlin / Scala
  /[^\\/]+(?:Test|Tests|TestCase)\.(?:java|kt|scala)$/i,
  /(?:^|[\\/])src[\\/]test[\\/].*\.(?:java|kt|scala)$/i,
  // Rust
  /(?:^|[\\/])tests?[\\/].*\.rs$/i,
  /[^\\/]+_test\.rs$/i,
];

/**
 * Checks if a given file path is a test file.
 * @param {string} filePath
 * @returns {boolean}
 */
export function isTestFile(filePath) {
  if (!filePath || typeof filePath !== "string") return false;
  const normalized = filePath.replace(/\\/g, "/");
  return TEST_FILE_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Normalizes a file path to unix-style slashes.
 */
function normalizePath(p) {
  return typeof p === "string" ? p.replace(/\\/g, "/").replace(/^\/+/, "") : "";
}

/**
 * Extracts the base name without extensions or test prefixes/suffixes for heuristic matching.
 * E.g., "tests/controllers/auth.test.js" -> "auth"
 *       "src/services/auth.service.ts"   -> "auth"
 */
function extractStem(filePath) {
  const base = path.basename(filePath);
  return base
    .replace(/\.(test|spec)\.[a-zA-Z0-9]+$/i, "")
    .replace(/^test_/i, "")
    .replace(/_test\.[a-zA-Z0-9]+$/i, "")
    .replace(/(?:Test|Tests|TestCase)\.[a-zA-Z0-9]+$/i, "")
    .replace(/\.[a-zA-Z0-9]+$/i, "")
    .replace(/[-_.]service$|[-_.]controller$|[-_.]model$/i, "")
    .toLowerCase();
}

/**
 * Formulates the recommended CLI test command based on detected files.
 */
export function generateTestCommand(affectedTestPaths = [], allFiles = []) {
  if (!Array.isArray(affectedTestPaths) || affectedTestPaths.length === 0) {
    return null;
  }

  // Detect test framework / language primarily from the impacted test files themselves
  const isPython = affectedTestPaths.some((f) => f.endsWith(".py")) ||
    (affectedTestPaths.length === 0 && allFiles.some((f) => f.endsWith(".py")));
  const isGo = affectedTestPaths.some((f) => f.endsWith(".go"));
  const isJava = affectedTestPaths.some((f) => f.endsWith(".java") || f.endsWith(".kt"));

  if (isPython) {
    return `pytest ${affectedTestPaths.join(" ")}`;
  }
  if (isGo) {
    return `go test ${affectedTestPaths.join(" ")}`;
  }
  if (isJava) {
    const classNames = affectedTestPaths.map((f) => path.basename(f).replace(/\.[^.]+$/, ""));
    return `./gradlew test --tests "${classNames.join(",")}"`;
  }

  // Default: Node.js / Jest / Vitest / Node test runner
  return `npm test -- ${affectedTestPaths.join(" ")}`;
}

/**
 * Analyzes repository test impact based on AST dependency graph and Git diff changes.
 * 
 * @param {object} params
 * @param {Array<string>} [params.allFiles=[]] - All scanned repository files
 * @param {Array<object|string>} [params.changes=[]] - Parsed git changes or changed file paths
 * @param {object} [params.impactAnalysis=null] - Output from classifyImpactPolicies()
 * @param {object} [params.graph=null] - Dependency graph from buildDependencyGraph()
 * @param {Array<object>} [params.dependencies=[]] - Resolved module dependencies
 * @returns {object} Test impact report with affected tests, metrics, and suggested command
 */
export function analyzeTestImpact({
  allFiles = [],
  changes = [],
  impactAnalysis = null,
  graph = null,
  dependencies = [],
} = {}) {
  const normAllFiles = allFiles.map(normalizePath);

  // Normalize changed files into array of clean relative paths
  const changedPaths = (changes || [])
    .map((c) => (typeof c === "string" ? c : c?.path || c?.changedFile))
    .filter(Boolean)
    .map(normalizePath);

  const changedSet = new Set(changedPaths);

  // 1. Discover all test files in the repository
  const allTestFiles = normAllFiles.filter(isTestFile);
  const totalTestsCount = allTestFiles.length;

  if (totalTestsCount === 0) {
    return {
      totalTestsCount: 0,
      affectedTestsCount: 0,
      unaffectedTestsCount: 0,
      timeSavedPercentage: 0,
      affectedTests: [],
      unaffectedTests: [],
      recommendedCommand: null,
      summary: "No test files were detected in this repository.",
      hasTestCoverage: false,
    };
  }

  // Build lookups for fast impact classification
  const blastRadiusList = impactAnalysis?.blastRadius || [];
  const blastRadiusMap = new Map();
  for (const b of blastRadiusList) {
    const f = normalizePath(b.affectedFile || b.file);
    if (f) blastRadiusMap.set(f, b);
  }

  // Map of targetPath -> [consumer sourcePaths] from dependencies
  const consumerMap = new Map();
  for (const dep of dependencies) {
    if (dep && dep.targetPath && dep.sourcePath) {
      const target = normalizePath(dep.targetPath);
      const source = normalizePath(dep.sourcePath);
      if (!consumerMap.has(target)) consumerMap.set(target, new Set());
      consumerMap.get(target).add(source);
    }
  }

  const affectedMap = new Map(); // testPath -> testImpactObject

  // 2. Classify impact for each test file
  for (const testFile of allTestFiles) {
    // Scenario A: Test file itself was modified/added
    if (changedSet.has(testFile)) {
      affectedMap.set(testFile, {
        file: testFile,
        impactType: "TEST_MODIFIED",
        depth: 0,
        confidence: "HIGH",
        reason: "Test file was directly modified in this change.",
        targetChangedFile: testFile,
      });
      continue;
    }

    // Scenario B: Test file directly imports a changed file (Depth 1)
    let directlyImportsChanged = false;
    for (const changed of changedPaths) {
      const consumers = consumerMap.get(changed);
      if (consumers && consumers.has(testFile)) {
        affectedMap.set(testFile, {
          file: testFile,
          impactType: "DIRECT_DEPENDENCY",
          depth: 1,
          confidence: "HIGH",
          reason: `Test directly imports modified module "${changed}".`,
          targetChangedFile: changed,
        });
        directlyImportsChanged = true;
        break;
      }
    }
    if (directlyImportsChanged) continue;

    // Scenario C: Test file is in AST blast radius (Transitive Depth 2+)
    if (blastRadiusMap.has(testFile)) {
      const finding = blastRadiusMap.get(testFile);
      const depth = finding.depth || 2;
      const pathRoute = Array.isArray(finding.path) ? finding.path.join(" ➔ ") : null;
      affectedMap.set(testFile, {
        file: testFile,
        impactType: depth === 1 ? "DIRECT_DEPENDENCY" : "TRANSITIVE_DEPENDENCY",
        depth,
        confidence: depth === 1 ? "HIGH" : "MEDIUM",
        reason: pathRoute
          ? `Transitive dependency affected via route: ${pathRoute}`
          : `Downstream consumer affected at depth ${depth}.`,
        targetChangedFile: finding.changedFile || changedPaths[0] || null,
      });
      continue;
    }

    // Scenario D: Heuristic stem/name matching (e.g. auth.js changed -> auth.test.js)
    const testStem = extractStem(testFile);
    if (testStem && testStem.length >= 3) {
      for (const changed of changedPaths) {
        const changedStem = extractStem(changed);
        if (changedStem && (changedStem === testStem || testStem.includes(changedStem))) {
          affectedMap.set(testFile, {
            file: testFile,
            impactType: "NAMING_HEURISTIC",
            depth: 1,
            confidence: "MEDIUM",
            reason: `Test file stem "${testStem}" matches modified file "${path.basename(changed)}".`,
            targetChangedFile: changed,
          });
          break;
        }
      }
    }
  }

  const affectedTests = Array.from(affectedMap.values()).sort((a, b) => {
    // Sort by depth ascending, then confidence
    if (a.depth !== b.depth) return a.depth - b.depth;
    return a.file.localeCompare(b.file);
  });

  const affectedFilesSet = new Set(affectedTests.map((t) => t.file));
  const unaffectedTests = allTestFiles
    .filter((t) => !affectedFilesSet.has(t))
    .sort();

  const affectedTestsCount = affectedTests.length;
  const unaffectedTestsCount = unaffectedTests.length;

  const timeSavedPercentage =
    totalTestsCount > 0
      ? Math.max(0, Math.round(((totalTestsCount - affectedTestsCount) / totalTestsCount) * 100))
      : 0;

  const recommendedCommand = generateTestCommand(
    affectedTests.map((t) => t.file),
    normAllFiles
  );

  return {
    totalTestsCount,
    affectedTestsCount,
    unaffectedTestsCount,
    timeSavedPercentage,
    hasTestCoverage: affectedTestsCount > 0,
    affectedTests,
    unaffectedTests,
    recommendedCommand,
    summary:
      affectedTestsCount > 0
        ? `Identified ${affectedTestsCount} of ${totalTestsCount} tests affected by this change (~${timeSavedPercentage}% execution time saved).`
        : `None of the ${totalTestsCount} test suites were impacted by these modifications.`,
  };
}
