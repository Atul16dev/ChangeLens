import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { analyzeSourceFile } from "../analyzer/file-analyzer.js";
import { scanRepository } from "../analyzer/repository-scanner.js";
import {
  extractSpecifier,
  resolveModuleSpecifier,
  resolveRepositoryDependencies,
} from "../analyzer/dependency-resolver.js";
import {
  buildDependencyGraph,
  calculateBlastRadius,
} from "../analyzer/dependency-graph.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const pythonFixtureDir = path.join(testDirectory, "fixtures", "python-sample");
const goFixtureDir = path.join(testDirectory, "fixtures", "go-sample");

test("Multi-Language Support: Python AST & Import Extraction", () => {
  const source = `
import os
import sys
from models.user import User
from .helpers import format_name

class UserService:
    def get_user(self, user_id):
        return User(id=user_id)
`;

  const result = analyzeSourceFile("services/user_service.py", source);
  assert.equal(result.status, "parsed");
  assert.equal(result.language, "python");

  const specifiers = result.imports.map((item) => item.moduleSpecifier);
  assert.deepEqual(specifiers, ["os", "sys", "models.user", ".helpers"]);

  const classDecl = result.declarations.find((d) => d.name === "UserService");
  assert.ok(classDecl, "Should extract UserService class declaration");
});

test("Multi-Language Support: Go AST & Import Extraction", () => {
  const source = `package main

import (
\t"fmt"
\t"net/http"
\t"./controllers"
\t"../models"
)

type Server struct {
\tPort int
}

func main() {
\tfmt.Println("Server running")
}
`;

  const result = analyzeSourceFile("main.go", source);
  assert.equal(result.status, "parsed");
  assert.equal(result.language, "go");

  const specifiers = result.imports.map((item) => item.moduleSpecifier);
  assert.deepEqual(specifiers, ["fmt", "net/http", "./controllers", "../models"]);

  const mainDecl = result.declarations.find((d) => d.name === "main");
  assert.ok(mainDecl, "Should extract main function declaration");
  assert.equal(mainDecl.kind, "Function");
});

test("Multi-Language Support: Standard Library Classification", () => {
  const knownFiles = new Set(["main.py", "main.go"]);

  // Python standard libraries
  for (const std of ["os", "sys", "json", "asyncio", "datetime", "typing"]) {
    const res = resolveModuleSpecifier({
      importingFilePath: "main.py",
      specifier: std,
      knownFilesSet: knownFiles,
    });
    assert.equal(res.resolutionStatus, "external", `Python ${std} should be external`);
    assert.equal(res.isExternal, true);
  }

  // Go standard libraries
  for (const std of ["fmt", "net/http", "io", "time", "strings", "sync"]) {
    const res = resolveModuleSpecifier({
      importingFilePath: "main.go",
      specifier: std,
      knownFilesSet: knownFiles,
    });
    assert.equal(res.resolutionStatus, "external", `Go ${std} should be external`);
    assert.equal(res.isExternal, true);
  }
});

test("Multi-Language Support: Python Specifier Extraction Edge Cases", () => {
  assert.equal(extractSpecifier("from models.user import User"), "models.user");
  assert.equal(extractSpecifier("from ..utils.logger import log"), "..utils.logger");
  assert.equal(extractSpecifier("import services.auth as auth"), "services.auth");
  assert.equal(extractSpecifier("import os"), "os");
});

test("Multi-Language Support: Go Specifier Extraction Edge Cases", () => {
  assert.equal(extractSpecifier('"fmt"'), "fmt");
  assert.equal(extractSpecifier('"./controllers"'), "./controllers");
  assert.equal(extractSpecifier('"github.com/gin-gonic/gin"'), "github.com/gin-gonic/gin");
});

test("Multi-Language Support: Python Relative Dot Resolution", () => {
  const knownFiles = new Set([
    "app/services/auth.py",
    "app/utils/crypto.py",
    "app/models/user.py",
  ]);

  // Single dot: .crypto from app/utils/hasher.py -> app/utils/crypto.py
  const singleDot = resolveModuleSpecifier({
    importingFilePath: "app/utils/hasher.py",
    specifier: ".crypto",
    knownFilesSet: knownFiles,
  });
  assert.equal(singleDot.resolutionStatus, "resolved");
  assert.equal(singleDot.targetPath, "app/utils/crypto.py");

  // Double dot: ..models.user from app/services/auth.py -> app/models/user.py
  const doubleDot = resolveModuleSpecifier({
    importingFilePath: "app/services/auth.py",
    specifier: "..models.user",
    knownFilesSet: knownFiles,
  });
  assert.equal(doubleDot.resolutionStatus, "resolved");
  assert.equal(doubleDot.targetPath, "app/models/user.py");
});

test("Multi-Language Support: Broken Python/Go Local Import Handling", () => {
  const knownFiles = new Set(["server/main.py", "server/main.go"]);

  const brokenPy = resolveModuleSpecifier({
    importingFilePath: "server/main.py",
    specifier: "./missing_module.py",
    knownFilesSet: knownFiles,
  });
  assert.equal(brokenPy.resolutionStatus, "unresolved-local");
  assert.equal(brokenPy.isExternal, false);

  const brokenGo = resolveModuleSpecifier({
    importingFilePath: "server/main.go",
    specifier: "./missing_pkg",
    knownFilesSet: knownFiles,
  });
  assert.equal(brokenGo.resolutionStatus, "unresolved-local");
  assert.equal(brokenGo.isExternal, false);
});

test("Multi-Language Support: Scan and Blast Radius on Python Fixture", async () => {
  const report = await scanRepository(pythonFixtureDir);
  assert.equal(report.status, "completed");
  assert.equal(report.files.length, 4);

  const resolved = resolveRepositoryDependencies(report);
  const graph = buildDependencyGraph(resolved);

  // Verify graph edges
  assert.ok(graph.nodes.includes("models/user.py"));
  assert.ok(graph.nodes.includes("controllers/user_controller.py"));
  assert.ok(graph.nodes.includes("routes/user_routes.py"));
  assert.ok(graph.nodes.includes("main.py"));

  // Calculate blast radius when models/user.py is modified
  const blast = calculateBlastRadius({
    graph,
    changedFiles: ["models/user.py"],
  });

  assert.equal(blast.summary.totalImpactedFiles, 3);
  assert.equal(blast.summary.directDependentsCount, 1);
  assert.equal(blast.summary.transitiveDependentsCount, 2);

  const direct = blast.findings.filter((f) => f.depth === 1);
  assert.equal(direct.length, 1);
  assert.equal(direct[0].affectedFile, "controllers/user_controller.py");

  const depth2 = blast.findings.filter((f) => f.depth === 2);
  assert.equal(depth2.length, 1);
  assert.equal(depth2[0].affectedFile, "routes/user_routes.py");

  const depth3 = blast.findings.filter((f) => f.depth === 3);
  assert.equal(depth3.length, 1);
  assert.equal(depth3[0].affectedFile, "main.py");
});

test("Multi-Language Support: Scan and Blast Radius on Go Fixture", async () => {
  const report = await scanRepository(goFixtureDir);
  assert.equal(report.status, "completed");
  assert.equal(report.files.length, 3);

  const resolved = resolveRepositoryDependencies(report);
  const graph = buildDependencyGraph(resolved);

  // Verify graph edges
  assert.ok(graph.nodes.includes("models/user.go"));
  assert.ok(graph.nodes.includes("controllers/user_controller.go"));
  assert.ok(graph.nodes.includes("main.go"));

  // Calculate blast radius when models/user.go is modified
  const blast = calculateBlastRadius({
    graph,
    changedFiles: ["models/user.go"],
  });

  assert.equal(blast.summary.totalImpactedFiles, 2);
  assert.equal(blast.summary.directDependentsCount, 1);
  assert.equal(blast.summary.transitiveDependentsCount, 1);

  const direct = blast.findings.filter((f) => f.depth === 1);
  assert.equal(direct.length, 1);
  assert.equal(direct[0].affectedFile, "controllers/user_controller.go");

  const depth2 = blast.findings.filter((f) => f.depth === 2);
  assert.equal(depth2.length, 1);
  assert.equal(depth2[0].affectedFile, "main.go");
});
