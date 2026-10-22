import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import {
  parseNameStatusDiff,
  parsePorcelainStatus,
  classifyChanges,
} from "./diff-parser.js";

const execFileAsync = promisify(execFile);

/**
 * Executes a Git command safely using execFile (without shell injection).
 * 
 * @param {Array<string>} args - Git arguments
 * @param {string} cwd - Directory path to execute within
 * @param {object} [options={}] - Additional execFile options (timeout, etc.)
 * @returns {Promise<{ stdout: string, stderr: string }>}
 */
export async function executeGit(args, cwd, options = {}) {
  try {
    const { stdout, stderr } = await execFileAsync("git", args, {
      cwd,
      timeout: options.timeout || 60000, // 60-second timeout safeguard for network & clone operations
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer limit
      windowsHide: true,
      ...options,
    });
    return { stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Git command failed [git ${args.join(" ")}]: ${message}`);
  }
}

/**
 * Checks whether the given directory is inside a valid Git repository.
 * 
 * @param {string} directoryPath
 * @returns {Promise<boolean>}
 */
export async function isGitRepository(directoryPath) {
  try {
    const { stdout } = await executeGit(
      ["rev-parse", "--is-inside-work-tree"],
      directoryPath,
    );
    return stdout === "true";
  } catch {
    return false;
  }
}

/**
 * Gets the root directory of the Git repository.
 * 
 * @param {string} directoryPath
 * @returns {Promise<string>}
 */
export async function getGitRoot(directoryPath) {
  const { stdout } = await executeGit(
    ["rev-parse", "--show-toplevel"],
    directoryPath,
  );
  return path.resolve(stdout);
}

/**
 * Detects working tree changes (uncommitted staged, unstaged, and untracked files).
 * 
 * @param {string} directoryPath
 * @returns {Promise<object>} Parsed and classified changes
 */
export async function getWorkingTreeChanges(directoryPath) {
  const isGit = await isGitRepository(directoryPath);
  if (!isGit) {
    return {
      isGit: false,
      changes: [],
      classified: classifyChanges([]),
    };
  }

  // porcelain gives a complete view of untracked, staged, and unstaged changes
  const { stdout } = await executeGit(["status", "--porcelain"], directoryPath);
  const changes = parsePorcelainStatus(stdout);
  const classified = classifyChanges(changes);

  return {
    isGit: true,
    changes,
    classified,
  };
}

/**
 * Compares two Git references (e.g. PR target branch vs feature branch, or baseSha..headSha).
 * 
 * @param {object} params
 * @param {string} params.directoryPath
 * @param {string} params.baseRef - Base commit or target branch (e.g. "main" or "HEAD~1")
 * @param {string} [params.headRef="HEAD"] - Head commit or feature branch
 * @returns {Promise<object>} Parsed and classified changes
 */
export async function getCommitDiff({ directoryPath, baseRef, headRef = "HEAD" }) {
  const isGit = await isGitRepository(directoryPath);
  if (!isGit) {
    throw new Error(`Directory is not a Git repository: ${directoryPath}`);
  }

  if (!baseRef || typeof baseRef !== "string") {
    throw new TypeError("baseRef is required to calculate a commit diff.");
  }

  const range = `${baseRef}..${headRef}`;
  const { stdout } = await executeGit(["diff", "--name-status", range], directoryPath);
  const changes = parseNameStatusDiff(stdout);
  const classified = classifyChanges(changes);

  return {
    isGit: true,
    range,
    baseRef,
    headRef,
    changes,
    classified,
  };
}
