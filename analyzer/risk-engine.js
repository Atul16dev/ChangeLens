/**
 * Explainable Risk Scoring Engine for ChangeLens
 * 
 * Computes a transparent, deterministic 0–100 numerical risk score for
 * Pull Requests and code changes based on:
 * 1. Fatal AST defects (broken imports, missing symbols)
 * 2. Dependency blast radius size & propagation depth
 * 3. Critical architectural modules (auth, database, core routes)
 * 4. Scope and volume of changed files
 * 5. Test Impact Analysis safety net (mitigates risk when tests cover changes)
 */

export const RISK_TIERS = {
  LOW: { min: 0, max: 30, label: "LOW RISK", color: "emerald", icon: "CheckCircle2" },
  MEDIUM: { min: 31, max: 60, label: "MEDIUM RISK", color: "amber", icon: "AlertTriangle" },
  HIGH: { min: 61, max: 80, label: "HIGH RISK", color: "orange", icon: "ShieldAlert" },
  CRITICAL: { min: 81, max: 100, label: "CRITICAL RISK", color: "rose", icon: "AlertOctagon" },
};

/**
 * Patterns matching critical architectural modules
 */
const SENSITIVE_PATTERNS = [
  {
    category: "auth_security",
    label: "Authentication / Security Module",
    pattern: /(?:^|[\\/])(?:auth|security|jwt|token|permission|admin|session|password|crypto|oauth)[^\\/]*\.[a-zA-Z0-9]+$/i,
    weight: 25,
    description: "Modifications to authentication, security, or access control boundaries.",
  },
  {
    category: "database_models",
    label: "Database / Data Model",
    pattern: /(?:^|[\\/])(?:models?|schemas?|db|database|entities|migrations?)[\\/][^\\/]+\.[a-zA-Z0-9]+$/i,
    weight: 15,
    description: "Modifications to database schemas, ORM models, or data layer repositories.",
  },
  {
    category: "core_infrastructure",
    label: "Core Entrypoint / Router",
    pattern: /(?:^|[\\/])(?:server|app|index|main|router|routes?)[^\\/]*\.[a-zA-Z0-9]+$/i,
    weight: 10,
    description: "Changes in central application entrypoints or route dispatchers.",
  },
  {
    category: "configuration",
    label: "Configuration / Environment",
    pattern: /(?:^|[\\/])(?:config|settings|\.env|docker|compose|package\.json)[^\\/]*$/i,
    weight: 5,
    description: "Modifications to runtime environment, configurations, or dependency manifests.",
  },
];

/**
 * Determines risk tier from a numerical score.
 * @param {number} score 0-100
 * @returns {"LOW" | "MEDIUM" | "HIGH" | "CRITICAL"}
 */
export function getTierFromScore(score) {
  if (score >= 81) return "CRITICAL";
  if (score >= 61) return "HIGH";
  if (score >= 31) return "MEDIUM";
  return "LOW";
}

/**
 * Calculates a deterministic, explainable 0–100 risk score.
 * 
 * @param {object} params
 * @param {object} [params.summary={}] - Summary metrics from impact analysis
 * @param {Array<object|string>} [params.changes=[]] - Parsed git changes
 * @param {object} [params.impactAnalysis=null] - Full impact analysis report
 * @param {object} [params.testImpact=null] - Test impact analysis report
 * @returns {object} Comprehensive risk assessment with score, factors, and recommendation
 */
export function calculateDetailedRiskScore({
  summary = {},
  changes = [],
  impactAnalysis = null,
  testImpact = null,
} = {}) {
  const factors = [];
  let score = 5; // Baseline operational modification risk

  const {
    brokenImportsCount = 0,
    brokenSymbolsCount = 0,
    directDependentsCount = 0,
    transitiveDependentsCount = 0,
    impactedFilesCount = 0,
  } = summary;

  const blastRadius = impactAnalysis?.blastRadius || [];
  const changedPaths = (changes || [])
    .map((c) => (typeof c === "string" ? c : c?.path || c?.changedFile))
    .filter(Boolean);

  // 1. FATAL DEFECTS: Broken Imports & Missing Symbols (Highest Priority)
  if (brokenImportsCount > 0) {
    const pts = Math.min(50, brokenImportsCount * 25);
    score += pts;
    factors.push({
      id: "broken_imports",
      name: "Broken Local Imports Detected",
      points: pts,
      severity: "CRITICAL",
      category: "defect",
      description: `${brokenImportsCount} file(s) reference deleted or missing local modules. Causes immediate compile/runtime crash.`,
    });
  }

  if (brokenSymbolsCount > 0) {
    const pts = Math.min(40, brokenSymbolsCount * 20);
    score += pts;
    factors.push({
      id: "broken_symbols",
      name: "Broken Export / Symbol Reference",
      points: pts,
      severity: "CRITICAL",
      category: "defect",
      description: `${brokenSymbolsCount} dependent file(s) call functions or exports that do not exist in the target module.`,
    });
  }

  // 2. DEPENDENCY BLAST RADIUS (Downstream Consumers)
  if (directDependentsCount > 0) {
    const pts = Math.min(20, directDependentsCount * 5);
    score += pts;
    factors.push({
      id: "direct_dependents",
      name: "Direct Consumer Impact (Depth 1)",
      points: pts,
      severity: directDependentsCount >= 3 ? "HIGH" : "MEDIUM",
      category: "blast_radius",
      description: `${directDependentsCount} direct dependent file(s) consume modified code.`,
    });
  }

  if (transitiveDependentsCount > 0) {
    const pts = Math.min(10, transitiveDependentsCount * 2);
    score += pts;
    factors.push({
      id: "transitive_dependents",
      name: "Transitive Blast Radius (Depth 2+)",
      points: pts,
      severity: "MEDIUM",
      category: "blast_radius",
      description: `${transitiveDependentsCount} indirect downstream module(s) are in the dependency propagation tree.`,
    });
  }

  // Maximum Propagation Depth
  let maxDepth = 0;
  for (const b of blastRadius) {
    if (b.depth && b.depth > maxDepth) maxDepth = b.depth;
  }
  if (maxDepth > 3) {
    score += 15;
    factors.push({
      id: "deep_propagation",
      name: "Blast Radius Depth > 3 (Deep Propagation)",
      points: 15,
      severity: "HIGH",
      category: "architecture",
      description: `Impact propagates ${maxDepth} layers deep across system boundaries (> 3 layers).`,
    });
  } else if (maxDepth === 3) {
    score += 8;
    factors.push({
      id: "moderate_propagation",
      name: "Moderate Propagation (Depth = 3)",
      points: 8,
      severity: "MEDIUM",
      category: "architecture",
      description: "Impact propagates 3 layers deep across system boundaries.",
    });
  }

  // 3. CRITICAL / SENSITIVE MODULE TOUCHES
  const detectedSensitive = new Set();
  let sensitivePointsTotal = 0;

  for (const filePath of changedPaths) {
    for (const rule of SENSITIVE_PATTERNS) {
      if (rule.pattern.test(filePath) && !detectedSensitive.has(rule.category)) {
        detectedSensitive.add(rule.category);
        const addedPts = Math.min(rule.weight, 35 - sensitivePointsTotal);
        if (addedPts > 0) {
          sensitivePointsTotal += addedPts;
          factors.push({
            id: `sensitive_${rule.category}`,
            name: rule.label,
            points: addedPts,
            severity: addedPts >= 15 ? "HIGH" : "MEDIUM",
            category: "domain_criticality",
            description: `${rule.description} (File: ${filePath.split("/").pop()})`,
          });
        }
      }
    }
  }
  score += sensitivePointsTotal;

  // 4. CHANGE VOLUME / SCOPE
  const changeCount = changedPaths.length;
  if (changeCount > 10) {
    score += 15;
    factors.push({
      id: "large_pr_volume",
      name: "Large Change Surface (>10 files)",
      points: 15,
      severity: "HIGH",
      category: "scope",
      description: `Pull request touches ${changeCount} files. Large diffs historically correlate with higher defect rates.`,
    });
  } else if (changeCount >= 4) {
    score += 6;
    factors.push({
      id: "moderate_pr_volume",
      name: "Multi-file Changes (4-10 files)",
      points: 6,
      severity: "MEDIUM",
      category: "scope",
      description: `Pull request touches ${changeCount} files across multiple modules.`,
    });
  }

  // 5. TEST IMPACT ANALYSIS (Safety Net Feedback Loop)
  if (testImpact && testImpact.totalTestsCount > 0) {
    if (testImpact.affectedTestsCount > 0) {
      // Safety net present: Deduct risk because direct automated tests exist
      const deduction = Math.min(15, testImpact.affectedTestsCount * 5);
      score -= deduction;
      factors.push({
        id: "test_mitigation",
        name: "Automated Test Coverage Safety Net",
        points: -deduction,
        severity: "LOW",
        category: "test_safety",
        description: `${testImpact.affectedTestsCount} targeted test file(s) directly cover the modified modules.`,
      });
    } else if (changeCount > 0 && (directDependentsCount > 0 || sensitivePointsTotal > 0)) {
      // Untested critical change: Add risk penalty
      score += 12;
      factors.push({
        id: "untested_change_penalty",
        name: "No Direct Test Coverage Detected",
        points: 12,
        severity: "HIGH",
        category: "test_safety",
        description: "Modified components have zero direct test suites detected in the repository.",
      });
    }
  }

  // Ensure minimum floor for critical issues
  if ((brokenImportsCount > 0 || brokenSymbolsCount > 0) && score < 81) {
    score = 85;
  }

  // Clamp final score strictly to [0, 100]
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const tier = getTierFromScore(finalScore);
  const tierConfig = RISK_TIERS[tier];

  // Actionable Reviewer Recommendation
  let recommendation = "";
  if (tier === "CRITICAL") {
    recommendation = "🚨 Do not merge. Resolve broken imports and missing symbol references immediately to avoid breaking builds.";
  } else if (tier === "HIGH") {
    recommendation = `⚠️ High blast radius (${impactedFilesCount} files). Require manual sign-off and run targeted test suites before merging.`;
  } else if (tier === "MEDIUM") {
    recommendation = `🔶 Moderate impact. Verify direct downstream consumers and ensure regression tests pass.`;
  } else {
    recommendation = "✅ Low risk change. Isolated blast radius with minimal downstream dependency impact.";
  }

  return {
    score: finalScore,
    tier,
    label: tierConfig.label,
    color: tierConfig.color,
    factors: factors.sort((a, b) => Math.abs(b.points) - Math.abs(a.points)),
    recommendation,
    metrics: {
      totalChanges: changeCount,
      impactedFiles: impactedFilesCount,
      brokenDefects: brokenImportsCount + brokenSymbolsCount,
      maxDepth,
      affectedTestsCount: testImpact?.affectedTestsCount || 0,
    },
  };
}
