/**
 * Dependency Graph Module for ChangeLens
 * 
 * Step 1: Builds in-memory directed dependency graph and reverse adjacency maps
 * from resolved dependency records.
 */

/**
 * Builds a directed dependency graph and reverse adjacency lookup from resolved dependencies.
 * 
 * Direction Convention:
 * - Edge: Source (Consumer) -> Target (Dependency)
 * - Forward Map: File -> Files it imports
 * - Reverse Map: File -> Files that import it (Used for impact analysis)
 * 
 * @param {Array<object>} resolvedDependencies - Output from resolveRepositoryDependencies()
 * @param {Array<string>|Set<string>} [allFiles=[]] - Optional list of all files in repository
 * @returns {object} The dependency graph representation with fast O(1) lookup methods
 */
export function buildDependencyGraph(resolvedDependencies = [], allFiles = []) {
  const nodeSet = new Set(allFiles);

  // Forward map: sourcePath -> Array of dependencies it imports
  const forwardMap = new Map();

  // Reverse map: targetPath -> Array of consumers that import it
  const reverseMap = new Map();

  // Collect only valid internal resolved edges
  const edges = [];

  for (const dep of resolvedDependencies) {
    if (!dep || dep.resolutionStatus !== "resolved" || !dep.targetPath) {
      continue;
    }

    const { sourcePath, targetPath, specifier, importedNames, location, rawSource } = dep;

    nodeSet.add(sourcePath);
    nodeSet.add(targetPath);

    const edge = {
      source: sourcePath,
      target: targetPath,
      specifier,
      importedNames: importedNames || [],
      location: location || null,
      rawSource: rawSource || null,
    };

    edges.push(edge);

    // 1. Populate Forward Adjacency: source -> [targets]
    if (!forwardMap.has(sourcePath)) {
      forwardMap.set(sourcePath, []);
    }
    forwardMap.get(sourcePath).push(edge);

    // 2. Populate Reverse Adjacency: target -> [consumers]
    if (!reverseMap.has(targetPath)) {
      reverseMap.set(targetPath, []);
    }
    reverseMap.get(targetPath).push({
      consumerPath: sourcePath,
      specifier,
      importedNames: importedNames || [],
      location: location || null,
      rawSource: rawSource || null,
    });
  }

  return {
    nodes: Array.from(nodeSet).sort(),
    edges,
    forwardMap,
    reverseMap,

    /**
     * Get outgoing dependencies: What does this file import?
     * @param {string} filePath
     * @returns {Array<object>}
     */
    getDependencies(filePath) {
      return forwardMap.get(filePath) || [];
    },

    /**
     * Get reverse dependents: Who imports this file? (Direct consumers)
     * @param {string} filePath
     * @returns {Array<object>}
     */
    getDependents(filePath) {
      return reverseMap.get(filePath) || [];
    },

    /**
     * Check if a file is registered in the graph
     * @param {string} filePath
     * @returns {boolean}
     */
    hasNode(filePath) {
      return nodeSet.has(filePath);
    },
  };
}

/**
 * Calculates the blast radius (impact analysis) of changed files using reverse BFS.
 * 
 * @param {object} params
 * @param {object} params.graph - The dependency graph built by buildDependencyGraph()
 * @param {Array<string>} params.changedFiles - List of changed file paths
 * @param {number} [params.maxDepth=10] - Maximum traversal depth to prevent runaway scans
 * @returns {object} Structured impact report with direct, transitive findings and summary
 */
export function calculateBlastRadius({
  graph,
  changedFiles = [],
  maxDepth = 10,
}) {
  if (!graph || typeof graph.getDependents !== "function") {
    throw new TypeError("A valid dependency graph instance is required.");
  }

  const findings = [];
  const impactedFilesSet = new Set();
  const directDependents = new Set();
  const transitiveDependents = new Set();

  for (const changedFile of changedFiles) {
    const normalizedChanged = changedFile.split("\\").join("/").replace(/^\.\//, "");

    // Queue entries: { file, depth, pathHistory }
    const queue = [
      {
        file: normalizedChanged,
        depth: 0,
        pathHistory: [normalizedChanged],
      },
    ];

    // Track minimum depth at which each node was visited to handle cycles safely
    const visited = new Map();
    visited.set(normalizedChanged, 0);

    while (queue.length > 0) {
      const current = queue.shift();

      if (current.depth >= maxDepth) {
        continue;
      }

      // Who imports the current file? (Reverse lookup)
      const consumers = graph.getDependents(current.file);

      for (const consumerEdge of consumers) {
        const consumerPath = consumerEdge.consumerPath;
        const nextDepth = current.depth + 1;

        // Cycle check: If visited at a shorter or equal depth, skip
        if (visited.has(consumerPath) && visited.get(consumerPath) <= nextDepth) {
          continue;
        }

        visited.set(consumerPath, nextDepth);
        impactedFilesSet.add(consumerPath);

        const impactType = nextDepth === 1 ? "direct_dependency" : "transitive_dependency";
        if (nextDepth === 1) {
          directDependents.add(consumerPath);
        } else {
          transitiveDependents.add(consumerPath);
        }

        const fullPath = [...current.pathHistory, consumerPath];

        findings.push({
          changedFile: normalizedChanged,
          affectedFile: consumerPath,
          impactType,
          depth: nextDepth,
          path: fullPath,
          evidence: {
            specifier: consumerEdge.specifier,
            importedNames: consumerEdge.importedNames || [],
            location: consumerEdge.location,
            rawSource: consumerEdge.rawSource,
          },
          explanation: `${consumerPath} is affected because it ${
            nextDepth === 1 ? "directly imports" : "indirectly depends on"
          } ${normalizedChanged} (Depth ${nextDepth}).`,
        });

        // Add consumer to queue to traverse next level
        queue.push({
          file: consumerPath,
          depth: nextDepth,
          pathHistory: fullPath,
        });
      }
    }
  }

  return {
    changedFiles,
    summary: {
      totalImpactedFiles: impactedFilesSet.size,
      directDependentsCount: directDependents.size,
      transitiveDependentsCount: transitiveDependents.size,
      totalFindings: findings.length,
    },
    findings,
  };
}

