/**
 * Symbol-Level Impact & Blast Radius Analyzer for ChangeLens
 * 
 * Provides surgical symbol-level dependency intelligence:
 * 1. Symbol Table Extraction (Functions, Classes, Structs, Methods, Exports)
 * 2. Broken Symbol Reference Detection (Detects imported symbols missing from target module)
 * 3. Line-Range to Symbol Mapping (Maps Git diff hunks to affected functions/classes)
 * 4. Symbol-Level Blast Radius (Filters consumers to only those importing the modified symbols)
 */

/**
 * Extracts all public and declared symbols from a parsed file record.
 * 
 * @param {object} file - Parsed file from scanRepository / file-analyzer
 * @returns {object} Normalized symbol metadata for the file
 */
export function extractFileSymbols(file) {
  if (!file) {
    return {
      path: "",
      exports: new Set(),
      declarations: new Map(),
      publicSymbols: new Set(),
      importsByTarget: new Map(),
    };
  }

  const exportNames = new Set();
  const declarations = new Map();
  const publicSymbols = new Set();
  const importsByTarget = new Map();

  // 1. Process Exports
  if (Array.isArray(file.exports)) {
    for (const exp of file.exports) {
      if (exp.name) {
        exportNames.add(exp.name);
        publicSymbols.add(exp.name);
      }
    }
  }

  // 2. Process Declarations (Functions, Classes, Structs, Variables)
  if (Array.isArray(file.declarations)) {
    for (const decl of file.declarations) {
      if (decl.name) {
        declarations.set(decl.name, {
          name: decl.name,
          kind: decl.kind || "Unknown",
          signature: decl.signature || null,
          location: decl.location || null,
          children: decl.children || [],
        });
        publicSymbols.add(decl.name);

        // Also index top-level class/struct methods
        if (Array.isArray(decl.children)) {
          for (const child of decl.children) {
            if (child.name) {
              const qualifiedName = `${decl.name}.${child.name}`;
              declarations.set(qualifiedName, {
                name: qualifiedName,
                kind: child.kind || "Method",
                signature: child.signature || null,
                location: child.location || null,
                parent: decl.name,
              });
              publicSymbols.add(qualifiedName);
            }
          }
        }
      }
    }
  }

  // 3. Process Imports
  if (Array.isArray(file.imports)) {
    for (const imp of file.imports) {
      const target = imp.moduleSpecifier || imp.source;
      if (!importsByTarget.has(target)) {
        importsByTarget.set(target, []);
      }
      importsByTarget.get(target).push({
        importedNames: Array.isArray(imp.importedNames) ? [...imp.importedNames] : [],
        isWildcard: Boolean(imp.isWildcard),
        isDefault: !imp.importedNames || imp.importedNames.length === 0,
        rawSource: imp.source,
        location: imp.location,
      });
    }
  }

  return {
    path: file.path || "",
    exports: exportNames,
    declarations,
    publicSymbols,
    importsByTarget,
  };
}

/**
 * Builds an in-memory Symbol Table for the entire repository.
 * 
 * @param {Array<object>} files - Array of scanned file objects
 * @returns {object} Symbol table with fast symbol lookups
 */
export function buildSymbolTable(files = []) {
  const table = new Map();

  for (const file of files) {
    if (file && file.path) {
      const normalizedPath = file.path.split("\\").join("/").replace(/^\.\//, "");
      table.set(normalizedPath, extractFileSymbols(file));
    }
  }

  return {
    table,

    /**
     * Get symbol info for a given file path.
     */
    get(filePath) {
      const normalized = (filePath || "").split("\\").join("/").replace(/^\.\//, "");
      return table.get(normalized) || null;
    },

    /**
     * Check if a file has or exports a specific symbol name.
     */
    hasSymbol(filePath, symbolName) {
      const info = this.get(filePath);
      if (!info) return false;
      return info.publicSymbols.has(symbolName);
    },

    /**
     * Return all public symbol names for a file.
     */
    getPublicSymbols(filePath) {
      const info = this.get(filePath);
      if (!info) return [];
      return Array.from(info.publicSymbols);
    },

    /**
     * Return declarations map for a file.
     */
    getDeclarations(filePath) {
      const info = this.get(filePath);
      if (!info) return new Map();
      return info.declarations;
    },
  };
}

/**
 * Detects Broken Symbol References across resolved repository dependencies.
 * E.g., Consumer imports { foo } from target, but target does not export or declare foo.
 * 
 * @param {object} params
 * @param {Array<object>} params.resolvedDependencies - Output from resolveRepositoryDependencies()
 * @param {object} params.symbolTable - Symbol table from buildSymbolTable()
 * @returns {Array<object>} Critical broken symbol reference findings
 */
export function detectBrokenSymbolReferences({ resolvedDependencies = [], symbolTable }) {
  if (!symbolTable || typeof symbolTable.get !== "function") {
    return [];
  }

  const brokenSymbolFindings = [];
  const seenKey = new Set();

  for (const dep of resolvedDependencies) {
    // Only check resolved internal repository files (skip external packages)
    if (dep.resolutionStatus !== "resolved" || !dep.targetPath || dep.isExternal) {
      continue;
    }

    const targetInfo = symbolTable.get(dep.targetPath);
    if (!targetInfo) {
      continue;
    }

    // Only inspect files that define at least one declaration or export
    // (Skips non-code files like CSS, JSON, HTML, etc.)
    if (targetInfo.publicSymbols.size === 0) {
      continue;
    }

    const importedNames = dep.importedNames || [];
    for (const sym of importedNames) {
      // Ignore default or wildcard pseudo-names
      if (!sym || sym === "default" || sym === "*") {
        continue;
      }

      // Check if the symbol exists in the target file
      const symbolExists = targetInfo.publicSymbols.has(sym);

      if (!symbolExists) {
        const key = `${dep.sourcePath}->${dep.targetPath}#${sym}`;
        if (!seenKey.has(key)) {
          seenKey.add(key);

          const availableSymbols = Array.from(targetInfo.publicSymbols);
          const suggestion = availableSymbols.length > 0
            ? `Available exports in "${dep.targetPath}": ${availableSymbols.slice(0, 5).join(", ")}${availableSymbols.length > 5 ? "..." : ""}.`
            : `Module "${dep.targetPath}" exports no symbols matching "${sym}".`;

          brokenSymbolFindings.push({
            type: "broken_symbol_reference",
            severity: "CRITICAL",
            targetFile: dep.targetPath,
            affectedFile: dep.sourcePath,
            missingSymbol: sym,
            evidence: {
              specifier: dep.specifier,
              location: dep.location,
              rawSource: dep.rawSource,
            },
            explanation: `File "${dep.sourcePath}" imports symbol "${sym}" from "${dep.targetPath}", but "${sym}" is not exported or defined in "${dep.targetPath}". This will cause an immediate compile error or runtime crash.`,
            recommendation: `Export "${sym}" from "${dep.targetPath}", or update "${dep.sourcePath}" to remove/correct the imported symbol. ${suggestion}`,
          });
        }
      }
    }
  }

  return brokenSymbolFindings;
}

/**
 * Maps Git diff changed line ranges to specific symbols (functions, classes, etc.) in a file.
 * 
 * @param {object} astFile - The parsed file object with declarations
 * @param {Array<{ startLine: number, endLine: number }>} changedLineRanges - Changed line intervals
 * @returns {Array<object>} Symbols modified by the line changes
 */
export function detectSymbolsFromLineRanges(astFile, changedLineRanges = []) {
  if (!astFile || !Array.isArray(changedLineRanges) || changedLineRanges.length === 0) {
    return [];
  }

  const declarations = astFile.declarations || [];
  const modifiedSymbols = [];
  const seenNames = new Set();

  for (const decl of declarations) {
    if (!decl.name || !decl.location) {
      continue;
    }

    const { startLine, endLine } = decl.location;

    for (const range of changedLineRanges) {
      // Check interval intersection: [startLine, endLine] overlaps with [range.startLine, range.endLine]
      const overlaps = startLine <= range.endLine && endLine >= range.startLine;
      if (overlaps && !seenNames.has(decl.name)) {
        seenNames.add(decl.name);
        modifiedSymbols.push({
          name: decl.name,
          kind: decl.kind || "Declaration",
          signature: decl.signature,
          location: decl.location,
        });
      }
    }
  }

  return modifiedSymbols;
}

/**
 * Calculates surgical symbol-level blast radius.
 * Filters downstream consumers to only those importing or referencing the modified symbol(s).
 * 
 * @param {object} params
 * @param {object} params.graph - Dependency graph from dependency-graph.js
 * @param {object} params.symbolTable - Symbol table from buildSymbolTable()
 * @param {Array<{ path: string, symbols?: Array<string> } | string>} params.changedFiles
 * @param {number} [params.maxDepth=10]
 * @returns {object} Symbol-level blast radius report
 */
export function calculateSymbolBlastRadius({
  graph,
  symbolTable,
  changedFiles = [],
  maxDepth = 10,
}) {
  if (!graph || typeof graph.getDependents !== "function") {
    throw new TypeError("A valid dependency graph instance is required.");
  }

  const directFindings = [];
  const transitiveFindings = [];
  const isolatedFindings = [];
  const impactedConsumersSet = new Set();
  const trackedSymbolsMap = new Map();

  for (const entry of changedFiles) {
    const filePath = typeof entry === "string" ? entry : entry.path;
    const specifiedSymbols = typeof entry === "object" && Array.isArray(entry.symbols) ? entry.symbols : null;

    const normalizedPath = filePath.split("\\").join("/").replace(/^\.\//, "");

    // Determine target symbols: either explicitly specified, or all public symbols of the file
    let targetSymbols = specifiedSymbols;
    if (!targetSymbols && symbolTable) {
      const publicSyms = symbolTable.getPublicSymbols(normalizedPath);
      if (publicSyms.length > 0) {
        targetSymbols = publicSyms;
      }
    }
    if (!targetSymbols) {
      targetSymbols = [];
    }

    trackedSymbolsMap.set(normalizedPath, targetSymbols);

    // BFS Queue: { file, currentSymbols, depth, pathHistory }
    const queue = [
      {
        file: normalizedPath,
        symbols: targetSymbols,
        depth: 0,
        pathHistory: [normalizedPath],
      },
    ];

    const visited = new Map();
    visited.set(normalizedPath, 0);

    while (queue.length > 0) {
      const current = queue.shift();
      if (current.depth >= maxDepth) {
        continue;
      }

      const nextDepth = current.depth + 1;
      const consumers = graph.getDependents(current.file);

      for (const consumerEdge of consumers) {
        const consumerPath = consumerEdge.consumerPath;
        const importedNames = consumerEdge.importedNames || [];

        // Check symbol intersection
        let symbolMatch = false;
        let matchedSymbols = [];

        if (current.symbols.length === 0) {
          // If no specific symbols tracked, consider any consumer impacted
          symbolMatch = true;
          matchedSymbols = importedNames.length > 0 ? importedNames : ["*"];
        } else if (importedNames.length === 0) {
          // Default import or wildcard import (e.g. `import User from './user'`)
          symbolMatch = true;
          matchedSymbols = current.symbols;
        } else {
          // Named imports: check intersection between imported names and changed symbols
          matchedSymbols = importedNames.filter((name) => current.symbols.includes(name));
          symbolMatch = matchedSymbols.length > 0;
        }

        const fullPath = [...current.pathHistory, consumerPath];

        if (!symbolMatch) {
          // Consumer imports the file, but DOES NOT import the changed symbol!
          isolatedFindings.push({
            changedFile: normalizedPath,
            consumerFile: consumerPath,
            depth: nextDepth,
            importedNames,
            targetSymbols: current.symbols,
            status: "isolated",
            explanation: `File "${consumerPath}" imports "${consumerEdge.specifier}", but does NOT consume changed symbol(s) [${current.symbols.join(", ")}]. It is SAFE at the symbol level.`,
          });
          continue;
        }

        // Cycle check
        if (visited.has(consumerPath) && visited.get(consumerPath) <= nextDepth) {
          continue;
        }
        visited.set(consumerPath, nextDepth);
        impactedConsumersSet.add(consumerPath);

        const finding = {
          changedFile: normalizedPath,
          affectedFile: consumerPath,
          depth: nextDepth,
          impactType: nextDepth === 1 ? "direct_symbol_dependency" : "transitive_symbol_dependency",
          path: fullPath,
          symbolImpact: {
            isSymbolMatched: true,
            impactedSymbols: matchedSymbols,
            importedNames,
          },
          evidence: {
            specifier: consumerEdge.specifier,
            importedNames,
            location: consumerEdge.location,
            rawSource: consumerEdge.rawSource,
          },
          explanation: `${consumerPath} is impacted because it ${
            nextDepth === 1 ? "directly imports" : "indirectly consumes"
          } symbol(s) [${matchedSymbols.join(", ")}] from ${current.file} (Depth ${nextDepth}).`,
          recommendation: `Inspect integration and call sites of [${matchedSymbols.join(", ")}] in "${consumerPath}".`,
        };

        if (nextDepth === 1) {
          directFindings.push(finding);
        } else {
          transitiveFindings.push(finding);
        }

        // For downstream propagation, track symbols exported by this impacted consumer
        const consumerPublicSymbols = symbolTable ? symbolTable.getPublicSymbols(consumerPath) : [];
        const nextTrackedSymbols = consumerPublicSymbols.length > 0 ? consumerPublicSymbols : matchedSymbols;

        queue.push({
          file: consumerPath,
          symbols: nextTrackedSymbols,
          depth: nextDepth,
          pathHistory: fullPath,
        });
      }
    }
  }

  const allSymbolFindings = [...directFindings, ...transitiveFindings];

  return {
    summary: {
      totalImpactedFiles: impactedConsumersSet.size,
      directDependentsCount: directFindings.length,
      transitiveDependentsCount: transitiveFindings.length,
      isolatedConsumersCount: isolatedFindings.length,
      trackedSymbolsCount: Array.from(trackedSymbolsMap.values()).flat().length,
    },
    directFindings,
    transitiveFindings,
    isolatedFindings,
    allFindings: allSymbolFindings,
  };
}
