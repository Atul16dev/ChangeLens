import path from "node:path";

const SUPPORTED_EXTENSIONS = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".css",
  ".json",
  ".py",
  ".go",
];

const PYTHON_STDLIB = new Set([
  "os",
  "sys",
  "json",
  "math",
  "typing",
  "re",
  "pathlib",
  "datetime",
  "collections",
  "asyncio",
  "logging",
  "unittest",
  "http",
  "urllib",
  "hashlib",
  "time",
  "random",
  "itertools",
  "functools",
  "io",
  "subprocess",
  "threading",
  "multiprocessing",
  "copy",
  "socket",
  "struct",
  "shutil",
  "sqlite3",
  "pickle",
  "glob",
  "tempfile",
  "traceback",
  "abc",
  "contextlib",
]);

const GO_STDLIB = new Set([
  "fmt",
  "os",
  "io",
  "time",
  "strings",
  "errors",
  "net",
  "net/http",
  "sync",
  "context",
  "encoding/json",
  "testing",
  "bytes",
  "path",
  "path/filepath",
  "log",
  "math",
  "sort",
  "strconv",
  "bufio",
  "crypto",
  "database/sql",
]);

/**
 * Extracts the raw module specifier string from an import/require statement.
 * 
 * Handles:
 * - import ... from "specifier" (JS/TS)
 * - from module import ... (Python)
 * - import module (Python)
 * - "specifier" (Go)
 * - import "specifier" (JS side-effect)
 * - require("specifier") (CJS)
 * - import("specifier") (Dynamic)
 */
export function extractSpecifier(rawSource) {
  if (!rawSource || typeof rawSource !== "string") {
    return null;
  }

  const trimmed = rawSource.trim();

  // 1. Static ES import with 'from': import X from './mod'
  const fromMatch = trimmed.match(/from\s+["']([^"']+)["']/);
  if (fromMatch) {
    return fromMatch[1];
  }

  // 2. Python from ... import ... (e.g. from models.user import User or from .user import User)
  const pyFromMatch = trimmed.match(/^from\s+([.\w]+)\s+import/);
  if (pyFromMatch) {
    return pyFromMatch[1];
  }

  // 3. Side-effect import: import './styles.css'
  const importMatch = trimmed.match(/^import\s+["']([^"']+)["']/);
  if (importMatch) {
    return importMatch[1];
  }

  // 4. Python import ... (e.g. import services.auth as auth or import os)
  const pyImportMatch = trimmed.match(/^import\s+([.\w]+)/);
  if (pyImportMatch) {
    return pyImportMatch[1];
  }

  // 5. CommonJS require: const x = require('./mod')
  const requireMatch = trimmed.match(/require\s*\(\s*["']([^"']+)["']\s*\)/);
  if (requireMatch) {
    return requireMatch[1];
  }

  // 6. Dynamic import: await import('./mod')
  const dynamicMatch = trimmed.match(/import\s*\(\s*["']([^"']+)["']\s*\)/);
  if (dynamicMatch) {
    return dynamicMatch[1];
  }

  // 7. Go quoted string literal: "fmt" or "example.com/models"
  const quoteOnly = trimmed.match(/^["']([^"']+)["']$/);
  if (quoteOnly) {
    return quoteOnly[1];
  }

  // 8. If already just a clean specifier (e.g. "express" or "./user.js")
  if (/^[@a-zA-Z0-9._/-]+$/.test(trimmed) && !trimmed.includes(" ")) {
    return trimmed;
  }

  return null;
}

/**
 * Resolves an import specifier to an internal repository file or marks it external / unresolved.
 * Supports JavaScript, TypeScript, Python, and Go imports.
 * 
 * @param {object} params
 * @param {string} params.importingFilePath - Normalized repo-relative path of the file containing the import
 * @param {string} params.specifier - The raw import specifier
 * @param {Set<string>} params.knownFilesSet - Set of all known normalized file paths in the repository
 */
export function resolveModuleSpecifier({
  importingFilePath,
  specifier,
  knownFilesSet,
}) {
  if (!specifier) {
    return {
      specifier: null,
      resolutionStatus: "unresolved-local",
      targetPath: null,
      isExternal: false,
    };
  }

  const cleanSpec = specifier.trim();

  // 1. External standard library / domain check
  const firstSegment = cleanSpec.split(/[./\\]/)[0];
  if (
    PYTHON_STDLIB.has(firstSegment) ||
    GO_STDLIB.has(firstSegment) ||
    cleanSpec.includes(".com/") ||
    cleanSpec.includes(".org/")
  ) {
    return {
      specifier: cleanSpec,
      resolutionStatus: "external",
      targetPath: null,
      isExternal: true,
    };
  }

  const normalizedImportingPath = importingFilePath.split(path.sep).join("/");
  const importingDir = path.posix.dirname(normalizedImportingPath);

  // 2. Compute candidate paths
  let candidates = [];

  if (cleanSpec.startsWith(".")) {
    // Check for Python leading dots (e.g. .models, ..utils)
    const dotMatch = cleanSpec.match(/^(\.+)(.*)$/);
    if (dotMatch && !cleanSpec.startsWith("./") && !cleanSpec.startsWith("../")) {
      const numDots = dotMatch[1].length;
      const rest = dotMatch[2].replace(/\./g, "/");
      let baseDir = importingDir;
      for (let i = 1; i < numDots; i++) {
        baseDir = path.posix.dirname(baseDir);
      }
      const candidatePath = path.posix.normalize(path.posix.join(baseDir, rest));
      candidates.push(candidatePath);
    } else {
      let candidate = path.posix.normalize(path.posix.join(importingDir, cleanSpec));
      if (candidate.startsWith("./")) {
        candidate = candidate.slice(2);
      }
      candidates.push(candidate);
    }
  } else if (cleanSpec.startsWith("/")) {
    candidates.push(cleanSpec.slice(1));
  } else {
    // Non-relative import: could be internal Python/Go package (e.g. "models.user")
    const asPath = cleanSpec.replace(/\./g, "/");
    candidates.push(asPath);
    candidates.push(path.posix.normalize(path.posix.join(importingDir, asPath)));

    // Check if any file in knownFilesSet matches subpath
    for (const known of knownFilesSet) {
      if (
        known.endsWith("/" + asPath + ".py") ||
        known.endsWith("/" + asPath + ".go") ||
        known === asPath + ".py" ||
        known === asPath + ".go"
      ) {
        return {
          specifier: cleanSpec,
          resolutionStatus: "resolved",
          targetPath: known,
          isExternal: false,
        };
      }
      if (known.endsWith("/" + asPath + "/__init__.py") || known === asPath + "/__init__.py") {
        return {
          specifier: cleanSpec,
          resolutionStatus: "resolved",
          targetPath: known,
          isExternal: false,
        };
      }
    }
  }

  // 3. Probe candidate paths across extensions and index files
  for (let candidate of candidates) {
    if (candidate.startsWith("./")) {
      candidate = candidate.slice(2);
    }

    // Exact match check
    if (knownFilesSet.has(candidate)) {
      return {
        specifier: cleanSpec,
        resolutionStatus: "resolved",
        targetPath: candidate,
        isExternal: false,
      };
    }

    // Extension probing (.js, .jsx, .ts, .tsx, .py, .go, etc.)
    for (const ext of SUPPORTED_EXTENSIONS) {
      const withExt = `${candidate}${ext}`;
      if (knownFilesSet.has(withExt)) {
        return {
          specifier: cleanSpec,
          resolutionStatus: "resolved",
          targetPath: withExt,
          isExternal: false,
        };
      }
    }

    // Directory index probing (index.js, index.ts, __init__.py)
    for (const ext of SUPPORTED_EXTENSIONS) {
      const withIndex = path.posix.join(candidate, `index${ext}`);
      if (knownFilesSet.has(withIndex)) {
        return {
          specifier: cleanSpec,
          resolutionStatus: "resolved",
          targetPath: withIndex,
          isExternal: false,
        };
      }
    }
    const withPyInit = path.posix.join(candidate, "__init__.py");
    if (knownFilesSet.has(withPyInit)) {
      return {
        specifier: cleanSpec,
        resolutionStatus: "resolved",
        targetPath: withPyInit,
        isExternal: false,
      };
    }

    // Go package directory probing: e.g. candidate is "models", any models/*.go in knownFilesSet?
    for (const known of knownFilesSet) {
      if (
        (known.startsWith(candidate + "/") || known.endsWith("/" + candidate)) &&
        known.endsWith(".go")
      ) {
        return {
          specifier: cleanSpec,
          resolutionStatus: "resolved",
          targetPath: known,
          isExternal: false,
        };
      }
    }
  }

  // If specifier did not start with '.' and was not found in known files, it's external (npm, pip, go mod)
  if (!cleanSpec.startsWith(".") && !cleanSpec.startsWith("/")) {
    return {
      specifier: cleanSpec,
      resolutionStatus: "external",
      targetPath: null,
      isExternal: true,
    };
  }

  // Local path could not be resolved in the repository
  return {
    specifier: cleanSpec,
    resolutionStatus: "unresolved-local",
    targetPath: candidates[0] || cleanSpec,
    isExternal: false,
  };
}

/**
 * Takes the output of scanRepository and resolves all imports across all files.
 * 
 * @param {object} scanReport - The report object returned by scanRepository()
 * @returns {Array<object>} Array of resolved dependency relationships
 */
export function resolveRepositoryDependencies(scanReport) {
  if (!scanReport || !Array.isArray(scanReport.files)) {
    return [];
  }

  // Build a Set of all known file paths in the repository for O(1) lookup
  const knownFilesSet = new Set(
    scanReport.files.map((file) => file.path.split(path.sep).join("/"))
  );

  const resolvedDependencies = [];

  for (const file of scanReport.files) {
    if (!Array.isArray(file.imports) || file.imports.length === 0) {
      continue;
    }

    const importingPath = file.path.split(path.sep).join("/");

    for (const importItem of file.imports) {
      const specifier = extractSpecifier(importItem.source);

      const resolution = resolveModuleSpecifier({
        importingFilePath: importingPath,
        specifier,
        knownFilesSet,
      });

      resolvedDependencies.push({
        sourcePath: importingPath,
        targetPath: resolution.targetPath,
        specifier: resolution.specifier,
        resolutionStatus: resolution.resolutionStatus,
        isExternal: resolution.isExternal,
        importedNames: importItem.importedNames || [],
        location: importItem.location || null,
        rawSource: importItem.source,
      });
    }
  }

  return resolvedDependencies;
}
