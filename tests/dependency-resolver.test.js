import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { scanRepository } from "../analyzer/repository-scanner.js";
import {
  extractSpecifier,
  resolveModuleSpecifier,
  resolveRepositoryDependencies,
} from "../analyzer/dependency-resolver.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const sampleRepository = path.join(testDirectory, "fixtures", "mern-sample");

test("extractSpecifier correctly extracts specifiers from various import syntax styles", () => {
  assert.equal(
    extractSpecifier('import User from "../models/user.js";'),
    "../models/user.js",
  );
  assert.equal(
    extractSpecifier('import { listUsers } from "../controllers/user-controller.js";'),
    "../controllers/user-controller.js",
  );
  assert.equal(extractSpecifier('import express from "express";'), "express");
  assert.equal(extractSpecifier('import "./styles.css";'), "./styles.css");
  assert.equal(
    extractSpecifier('const logger = require("./utils/logger");'),
    "./utils/logger",
  );
  assert.equal(
    extractSpecifier('const runtime = await import("./config/runtime");'),
    "./config/runtime",
  );
});

test("resolveModuleSpecifier identifies external npm packages", () => {
  const knownFilesSet = new Set(["server/index.js"]);

  const expressResult = resolveModuleSpecifier({
    importingFilePath: "server/index.js",
    specifier: "express",
    knownFilesSet,
  });

  assert.equal(expressResult.resolutionStatus, "external");
  assert.equal(expressResult.isExternal, true);
  assert.equal(expressResult.targetPath, null);

  const scopedResult = resolveModuleSpecifier({
    importingFilePath: "server/index.js",
    specifier: "@xberg-io/tree-sitter-wasm",
    knownFilesSet,
  });

  assert.equal(scopedResult.resolutionStatus, "external");
  assert.equal(scopedResult.isExternal, true);
});

test("resolveModuleSpecifier resolves exact relative paths", () => {
  const knownFilesSet = new Set([
    "server/controllers/user-controller.js",
    "server/models/user.js",
  ]);

  const result = resolveModuleSpecifier({
    importingFilePath: "server/controllers/user-controller.js",
    specifier: "../models/user.js",
    knownFilesSet,
  });

  assert.equal(result.resolutionStatus, "resolved");
  assert.equal(result.targetPath, "server/models/user.js");
  assert.equal(result.isExternal, false);
});

test("resolveModuleSpecifier resolves relative paths with extension probing", () => {
  const knownFilesSet = new Set([
    "server/controllers/user-controller.js",
    "server/models/user.js",
  ]);

  // Notice specifier does NOT have .js extension:
  const result = resolveModuleSpecifier({
    importingFilePath: "server/controllers/user-controller.js",
    specifier: "../models/user",
    knownFilesSet,
  });

  assert.equal(result.resolutionStatus, "resolved");
  assert.equal(result.targetPath, "server/models/user.js");
});

test("resolveModuleSpecifier resolves directory index file probing", () => {
  const knownFilesSet = new Set([
    "client/src/App.jsx",
    "client/src/components/Button/index.jsx",
  ]);

  const result = resolveModuleSpecifier({
    importingFilePath: "client/src/App.jsx",
    specifier: "./components/Button",
    knownFilesSet,
  });

  assert.equal(result.resolutionStatus, "resolved");
  assert.equal(result.targetPath, "client/src/components/Button/index.jsx");
});

test("resolveModuleSpecifier reports non-existent local files as unresolved-local", () => {
  const knownFilesSet = new Set(["server/controllers/user-controller.js"]);

  const result = resolveModuleSpecifier({
    importingFilePath: "server/controllers/user-controller.js",
    specifier: "../models/non-existent.js",
    knownFilesSet,
  });

  assert.equal(result.resolutionStatus, "unresolved-local");
  assert.equal(result.targetPath, "server/models/non-existent.js");
  assert.equal(result.isExternal, false);
});

test("resolveRepositoryDependencies links all mern-sample imports into exact file dependencies", async () => {
  const scanReport = await scanRepository(sampleRepository);
  const dependencies = resolveRepositoryDependencies(scanReport);

  assert.ok(dependencies.length > 0);

  // 1. server/controllers/user-controller.js -> server/models/user.js
  const controllerToModel = dependencies.find(
    (dep) =>
      dep.sourcePath === "server/controllers/user-controller.js" &&
      dep.targetPath === "server/models/user.js",
  );
  assert.ok(controllerToModel, "Controller should resolve import to user model");
  assert.equal(controllerToModel.resolutionStatus, "resolved");
  assert.equal(controllerToModel.isExternal, false);

  // 2. server/routes/user-routes.js -> server/controllers/user-controller.js
  const routesToController = dependencies.find(
    (dep) =>
      dep.sourcePath === "server/routes/user-routes.js" &&
      dep.targetPath === "server/controllers/user-controller.js",
  );
  assert.ok(routesToController, "Routes should resolve import to controller");
  assert.equal(routesToController.resolutionStatus, "resolved");
  assert.deepEqual(routesToController.importedNames, ["listUsers"]);

  // 3. server/index.js -> server/routes/user-routes.js
  const indexToRoutes = dependencies.find(
    (dep) =>
      dep.sourcePath === "server/index.js" &&
      dep.targetPath === "server/routes/user-routes.js",
  );
  assert.ok(indexToRoutes, "server/index.js should resolve import to routes");
  assert.equal(indexToRoutes.resolutionStatus, "resolved");

  // 4. client/src/App.jsx -> client/src/styles.css
  const appToStyles = dependencies.find(
    (dep) =>
      dep.sourcePath === "client/src/App.jsx" &&
      dep.targetPath === "client/src/styles.css",
  );
  assert.ok(appToStyles, "client/src/App.jsx should resolve import to styles.css");
  assert.equal(appToStyles.resolutionStatus, "resolved");

  // 5. External packages (express, mongoose, react)
  const expressImports = dependencies.filter((dep) => dep.specifier === "express");
  assert.ok(expressImports.length >= 2);
  for (const exp of expressImports) {
    assert.equal(exp.resolutionStatus, "external");
    assert.equal(exp.targetPath, null);
    assert.equal(exp.isExternal, true);
  }

  const mongooseImports = dependencies.filter((dep) => dep.specifier === "mongoose");
  assert.ok(mongooseImports.length >= 2);
  for (const m of mongooseImports) {
    assert.equal(m.resolutionStatus, "external");
    assert.equal(m.isExternal, true);
  }
});
