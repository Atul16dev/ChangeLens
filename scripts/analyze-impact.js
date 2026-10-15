import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanRepository } from "../analyzer/repository-scanner.js";
import { resolveRepositoryDependencies } from "../analyzer/dependency-resolver.js";
import { buildDependencyGraph, calculateBlastRadius } from "../analyzer/dependency-graph.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const samplePath = path.resolve(scriptDirectory, "../tests/fixtures/mern-sample");

// Target file to analyze from CLI arguments, or default to server/models/user.js
const targetFile = process.argv[2] || "server/models/user.js";

console.log("=================================================");
console.log("             CHANGELENS IMPACT REPORT            ");
console.log("=================================================");
console.log(`📁 Target Repository: tests/fixtures/mern-sample`);
console.log(`🎯 Simulated Changed File: ${targetFile}\n`);

// 1. Scan Repository
const scanReport = await scanRepository(samplePath);

// 2. Resolve Module Dependencies
const dependencies = resolveRepositoryDependencies(scanReport);

// 3. Build Dependency Graph
const graph = buildDependencyGraph(dependencies);

// 4. Calculate Blast Radius (Reverse BFS)
const blastRadius = calculateBlastRadius({
  graph,
  changedFiles: [targetFile],
});

console.log("📊 BLAST RADIUS SUMMARY:");
console.log(`   - Total Potentially Affected Files: ${blastRadius.summary.totalImpactedFiles}`);
console.log(`   - Direct Dependents (Depth 1):     ${blastRadius.summary.directDependentsCount}`);
console.log(`   - Transitive Dependents (Depth 2+): ${blastRadius.summary.transitiveDependentsCount}`);
console.log("-------------------------------------------------\n");

if (blastRadius.findings.length === 0) {
  console.log("✅ No downstream components are affected by this change.");
} else {
  console.log("🚨 IMPACT FINDINGS (ORDERED BY BLAST RADIUS DEPTH):\n");

  for (const finding of blastRadius.findings) {
    const depthBadge = finding.depth === 1 ? "🔴 DIRECT (Depth 1)" : `🟠 TRANSITIVE (Depth ${finding.depth})`;
    console.log(`[${depthBadge}] ${finding.affectedFile}`);
    console.log(`   ⛓️  Dependency Path: ${finding.path.join(" -> ")}`);
    if (finding.evidence.location) {
      console.log(`   📍 Evidence: Line ${finding.evidence.location.startLine}`);
    }
    if (finding.evidence.rawSource) {
      console.log(`   📝 Code Snippet: ${finding.evidence.rawSource}`);
    }
    console.log(`   💡 Explanation: ${finding.explanation}`);
    console.log("");
  }
}

console.log("=================================================");
