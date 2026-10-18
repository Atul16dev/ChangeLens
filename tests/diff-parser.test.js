import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeGitPath,
  mapStatusCode,
  parseNameStatusDiff,
  parsePorcelainStatus,
  classifyChanges,
} from "../analyzer/diff-parser.js";

test("normalizeGitPath normalizes backslashes, quotes, and relative prefixes", () => {
  assert.equal(normalizeGitPath("server\\models\\user.js"), "server/models/user.js");
  assert.equal(
    normalizeGitPath('"server/my files/user.js"'),
    "server/my files/user.js",
  );
  assert.equal(normalizeGitPath("./client/src/App.jsx"), "client/src/App.jsx");
  assert.equal(normalizeGitPath(null), "");
});

test("mapStatusCode maps single-letter git flags to full status strings", () => {
  assert.equal(mapStatusCode("M"), "modified");
  assert.equal(mapStatusCode("A"), "added");
  assert.equal(mapStatusCode("D"), "deleted");
  assert.equal(mapStatusCode("R"), "renamed");
  assert.equal(mapStatusCode("?"), "untracked");
  assert.equal(mapStatusCode("X"), "unknown");
});

test("parseNameStatusDiff parses standard git diff --name-status output", () => {
  const rawDiff = `
M\tserver/models/user.js
A\tserver/services/EmailService.js
D\tserver/utils/legacy.js
R100\tserver/auth.js\tserver/auth/index.js
R092\tclient/Button.jsx\tclient/components/Button.jsx
  `;

  const parsed = parseNameStatusDiff(rawDiff);

  assert.equal(parsed.length, 5);

  // 1. Modified
  assert.equal(parsed[0].path, "server/models/user.js");
  assert.equal(parsed[0].status, "modified");
  assert.equal(parsed[0].statusCode, "M");
  assert.equal(parsed[0].oldPath, null);

  // 2. Added
  assert.equal(parsed[1].path, "server/services/EmailService.js");
  assert.equal(parsed[1].status, "added");
  assert.equal(parsed[1].statusCode, "A");

  // 3. Deleted
  assert.equal(parsed[2].path, "server/utils/legacy.js");
  assert.equal(parsed[2].status, "deleted");
  assert.equal(parsed[2].statusCode, "D");

  // 4. Renamed (100% similarity)
  assert.equal(parsed[3].path, "server/auth/index.js");
  assert.equal(parsed[3].oldPath, "server/auth.js");
  assert.equal(parsed[3].status, "renamed");
  assert.equal(parsed[3].statusCode, "R");
  assert.equal(parsed[3].similarityScore, 100);

  // 5. Renamed (92% similarity)
  assert.equal(parsed[4].path, "client/components/Button.jsx");
  assert.equal(parsed[4].oldPath, "client/Button.jsx");
  assert.equal(parsed[4].status, "renamed");
  assert.equal(parsed[4].similarityScore, 92);
});

test("parseNameStatusDiff handles empty or invalid inputs gracefully", () => {
  assert.deepEqual(parseNameStatusDiff(""), []);
  assert.deepEqual(parseNameStatusDiff("   \n   "), []);
  assert.deepEqual(parseNameStatusDiff(null), []);
});

test("parsePorcelainStatus parses git status --porcelain output", () => {
  const rawPorcelain = [
    " M server/models/user.js",
    "M  server/routes/user-routes.js",
    "?? client/src/NewComponent.jsx",
    " D server/utils/deleted-file.js",
    "R  client/old.js -> client/new.js",
  ].join("\n");

  const parsed = parsePorcelainStatus(rawPorcelain);

  assert.equal(parsed.length, 5);

  assert.equal(parsed[0].path, "server/models/user.js");
  assert.equal(parsed[0].status, "modified");

  assert.equal(parsed[1].path, "server/routes/user-routes.js");
  assert.equal(parsed[1].status, "modified");

  assert.equal(parsed[2].path, "client/src/NewComponent.jsx");
  assert.equal(parsed[2].status, "untracked");

  assert.equal(parsed[3].path, "server/utils/deleted-file.js");
  assert.equal(parsed[3].status, "deleted");

  assert.equal(parsed[4].path, "client/new.js");
  assert.equal(parsed[4].oldPath, "client/old.js");
  assert.equal(parsed[4].status, "renamed");
});

test("classifyChanges groups changes by status and generates inspection paths", () => {
  const changes = [
    { path: "server/models/user.js", status: "modified" },
    { path: "server/services/EmailService.js", status: "added" },
    { path: "server/utils/legacy.js", status: "deleted" },
    { path: "client/new.js", oldPath: "client/old.js", status: "renamed" },
  ];

  const classified = classifyChanges(changes);

  assert.equal(classified.totalChanges, 4);
  assert.equal(classified.modified.length, 1);
  assert.equal(classified.added.length, 1);
  assert.equal(classified.deleted.length, 1);
  assert.equal(classified.renamed.length, 1);

  // Deleted and Renamed files are included in impact inspection paths:
  assert.deepEqual(classified.impactInspectionPaths, [
    "server/models/user.js",
    "server/utils/legacy.js",
    "client/new.js",
  ]);
});
