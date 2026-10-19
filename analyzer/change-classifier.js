/**
 * Change Status Impact Classifier for ChangeLens
 * 
 * Part 3: Applies domain-specific impact analysis policies based on Git change status:
 * - DELETED files: Detects broken imports (CRITICAL severity)
 * - RENAMED files: Detects stale import references to old path (HIGH severity)
 * - MODIFIED files: Computes reverse BFS blast radius (HIGH/MEDIUM severity)
 * - ADDED files: Inspects outgoing dependencies and consumer connections
 */

import { calculateBlastRadius } from "./dependency-graph.js";

/**
 * Severities used for prioritizing findings in developer and PR reports.
 */
export const IMPACT_SEVERITY = {
  CRITICAL: "CRITICAL", // Guaranteed build failure or runtime crash (e.g. broken import)
  HIGH: "HIGH",         // Direct dependent of modified file or stale renamed path
  MEDIUM: "MEDIUM",     // Transitive dependent (Depth 2)
  LOW: "LOW",           // Deep transitive dependent (Depth 3+)
  INFO: "INFO",         // Informational (e.g. outgoing dependency of added file)
};

/**
 * Analyzes changes and applies specialized impact policies based on Git file status.
 * 
 * @param {object} params
 * @param {Array<object>} params.changes - Array of parsed git changes from diff-parser.js
 * @param {object} params.graph - Dependency graph from dependency-graph.js
 * @param {number} [params.maxDepth=10] - Maximum traversal depth for modified files
 * @returns {object} Comprehensive categorized impact report
 */
export function classifyImpactPolicies({
  changes = [],
  graph,
  maxDepth = 10,
  unresolvedDependencies = [],
}) {
  if (!graph || typeof graph.getDependents !== "function") {
    throw new TypeError("A valid dependency graph instance is required.");
  }

  const brokenImportFindings = [];
  const seenBroken = new Set();
  const staleRenameFindings = [];
  const addedFileFindings = [];
  const modifiedFileChanges = [];

  // Policy 0: UNRESOLVED LOCAL IMPORTS (Detected directly from AST scan)
  if (Array.isArray(unresolvedDependencies)) {
    for (const dep of unresolvedDependencies) {
      if (dep.resolutionStatus === "unresolved-local") {
        const key = `${dep.sourcePath}->${dep.specifier}`;
        if (!seenBroken.has(key)) {
          seenBroken.add(key);
          brokenImportFindings.push({
            type: "broken_import",
            severity: IMPACT_SEVERITY.CRITICAL,
            deletedFile: dep.targetPath || dep.specifier,
            affectedFile: dep.sourcePath,
            evidence: {
              specifier: dep.specifier,
              location: dep.location,
              rawSource: dep.rawSource,
            },
            explanation: `File "${dep.sourcePath}" imports "${dep.specifier}", but this local module does not exist or cannot be resolved. This will cause an immediate compile error or runtime crash.`,
            recommendation: `Update "${dep.sourcePath}" to fix or remove the import to "${dep.specifier}".`,
          });
        }
      }
    }
  }

  for (const change of changes) {
    const { path: filePath, oldPath, status } = change;

    // Policy 1: DELETED Files (🚨 CRITICAL BROKEN IMPORT CHECK)
    if (status === "deleted") {
      const dependents = graph.getDependents(filePath);

      for (const dep of dependents) {
        const key = `${dep.consumerPath}->${dep.specifier}`;
        if (!seenBroken.has(key)) {
          seenBroken.add(key);
          brokenImportFindings.push({
            type: "broken_import",
            severity: IMPACT_SEVERITY.CRITICAL,
            deletedFile: filePath,
            affectedFile: dep.consumerPath,
            evidence: {
              specifier: dep.specifier,
              location: dep.location,
              rawSource: dep.rawSource,
            },
            explanation: `File "${filePath}" was DELETED, but is still imported by "${dep.consumerPath}". This will cause an immediate compile error or runtime crash.`,
            recommendation: `Update "${dep.consumerPath}" to remove or replace the import to "${filePath}".`,
          });
        }
      }
    }

    // Policy 2: RENAMED Files (⚠️ STALE PATH CHECK)
    else if (status === "renamed" && oldPath) {
      const dependentsOnOldPath = graph.getDependents(oldPath);

      for (const dep of dependentsOnOldPath) {
        staleRenameFindings.push({
          type: "stale_import_path",
          severity: IMPACT_SEVERITY.HIGH,
          oldPath,
          newPath: filePath,
          affectedFile: dep.consumerPath,
          evidence: {
            specifier: dep.specifier,
            location: dep.location,
            rawSource: dep.rawSource,
          },
          explanation: `File was moved from "${oldPath}" to "${filePath}", but "${dep.consumerPath}" still references the old path.`,
          recommendation: `Update import specifier in "${dep.consumerPath}" from "${dep.specifier}" to point to the new location.`,
        });
      }

      // Also analyze downstream impacts of the renamed file at its new location
      modifiedFileChanges.push(filePath);
    }

    // Policy 3: ADDED Files (ℹ️ OUTGOING DEPENDENCY CHECK)
    else if (status === "added") {
      const outgoing = graph.getDependencies(filePath);

      addedFileFindings.push({
        type: "new_file_dependencies",
        severity: IMPACT_SEVERITY.INFO,
        addedFile: filePath,
        internalDependenciesCount: outgoing.length,
        dependencies: outgoing.map((d) => ({
          target: d.target,
          specifier: d.specifier,
          location: d.location,
        })),
        explanation: `New file "${filePath}" introduced. It relies on ${outgoing.length} internal project dependencies.`,
      });
    }

    // Policy 4: MODIFIED and UNTRACKED Files (BLAST RADIUS BFS)
    else if (status === "modified" || status === "untracked") {
      modifiedFileChanges.push(filePath);
    }
  }

  // Run BFS blast radius on all modified/untracked/renamed files
  const blastRadiusResult = calculateBlastRadius({
    graph,
    changedFiles: modifiedFileChanges,
    maxDepth,
  });

  // Assign severities and actionable recommendations to blast radius findings
  const prioritizedBlastRadiusFindings = blastRadiusResult.findings.map((f) => {
    let severity = IMPACT_SEVERITY.LOW;
    if (f.depth === 1) {
      severity = IMPACT_SEVERITY.HIGH;
    } else if (f.depth === 2) {
      severity = IMPACT_SEVERITY.MEDIUM;
    }

    return {
      ...f,
      severity,
      recommendation:
        f.depth === 1
          ? `Direct consumer of changed file. Inspect integration call sites and run related unit tests.`
          : `Indirectly affected (Depth ${f.depth}). Verify end-to-end data flow and run regression suite.`,
    };
  });

  // Aggregate all findings sorted by severity priority (CRITICAL -> HIGH -> MEDIUM -> LOW -> INFO)
  const severityRank = {
    [IMPACT_SEVERITY.CRITICAL]: 1,
    [IMPACT_SEVERITY.HIGH]: 2,
    [IMPACT_SEVERITY.MEDIUM]: 3,
    [IMPACT_SEVERITY.LOW]: 4,
    [IMPACT_SEVERITY.INFO]: 5,
  };

  const allPrioritizedFindings = [
    ...brokenImportFindings,
    ...staleRenameFindings,
    ...prioritizedBlastRadiusFindings,
    ...addedFileFindings,
  ].sort((a, b) => (severityRank[a.severity] || 99) - (severityRank[b.severity] || 99));

  return {
    summary: {
      totalChanges: changes.length,
      brokenImportsCount: brokenImportFindings.length,
      staleRenamesCount: staleRenameFindings.length,
      impactedFilesCount: blastRadiusResult.summary.totalImpactedFiles,
      directDependentsCount: blastRadiusResult.summary.directDependentsCount,
      transitiveDependentsCount: blastRadiusResult.summary.transitiveDependentsCount,
      criticalAlerts: brokenImportFindings.length > 0,
    },
    brokenImports: brokenImportFindings,
    staleRenames: staleRenameFindings,
    blastRadius: prioritizedBlastRadiusFindings,
    addedFiles: addedFileFindings,
    allFindings: allPrioritizedFindings,
  };
}
