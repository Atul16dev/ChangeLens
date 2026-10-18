import path from "node:path";
import { isGitRepository, getWorkingTreeChanges, getCommitDiff } from "../analyzer/local-git.js";
import { scanRepository } from "../analyzer/repository-scanner.js";
import { resolveRepositoryDependencies } from "../analyzer/dependency-resolver.js";
import { buildDependencyGraph } from "../analyzer/dependency-graph.js";
import { classifyImpactPolicies, IMPACT_SEVERITY } from "../analyzer/change-classifier.js";

async function run() {
  const args = process.argv.slice(2);
  let targetDir = process.cwd();
  let baseRef = null;

  for (const arg of args) {
    if (arg.startsWith("--base=")) {
      baseRef = arg.split("=")[1];
    } else if (!arg.startsWith("--")) {
      targetDir = path.resolve(arg);
    }
  }

  console.log("=================================================");
  console.log("       CHANGELENS: GIT DIFF IMPACT ANALYZER      ");
  console.log("=================================================");
  console.log(`📁 Target Directory: ${targetDir}`);

  const isGit = await isGitRepository(targetDir);
  if (!isGit) {
    console.error(`\n❌ Error: Directory is not a Git repository: ${targetDir}`);
    console.error("   Please run inside a Git repository or specify a valid Git path.");
    process.exit(1);
  }

  let gitChanges;
  if (baseRef) {
    console.log(`🔍 Comparing Git Revision: ${baseRef}..HEAD (PR / Branch Mode)\n`);
    gitChanges = await getCommitDiff({ directoryPath: targetDir, baseRef });
  } else {
    console.log(`🔍 Inspecting Working Tree (Uncommitted / Staged Changes Mode)\n`);
    gitChanges = await getWorkingTreeChanges(targetDir);
  }

  const { changes, classified } = gitChanges;

  if (classified.totalChanges === 0) {
    console.log("✅ Working tree is clean. No Git changes detected to analyze.");
    console.log("=================================================");
    return;
  }

  console.log(`📝 DETECTED GIT CHANGES (${classified.totalChanges} files):`);
  for (const c of classified.modified) {
    console.log(`   🟡 MODIFIED:  ${c.path}`);
  }
  for (const c of classified.added) {
    console.log(`   🟢 ADDED:     ${c.path}`);
  }
  for (const c of classified.deleted) {
    console.log(`   🔴 DELETED:   ${c.path}`);
  }
  for (const c of classified.renamed) {
    console.log(`   🟣 RENAMED:   ${c.oldPath} -> ${c.path}`);
  }
  for (const c of classified.untracked) {
    console.log(`   ⚪ UNTRACKED: ${c.path}`);
  }
  console.log("-------------------------------------------------\n");

  console.log("⚙️  Scanning repository and building dependency graph...");
  const scanReport = await scanRepository(targetDir);
  const dependencies = resolveRepositoryDependencies(scanReport);
  const allFiles = scanReport.files.map((f) => f.path.split(path.sep).join("/"));
  const graph = buildDependencyGraph(dependencies, allFiles);

  // Apply change status impact policies (Deleted, Renamed, Modified, Added)
  const impactAnalysis = classifyImpactPolicies({
    changes,
    graph,
  });

  const { summary, allFindings } = impactAnalysis;

  console.log("\n📊 IMPACT ANALYSIS SUMMARY:");
  console.log(`   - Total Files Changed:               ${summary.totalChanges}`);
  console.log(`   - Broken Imports Detected:           ${summary.brokenImportsCount} ${summary.brokenImportsCount > 0 ? "🚨 (CRITICAL)" : "✅"}`);
  console.log(`   - Stale Renamed Paths:               ${summary.staleRenamesCount}`);
  console.log(`   - Blast Radius Impacted Files:       ${summary.impactedFilesCount}`);
  console.log(`   - Direct Dependents (Depth 1):       ${summary.directDependentsCount}`);
  console.log(`   - Transitive Dependents (Depth 2+):  ${summary.transitiveDependentsCount}`);
  console.log("-------------------------------------------------\n");

  if (allFindings.length === 0) {
    console.log("✅ No downstream components are affected by these changes.");
  } else {
    console.log("🚨 PRIORITIZED IMPACT FINDINGS (ORDERED BY SEVERITY):\n");

    for (const finding of allFindings) {
      let badge = `[${finding.severity}]`;
      if (finding.severity === IMPACT_SEVERITY.CRITICAL) {
        badge = `[🚨 CRITICAL] BROKEN IMPORT`;
      } else if (finding.severity === IMPACT_SEVERITY.HIGH && finding.type === "stale_import_path") {
        badge = `[⚠️ HIGH] STALE IMPORT PATH`;
      } else if (finding.severity === IMPACT_SEVERITY.HIGH) {
        badge = `[🔴 HIGH (Depth 1)] DIRECT IMPACT`;
      } else if (finding.severity === IMPACT_SEVERITY.MEDIUM) {
        badge = `[🟠 MEDIUM (Depth 2)] TRANSITIVE IMPACT`;
      } else if (finding.severity === IMPACT_SEVERITY.LOW) {
        badge = `[🟡 LOW (Depth ${finding.depth})] TRANSITIVE IMPACT`;
      } else if (finding.severity === IMPACT_SEVERITY.INFO) {
        badge = `[ℹ️ INFO] NEW FILE DEPENDENCY`;
      }

      console.log(`${badge} ${finding.affectedFile || finding.addedFile}`);

      if (finding.changedFile) {
        console.log(`   🎯 Origin Change:   ${finding.changedFile}`);
      }
      if (finding.deletedFile) {
        console.log(`   🗑️  Deleted Target:  ${finding.deletedFile}`);
      }
      if (finding.oldPath) {
        console.log(`   🔄 Renamed From:    ${finding.oldPath} -> ${finding.newPath}`);
      }
      if (finding.path) {
        console.log(`   ⛓️  Dependency Path: ${finding.path.join(" -> ")}`);
      }
      if (finding.evidence?.location) {
        console.log(`   📍 Evidence Line:   Line ${finding.evidence.location.startLine}`);
      }
      if (finding.evidence?.rawSource) {
        console.log(`   📝 Code Snippet:    ${finding.evidence.rawSource}`);
      }
      console.log(`   💡 Explanation:     ${finding.explanation}`);
      if (finding.recommendation) {
        console.log(`   🛠️  Action Check:    ${finding.recommendation}`);
      }
      console.log("");
    }
  }

  console.log("=================================================");
}

run().catch((err) => {
  console.error("💥 Fatal error during diff impact analysis:", err);
  process.exit(1);
});
