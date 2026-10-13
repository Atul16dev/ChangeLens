import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { detectLanguage } from "../analyzer/language-detector.js";
import { analyzeSourceFile } from "../analyzer/file-analyzer.js";
import { ParserManager } from "../analyzer/parser-manager.js";
import { scanRepository } from "../analyzer/repository-scanner.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const sampleRepository = path.join(testDirectory, "fixtures", "mern-sample");

test("detects the requested languages when the WASM bundle includes them", () => {
  const cases = new Map([
    [".js", "javascript"],
    [".mjs", "javascript"],
    [".cjs", "javascript"],
    [".jsx", "javascript"],
    [".ts", "typescript"],
    [".mts", "typescript"],
    [".cts", "typescript"],
    [".tsx", "tsx"],
    [".html", "html"],
    [".htm", "html"],
    [".css", "css"],
    [".json", "json"],
    [".yaml", "yaml"],
    [".yml", "yaml"],
    [".py", "python"],
    [".java", "java"],
    [".go", "go"],
    [".cs", "csharp"],
    [".c", "c"],
    [".cpp", "cpp"],
    [".cc", "cpp"],
    [".cxx", "cpp"],
    [".hpp", "cpp"],
    [".hh", "cpp"],
    [".php", "php"],
    [".rb", "ruby"],
    [".rs", "rust"],
    [".sql", "sql"],
    [".sh", "bash"],
  ]);

  for (const [extension, expectedLanguage] of cases) {
    assert.deepEqual(detectLanguage(`sample${extension}`), {
      language: expectedLanguage,
      supported: true,
      reason: null,
    });
  }
});

test("distinguishes known file extensions without a bundled grammar", () => {
  assert.deepEqual(detectLanguage("theme.scss"), {
    language: "scss",
    supported: false,
    reason: "grammar-not-in-bundle",
  });
});

test("reports file types that do not map to a known grammar", () => {
  assert.deepEqual(detectLanguage("notes.unknown"), {
    language: null,
    supported: false,
    reason: "unrecognized-file-type",
  });
});

test("recognizes an extensionless Dockerfile by its file name", () => {
  assert.deepEqual(detectLanguage("Dockerfile"), {
    language: "dockerfile",
    supported: true,
    reason: null,
  });
});

test("parses representative files across the bundled language set", () => {
  const samples = new Map([
    [".js", "export const value = 1;"],
    [".jsx", "export const View = () => <main />;"],
    [".ts", "export interface User { id: string; }"],
    [".tsx", "export const View = () => <main />;"],
    [".html", "<main>Hello</main>"],
    [".css", "main { color: red; }"],
    [".json", "{\"name\":\"sample\"}"],
    [".yaml", "name: sample\n"],
    [".py", "def greet(name):\n    return name\n"],
    [".java", "class User { String name; }"],
    [".go", "package main\nfunc main() {}\n"],
    [".c", "int main(void) { return 0; }"],
    [".cpp", "int main() { return 0; }"],
    [".hh", "class User {};\n"],
    [".cs", "class User { public string Name { get; set; } }"],
    [".php", "<?php function greet($name) { return $name; }"],
    [".rb", "class User\nend\n"],
    [".rs", "pub fn greet() {}\n"],
    [".sql", "SELECT id FROM users;"],
    [".sh", "#!/usr/bin/env bash\necho ready\n"],
  ]);

  for (const [extension, source] of samples) {
    const result = analyzeSourceFile(`sample${extension}`, source);
    assert.equal(result.status, "parsed", `${extension}: ${result.error?.message}`);
  }
});

test("extracts static module specifiers and preserves each raw import statement", () => {
  const source = [
    'import React, { useState as useThing } from "react";',
    'import "./setup.js";',
    'import type { User } from "../types.js";',
  ].join("\n");
  const result = analyzeSourceFile("sample.ts", source);

  assert.equal(result.status, "parsed");
  assert.deepEqual(
    result.imports.map((item) => item.moduleSpecifier),
    ["react", "./setup.js", "../types.js"],
  );
  assert.equal(result.imports[0].source, 'import React, { useState as useThing } from "react";');
});

test("parses a MERN sample and returns normalized JSON results", async () => {
  const report = await scanRepository(sampleRepository);
  const appFile = report.files.find((file) => file.path.endsWith("App.jsx"));
  const serverFile = report.files.find((file) => file.path === "server/index.js");

  assert.equal(report.status, "completed");
  assert.ok(report.coverage.parsedFiles >= 8);
  assert.equal(report.coverage.unsupportedFiles, 2);
  assert.equal(appFile.status, "parsed");
  assert.equal(appFile.language, "javascript");
  assert.ok(appFile.imports.some((item) => item.source.includes("react")));
  assert.equal(appFile.exports[0].kind, "Default");
  assert.equal(appFile.declarations[0].name, "App");
  assert.equal(appFile.declarations[0].location.startLine, 4);
  assert.equal(serverFile.status, "parsed");
  assert.ok(serverFile.imports.some((item) => item.source.includes("express")));
  assert.equal(
    report.files.find((file) => file.path === "client/src/theme.scss").reason,
    "grammar-not-in-bundle",
  );
  assert.equal(
    report.files.find((file) => file.path === "Makefile").status,
    "unsupported",
  );
});

test("continues scanning when files are unsupported or contain syntax errors", async () => {
  const temporaryRepository = await mkdtemp(
    path.join(os.tmpdir(), "changelens-parser-"),
  );

  try {
    await mkdir(path.join(temporaryRepository, "src"));
    await writeFile(
      path.join(temporaryRepository, "src", "broken.js"),
      "export function {",
    );
    await writeFile(
      path.join(temporaryRepository, "src", "other.unknown"),
      "not source",
    );
    await writeFile(
      path.join(temporaryRepository, "src", "valid.js"),
      "export const value = 1;",
    );

    const report = await scanRepository(temporaryRepository);
    const malformed = report.files.find((file) => file.path.endsWith("broken.js"));
    const unsupported = report.files.find((file) =>
      file.path.endsWith("other.unknown"),
    );
    const valid = report.files.find((file) => file.path.endsWith("valid.js"));

    assert.ok(["parsed_with_errors", "failed"].includes(malformed.status));
    assert.equal(unsupported.status, "unsupported");
    assert.equal(valid.status, "parsed");
    assert.equal(report.coverage.discoveredFiles, 3);
  } finally {
    await rm(temporaryRepository, { recursive: true, force: true });
  }
});

test("reports a per-file size limit instead of parsing oversized content", async () => {
  const report = await scanRepository(sampleRepository, { maxFileBytes: 1 });
  assert.equal(report.status, "partial");
  assert.equal(report.coverage.skippedFiles, report.coverage.supportedFiles);
  assert.ok(report.files.some((file) => file.reason?.code === "MAX_FILE_BYTES"));
});

test("marks aggregate source-byte limits as incomplete", async () => {
  const report = await scanRepository(sampleRepository, {
    maxTotalSourceBytes: 1,
  });

  assert.equal(report.status, "partial");
  assert.ok(
    report.limitations.some(
      (limitation) => limitation.code === "MAX_TOTAL_SOURCE_BYTES",
    ),
  );
  assert.ok(report.coverage.skippedFiles > 0);
});

test("warms bundled grammars without requiring downloads", () => {
  const parserManager = new ParserManager();
  assert.doesNotThrow(() => parserManager.warm(["javascript", "python"]));
});

test("rejects unsafe parser limits", () => {
  assert.throws(() => new ParserManager({ maxSourceBytes: 0 }), RangeError);
});
