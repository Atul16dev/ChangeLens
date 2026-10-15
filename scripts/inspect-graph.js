import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanRepository } from "../analyzer/repository-scanner.js";
import { resolveRepositoryDependencies } from "../analyzer/dependency-resolver.js";
import { buildDependencyGraph } from "../analyzer/dependency-graph.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const samplePath = path.resolve(scriptDirectory, "../tests/fixtures/mern-sample");

console.log("🔍 Scanning and building graph for mern-sample...\n");

const report = await scanRepository(samplePath);
const dependencies = resolveRepositoryDependencies(report);
const allFiles = report.files.map((f) => f.path.split(path.sep).join("/"));

const graph = buildDependencyGraph(dependencies, allFiles);

console.log("=================================================");
console.log("  FORWARD ADJACENCY MAP: graph.getDependencies() ");
console.log("  (Question: 'What does this file import?')      ");
console.log("=================================================\n");

for (const file of graph.nodes) {
  const outgoing = graph.getDependencies(file);

  if (outgoing.length === 0) {
    console.log(`📄 ${file} -> (No internal dependencies)`);
  } else {
    console.log(`📄 ${file} imports:`);
    for (const dep of outgoing) {
      console.log(`   └── 🎯 ${dep.target} (via "${dep.specifier}")`);
      if (dep.importedNames && dep.importedNames.length > 0) {
        console.log(`       imported: [${dep.importedNames.join(", ")}]`);
      }
      if (dep.location) {
        console.log(`       line: ${dep.location.startLine}`);
      }
    }
  }
  console.log("");
}
