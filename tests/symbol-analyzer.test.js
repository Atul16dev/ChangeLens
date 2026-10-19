import assert from "node:assert/strict";
import test from "node:test";
import {
  extractFileSymbols,
  buildSymbolTable,
  detectBrokenSymbolReferences,
  detectSymbolsFromLineRanges,
  calculateSymbolBlastRadius,
} from "../analyzer/symbol-analyzer.js";
import { buildDependencyGraph } from "../analyzer/dependency-graph.js";
import { classifyImpactPolicies, IMPACT_SEVERITY } from "../analyzer/change-classifier.js";
import { formatPRMarkdownComment, calculateRiskLevel } from "../analyzer/ai-explainer.js";

test("Symbol Analyzer: extractFileSymbols extracts exports, declarations, and imports", () => {
  const sampleFile = {
    path: "services/user_service.js",
    exports: [
      { name: "getUser", kind: "Named", location: { startLine: 5, endLine: 8 } },
      { name: "default", kind: "Default", location: { startLine: 20, endLine: 25 } },
    ],
    declarations: [
      {
        name: "getUser",
        kind: "Function",
        signature: "function getUser(id)",
        location: { startLine: 5, endLine: 8 },
        children: [],
      },
      {
        name: "UserManager",
        kind: "Class",
        signature: "class UserManager",
        location: { startLine: 10, endLine: 18 },
        children: [
          { name: "save", kind: "Method", location: { startLine: 12, endLine: 14 } },
        ],
      },
    ],
    imports: [
      {
        source: "import { dbClient } from '../db.js';",
        moduleSpecifier: "../db.js",
        importedNames: ["dbClient"],
        location: { startLine: 1, endLine: 1 },
      },
    ],
  };

  const symbols = extractFileSymbols(sampleFile);

  assert.equal(symbols.path, "services/user_service.js");
  assert.ok(symbols.exports.has("getUser"));
  assert.ok(symbols.exports.has("default"));
  assert.ok(symbols.declarations.has("getUser"));
  assert.ok(symbols.declarations.has("UserManager"));
  assert.ok(symbols.declarations.has("UserManager.save"));
  assert.ok(symbols.publicSymbols.has("getUser"));
  assert.ok(symbols.publicSymbols.has("UserManager"));
  assert.ok(symbols.importsByTarget.has("../db.js"));
});

test("Symbol Analyzer: buildSymbolTable provides fast repository lookups", () => {
  const files = [
    {
      path: "models/user.js",
      exports: [{ name: "User" }],
      declarations: [{ name: "User", kind: "Class" }],
      imports: [],
    },
    {
      path: "models/order.js",
      exports: [{ name: "Order" }],
      declarations: [{ name: "Order", kind: "Class" }],
      imports: [],
    },
  ];

  const table = buildSymbolTable(files);

  assert.equal(table.hasSymbol("models/user.js", "User"), true);
  assert.equal(table.hasSymbol("models/user.js", "NonExistent"), false);
  assert.equal(table.hasSymbol("models/order.js", "Order"), true);
  assert.deepEqual(table.getPublicSymbols("models/user.js"), ["User"]);
});

test("Symbol Analyzer: detectBrokenSymbolReferences flags missing exports as CRITICAL", () => {
  const files = [
    {
      path: "models/user.js",
      exports: [{ name: "getUser" }, { name: "updateUser" }],
      declarations: [{ name: "getUser" }, { name: "updateUser" }],
      imports: [],
    },
    {
      path: "controllers/user_controller.js",
      exports: [{ name: "handleUser" }],
      declarations: [],
      imports: [
        {
          source: "import { getUser, deleteUser } from '../models/user.js';",
          moduleSpecifier: "../models/user.js",
          importedNames: ["getUser", "deleteUser"],
        },
      ],
    },
  ];

  const symbolTable = buildSymbolTable(files);

  const resolvedDeps = [
    {
      sourcePath: "controllers/user_controller.js",
      targetPath: "models/user.js",
      specifier: "../models/user.js",
      resolutionStatus: "resolved",
      isExternal: false,
      importedNames: ["getUser", "deleteUser"],
      location: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 55 },
      rawSource: "import { getUser, deleteUser } from '../models/user.js';",
    },
  ];

  const brokenSymbols = detectBrokenSymbolReferences({
    resolvedDependencies: resolvedDeps,
    symbolTable,
  });

  assert.equal(brokenSymbols.length, 1);
  assert.equal(brokenSymbols[0].type, "broken_symbol_reference");
  assert.equal(brokenSymbols[0].severity, "CRITICAL");
  assert.equal(brokenSymbols[0].missingSymbol, "deleteUser");
  assert.equal(brokenSymbols[0].targetFile, "models/user.js");
  assert.equal(brokenSymbols[0].affectedFile, "controllers/user_controller.js");
  assert.ok(brokenSymbols[0].recommendation.includes("getUser, updateUser"));
});

test("Symbol Analyzer: detectSymbolsFromLineRanges maps diff line ranges to AST functions", () => {
  const astFile = {
    declarations: [
      { name: "headerComponent", kind: "Function", location: { startLine: 1, endLine: 15 } },
      { name: "footerComponent", kind: "Function", location: { startLine: 20, endLine: 35 } },
    ],
  };

  // Change on lines 25-28 touches footerComponent
  const detected = detectSymbolsFromLineRanges(astFile, [{ startLine: 25, endLine: 28 }]);

  assert.equal(detected.length, 1);
  assert.equal(detected[0].name, "footerComponent");
  assert.equal(detected[0].kind, "Function");

  // Change on line 50 touches neither
  const outside = detectSymbolsFromLineRanges(astFile, [{ startLine: 50, endLine: 52 }]);
  assert.equal(outside.length, 0);
});

test("Symbol Analyzer: calculateSymbolBlastRadius isolates consumers not importing changed symbols", () => {
  // Scenario:
  // models/user.js exports { getUser, deleteUser }
  // controllers/get_controller.js imports { getUser }
  // controllers/delete_controller.js imports { deleteUser }
  // routes/main.js imports get_controller.js
  const files = [
    {
      path: "models/user.js",
      exports: [{ name: "getUser" }, { name: "deleteUser" }],
      declarations: [{ name: "getUser" }, { name: "deleteUser" }],
      imports: [],
    },
    {
      path: "controllers/get_controller.js",
      exports: [{ name: "handleGet" }],
      declarations: [{ name: "handleGet" }],
      imports: [{ source: "import { getUser } from './user';", moduleSpecifier: "./user", importedNames: ["getUser"] }],
    },
    {
      path: "controllers/delete_controller.js",
      exports: [{ name: "handleDelete" }],
      declarations: [{ name: "handleDelete" }],
      imports: [{ source: "import { deleteUser } from './user';", moduleSpecifier: "./user", importedNames: ["deleteUser"] }],
    },
    {
      path: "routes/main.js",
      exports: [],
      declarations: [],
      imports: [{ source: "import { handleGet } from './get_controller';", moduleSpecifier: "./get_controller", importedNames: ["handleGet"] }],
    },
  ];

  const symbolTable = buildSymbolTable(files);

  const resolvedDependencies = [
    {
      sourcePath: "controllers/get_controller.js",
      targetPath: "models/user.js",
      specifier: "./user",
      resolutionStatus: "resolved",
      isExternal: false,
      importedNames: ["getUser"],
    },
    {
      sourcePath: "controllers/delete_controller.js",
      targetPath: "models/user.js",
      specifier: "./user",
      resolutionStatus: "resolved",
      isExternal: false,
      importedNames: ["deleteUser"],
    },
    {
      sourcePath: "routes/main.js",
      targetPath: "controllers/get_controller.js",
      specifier: "./get_controller",
      resolutionStatus: "resolved",
      isExternal: false,
      importedNames: ["handleGet"],
    },
  ];

  const graph = buildDependencyGraph(resolvedDependencies, files.map((f) => f.path));

  // TEST 1: ONLY 'getUser' modified in models/user.js
  const resultGetUser = calculateSymbolBlastRadius({
    graph,
    symbolTable,
    changedFiles: [{ path: "models/user.js", symbols: ["getUser"] }],
  });

  // get_controller.js should be impacted
  const affected = resultGetUser.allFindings.map((f) => f.affectedFile);
  assert.ok(affected.includes("controllers/get_controller.js"), "get_controller.js should be impacted by getUser");
  assert.ok(affected.includes("routes/main.js"), "routes/main.js should be transitively impacted");

  // delete_controller.js should be ISOLATED!
  assert.ok(!affected.includes("controllers/delete_controller.js"), "delete_controller.js should NOT be in impacted findings");
  const isolated = resultGetUser.isolatedFindings.map((f) => f.consumerFile);
  assert.ok(isolated.includes("controllers/delete_controller.js"), "delete_controller.js must be marked isolated");

  // TEST 2: ONLY 'deleteUser' modified in models/user.js
  const resultDeleteUser = calculateSymbolBlastRadius({
    graph,
    symbolTable,
    changedFiles: [{ path: "models/user.js", symbols: ["deleteUser"] }],
  });

  const affectedDelete = resultDeleteUser.allFindings.map((f) => f.affectedFile);
  assert.ok(affectedDelete.includes("controllers/delete_controller.js"));
  assert.ok(!affectedDelete.includes("controllers/get_controller.js"));
  assert.ok(!affectedDelete.includes("routes/main.js"));
});

test("Symbol Analyzer: classifyImpactPolicies integrates broken symbols and symbol blast radius", () => {
  const files = [
    {
      path: "models/user.js",
      exports: [{ name: "getUser" }],
      declarations: [{ name: "getUser" }],
      imports: [],
    },
    {
      path: "controllers/user_controller.js",
      exports: [{ name: "handleUser" }],
      declarations: [{ name: "handleUser" }],
      imports: [
        {
          source: "import { getUser, missingFunc } from '../models/user.js';",
          moduleSpecifier: "../models/user.js",
          importedNames: ["getUser", "missingFunc"],
        },
      ],
    },
  ];

  const symbolTable = buildSymbolTable(files);
  const resolvedDeps = [
    {
      sourcePath: "controllers/user_controller.js",
      targetPath: "models/user.js",
      specifier: "../models/user.js",
      resolutionStatus: "resolved",
      isExternal: false,
      importedNames: ["getUser", "missingFunc"],
    },
  ];

  const graph = buildDependencyGraph(resolvedDeps, files.map((f) => f.path));

  const impact = classifyImpactPolicies({
    changes: [{ path: "models/user.js", status: "modified", statusCode: "M" }],
    graph,
    resolvedDependencies: resolvedDeps,
    symbolTable,
  });

  // Broken symbol detected
  assert.equal(impact.summary.brokenSymbolsCount, 1);
  assert.equal(impact.summary.criticalAlerts, true);
  assert.equal(impact.brokenSymbols.length, 1);
  assert.equal(impact.brokenSymbols[0].missingSymbol, "missingFunc");

  // AI explainer risk rating should be CRITICAL
  const risk = calculateRiskLevel(impact.summary);
  assert.equal(risk, "CRITICAL");

  // Markdown comment should contain CRITICAL broken symbol callout
  const markdown = formatPRMarkdownComment({ impactAnalysis: impact, riskLevel: risk });
  assert.ok(markdown.includes("CRITICAL BROKEN SYMBOL REFERENCES DETECTED"));
  assert.ok(markdown.includes("missingFunc"));
});
