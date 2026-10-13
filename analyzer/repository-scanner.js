import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { analyzeSourceFile } from "./file-analyzer.js";
import { detectLanguage } from "./language-detector.js";
import { ParserManager } from "./parser-manager.js";

const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "vendor",
  ".next",
]);

const DEFAULT_LIMITS = {
  maxFiles: 5_000,
  maxFileBytes: 1_000_000,
  maxTotalSourceBytes: 20_000_000,
};

export class RepositoryLimitError extends Error {
  constructor(message, limit) {
    super(message);
    this.name = "RepositoryLimitError";
    this.limit = limit;
  }
}

async function discoverFiles(directoryPath, rootPath, files, maxFiles) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  entries.sort((left, right) =>
    left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
  );

  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      continue;
    }

    const absolutePath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRECTORIES.has(entry.name.toLowerCase())) {
        await discoverFiles(absolutePath, rootPath, files, maxFiles);
      }
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (files.length >= maxFiles) {
      throw new RepositoryLimitError(
        `Repository exceeds the configured limit of ${maxFiles} files.`,
        "MAX_FILES",
      );
    }

    files.push({
      absolutePath,
      path: path.relative(rootPath, absolutePath).split(path.sep).join("/"),
    });
  }
}

function skippedFile(filePath, language, code, message) {
  return {
    path: filePath,
    language,
    status: "skipped",
    reason: { code, message },
  };
}

export async function scanRepository(
  repositoryPath,
  { maxFiles, maxFileBytes, maxTotalSourceBytes } = {},
) {
  const limits = {
    ...DEFAULT_LIMITS,
    ...(maxFiles === undefined ? {} : { maxFiles }),
    ...(maxFileBytes === undefined ? {} : { maxFileBytes }),
    ...(maxTotalSourceBytes === undefined ? {} : { maxTotalSourceBytes }),
  };

  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new RangeError(`${name} must be a positive safe integer.`);
    }
  }

  const rootPath = path.resolve(repositoryPath);
  const rootStat = await stat(rootPath);
  if (!rootStat.isDirectory()) {
    throw new TypeError("Repository path must point to a directory.");
  }

  const discovered = [];
  await discoverFiles(rootPath, rootPath, discovered, limits.maxFiles);
  const parserManager = new ParserManager({
    maxSourceBytes: limits.maxFileBytes,
  });

  const files = [];
  let supportedFiles = 0;
  let unsupportedFiles = 0;
  let parsedFiles = 0;
  let parseErrors = 0;
  let failedFiles = 0;
  let skippedFiles = 0;
  let totalSourceBytes = 0;
  let sourceLimitReached = false;

  for (const entry of discovered) {
    const detection = detectLanguage(entry.path);
    if (!detection.supported) {
      unsupportedFiles += 1;
      files.push({
        path: entry.path,
        language: detection.language,
        status: "unsupported",
        reason: detection.reason,
      });
      continue;
    }

    supportedFiles += 1;
    if (sourceLimitReached) {
      skippedFiles += 1;
      files.push(
        skippedFile(
          entry.path,
          detection.language,
          "MAX_TOTAL_SOURCE_BYTES",
          `The repository source limit of ${limits.maxTotalSourceBytes} bytes has been reached.`,
        ),
      );
      continue;
    }

    let fileStat;
    try {
      fileStat = await stat(entry.absolutePath);
    } catch (error) {
      failedFiles += 1;
      files.push({
        path: entry.path,
        language: detection.language,
        status: "failed",
        error: {
          code: "FILE_STAT_ERROR",
          message: error instanceof Error ? error.message : String(error),
        },
      });
      continue;
    }

    if (fileStat.size > limits.maxFileBytes) {
      skippedFiles += 1;
      files.push(
        skippedFile(
          entry.path,
          detection.language,
          "MAX_FILE_BYTES",
          `The file exceeds the configured limit of ${limits.maxFileBytes} bytes.`,
        ),
      );
      continue;
    }

    if (totalSourceBytes + fileStat.size > limits.maxTotalSourceBytes) {
      sourceLimitReached = true;
      skippedFiles += 1;
      files.push(
        skippedFile(
          entry.path,
          detection.language,
          "MAX_TOTAL_SOURCE_BYTES",
          `Parsing this file would exceed the repository source limit of ${limits.maxTotalSourceBytes} bytes.`,
        ),
      );
      continue;
    }

    let source;
    try {
      source = await readFile(entry.absolutePath, "utf8");
    } catch (error) {
      failedFiles += 1;
      files.push({
        path: entry.path,
        language: detection.language,
        status: "failed",
        error: {
          code: "FILE_READ_ERROR",
          message: error instanceof Error ? error.message : String(error),
        },
      });
      continue;
    }

    totalSourceBytes += fileStat.size;
    const result = analyzeSourceFile(entry.path, source, parserManager);
    files.push(result);
    if (result.status === "parsed" || result.status === "parsed_with_errors") {
      parsedFiles += 1;
      if (result.status === "parsed_with_errors") {
        parseErrors += 1;
      }
    } else if (result.status === "failed") {
      failedFiles += 1;
    } else if (result.status === "skipped") {
      skippedFiles += 1;
    }
  }

  return {
    status: skippedFiles > 0 ? "partial" : "completed",
    coverage: {
      discoveredFiles: discovered.length,
      supportedFiles,
      parsedFiles,
      parseErrors,
      unsupportedFiles,
      failedFiles,
      skippedFiles,
      sourceBytesProcessed: totalSourceBytes,
    },
    limitations: [
      ...new Map(
        files
          .filter((file) => file.status === "skipped")
          .map((file) => [file.reason.code, file.reason]),
      ).values(),
    ],
    files,
  };
}
