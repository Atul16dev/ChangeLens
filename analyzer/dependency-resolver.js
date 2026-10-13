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
];

/**
 * Extracts the raw module specifier string from an import/require statement.
 * 
 * Handles:
 * - import ... from "specifier"
 * - import "specifier"
 * - require("specifier")
 * - import("specifier")
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

  // 2. Side-effect import: import './styles.css'
  const importMatch = trimmed.match(/^import\s+["']([^"']+)["']/);
  if (importMatch) {
    return importMatch[1];
  }

  // 3. CommonJS require: const x = require('./mod')
  const requireMatch = trimmed.match(/require\s*\(\s*["']([^"']+)["']\s*\)/);
  if (requireMatch) {
    return requireMatch[1];
  }

  // 4. Dynamic import: await import('./mod')
  const dynamicMatch = trimmed.match(/import\s*\(\s*["']([^"']+)["']\s*\)/);
  if (dynamicMatch) {
    return dynamicMatch[1];
  }

  // 5. If already just a clean specifier (e.g. "express" or "./user.js")
  if (/^[@a-zA-Z0-9._/-]+$/.test(trimmed) && !trimmed.includes(" ")) {
    return trimmed;
  }

  return null;
}

/**
 * Resolves an import specifier to an internal repository file or marks it external / unresolved.
 * 
 * @param {object} params
 * @param {string} params.importingFilePath - Normalized repo-relative path of the file containing the import (e.g. "server/controllers/user-controller.js")
 * @param {string} params.specifier - The raw import specifier (e.g. "../models/user.js" or "express")
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

  // 1. External npm package check (e.g. "express", "react", "@xberg-io/...")
  if (!specifier.startsWith(".") && !specifier.startsWith("/")) {
    return {
      specifier,
      resolutionStatus: "external",
      targetPath: null,
      isExternal: true,
    };
  }

  // Normalize path using forward slashes (posix style)
  const normalizedImportingPath = importingFilePath.split(path.sep).join("/");
  const importingDir = path.posix.dirname(normalizedImportingPath);

  let candidate = path.posix.normalize(path.posix.join(importingDir, specifier));

  // Strip leading "./" if present
  if (candidate.startsWith("./")) {
    candidate = candidate.slice(2);
  }

  // 2. Exact match check (e.g. "../models/user.js" -> "server/models/user.js")
  if (knownFilesSet.has(candidate)) {
    return {
      specifier,
      resolutionStatus: "resolved",
      targetPath: candidate,
      isExternal: false,
    };
  }

  // 3. Extension probing check (e.g. "../models/user" -> "server/models/user.js")
  for (const ext of SUPPORTED_EXTENSIONS) {
    const withExt = `${candidate}${ext}`;
    if (knownFilesSet.has(withExt)) {
      return {
        specifier,
        resolutionStatus: "resolved",
        targetPath: withExt,
        isExternal: false,
      };
    }
  }

  // 4. Directory index probing check (e.g. "./routes" -> "server/routes/index.js")
  for (const ext of SUPPORTED_EXTENSIONS) {
    const withIndex = path.posix.join(candidate, `index${ext}`);
    if (knownFilesSet.has(withIndex)) {
      return {
        specifier,
        resolutionStatus: "resolved",
        targetPath: withIndex,
        isExternal: false,
      };
    }
  }

  // 5. Local path could not be resolved in the repository
  return {
    specifier,
    resolutionStatus: "unresolved-local",
    targetPath: candidate,
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
