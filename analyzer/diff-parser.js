/**
 * Git Diff and Status Output Parser for ChangeLens
 * 
 * Converts raw Git CLI output (such as `git diff --name-status` and
 * `git status --porcelain`) into structured, normalized change objects.
 */

/**
 * Normalizes a file path to use forward slashes and strips quotes.
 * Git wraps paths in double quotes if they contain spaces.
 * 
 * @param {string} rawPath
 * @returns {string}
 */
export function normalizeGitPath(rawPath) {
  if (!rawPath || typeof rawPath !== "string") {
    return "";
  }

  let cleaned = rawPath.trim();

  // Strip wrapping double quotes added by git for paths with special chars
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }

  // Convert Windows backslashes to standard posix forward slashes
  return cleaned.split("\\").join("/").replace(/^\.\//, "");
}

/**
 * Maps a single-letter Git status code to a human-readable status name.
 * 
 * @param {string} code
 * @returns {string}
 */
export function mapStatusCode(code) {
  const primaryCode = (code || "").charAt(0).toUpperCase();
  switch (primaryCode) {
    case "M":
      return "modified";
    case "A":
      return "added";
    case "D":
      return "deleted";
    case "R":
      return "renamed";
    case "C":
      return "copied";
    case "T":
      return "type_changed";
    case "?":
      return "untracked";
    default:
      return "unknown";
  }
}

/**
 * Parses raw output from `git diff --name-status` or `git diff-tree --name-status`.
 * 
 * Example inputs:
 * M\tserver/models/user.js
 * A\tserver/services/EmailService.js
 * D\tserver/utils/legacy.js
 * R100\tserver/auth.js\tserver/auth/index.js
 * 
 * @param {string} rawDiffOutput - Raw string output from Git command
 * @returns {Array<object>} Array of parsed change objects
 */
export function parseNameStatusDiff(rawDiffOutput) {
  if (!rawDiffOutput || typeof rawDiffOutput !== "string") {
    return [];
  }

  const lines = rawDiffOutput.trim().split(/\r?\n/);
  const changes = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      continue;
    }

    // Git tabs or multiple spaces separate status code and paths
    const parts = trimmedLine.split(/\t+/);

    if (parts.length < 2) {
      continue;
    }

    const rawStatus = parts[0].trim();
    const statusCode = rawStatus.charAt(0).toUpperCase();
    const status = mapStatusCode(statusCode);

    // Renamed or Copied files have 3 parts: [Status, OldPath, NewPath]
    if (statusCode === "R" || statusCode === "C") {
      const oldPath = normalizeGitPath(parts[1]);
      const newPath = normalizeGitPath(parts[2] || parts[1]);
      const similarityMatch = rawStatus.match(/\d+/);
      const similarityScore = similarityMatch ? parseInt(similarityMatch[0], 10) : null;

      changes.push({
        path: newPath,
        oldPath,
        status,
        statusCode,
        similarityScore,
      });
    } else {
      // Normal change: [Status, Path]
      const filePath = normalizeGitPath(parts[1]);

      changes.push({
        path: filePath,
        oldPath: null,
        status,
        statusCode,
        similarityScore: null,
      });
    }
  }

  return changes;
}

/**
 * Parses output from `git status --porcelain`.
 * 
 * Example inputs:
 *  M server/models/user.js
 * M  server/routes/user-routes.js
 * ?? client/src/NewComponent.jsx
 * D  server/old.js
 * R  old.js -> new.js
 * 
 * @param {string} rawPorcelainOutput
 * @returns {Array<object>}
 */
export function parsePorcelainStatus(rawPorcelainOutput) {
  if (!rawPorcelainOutput || typeof rawPorcelainOutput !== "string") {
    return [];
  }

  const lines = rawPorcelainOutput.split(/\r?\n/);
  const changes = [];

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    // Match 1 or 2 status characters followed by whitespace, then the path
    // Handles: "?? a.txt", "M a.txt", " M a.txt", "A  a.txt", "D a.txt", "R old -> new", etc.
    const match = line.match(/^([ MADRCU?!]{1,2})\s+(.+)$/);
    if (!match) {
      continue;
    }

    const rawCode = match[1].trim();
    const rawPathPart = match[2].trim();

    let statusCode = "M";
    if (rawCode.includes("?")) {
      statusCode = "?";
    } else if (rawCode.includes("A")) {
      statusCode = "A";
    } else if (rawCode.includes("D")) {
      statusCode = "D";
    } else if (rawCode.includes("R")) {
      statusCode = "R";
    } else if (rawCode.includes("M")) {
      statusCode = "M";
    }

    const status = mapStatusCode(statusCode);

    // Check for renamed format: "oldPath -> newPath"
    if (statusCode === "R" && rawPathPart.includes(" -> ")) {
      const [oldPart, newPart] = rawPathPart.split(" -> ");
      changes.push({
        path: normalizeGitPath(newPart),
        oldPath: normalizeGitPath(oldPart),
        status,
        statusCode,
        similarityScore: null,
      });
    } else {
      changes.push({
        path: normalizeGitPath(rawPathPart),
        oldPath: null,
        status,
        statusCode,
        similarityScore: null,
      });
    }
  }

  return changes;
}

/**
 * Classifies a collection of parsed changes into actionable categories for impact analysis.
 * 
 * @param {Array<object>} changes - Output from parseNameStatusDiff or parsePorcelainStatus
 * @returns {object} Categorized changes with helper collections
 */
export function classifyChanges(changes = []) {
  const modified = [];
  const added = [];
  const deleted = [];
  const renamed = [];
  const untracked = [];

  const allChangedPaths = [];

  for (const change of changes) {
    allChangedPaths.push(change.path);

    switch (change.status) {
      case "modified":
        modified.push(change);
        break;
      case "added":
        added.push(change);
        break;
      case "deleted":
        deleted.push(change);
        break;
      case "renamed":
        renamed.push(change);
        break;
      case "untracked":
        untracked.push(change);
        break;
      default:
        modified.push(change);
        break;
    }
  }

  return {
    totalChanges: changes.length,
    modified,
    added,
    deleted,
    renamed,
    untracked,
    allChangedPaths,
    // Paths requiring blast radius inspection (modified, deleted, renamed, untracked)
    impactInspectionPaths: [
      ...modified.map((c) => c.path),
      ...deleted.map((c) => c.path),
      ...renamed.map((c) => c.path),
      ...untracked.map((c) => c.path),
    ],
  };
}
