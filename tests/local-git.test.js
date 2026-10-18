import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import os from "node:os";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import {
  isGitRepository,
  getWorkingTreeChanges,
  getCommitDiff,
  executeGit,
} from "../analyzer/local-git.js";

test("isGitRepository returns false for a non-git directory", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "changelens-nongit-"));
  try {
    const isGit = await isGitRepository(tempDir);
    assert.equal(isGit, false);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("local-git detects untracked, modified, and commit diffs in a temporary repository", async () => {
  const tempGitDir = await mkdtemp(path.join(os.tmpdir(), "changelens-git-"));

  try {
    // 1. Initialize git repo and set local identity for commits
    await executeGit(["init"], tempGitDir);
    await executeGit(["config", "user.name", "ChangeLens Test"], tempGitDir);
    await executeGit(["config", "user.email", "test@changelens.local"], tempGitDir);

    const isGit = await isGitRepository(tempGitDir);
    assert.equal(isGit, true);

    // 2. Create initial file and commit
    await writeFile(path.join(tempGitDir, "fileA.js"), "console.log('v1');");
    await executeGit(["add", "fileA.js"], tempGitDir);
    await executeGit(["commit", "-m", "initial commit"], tempGitDir);

    // 3. Make working tree changes:
    // - Modify fileA.js
    // - Create untracked fileB.js
    await writeFile(path.join(tempGitDir, "fileA.js"), "console.log('v2 modified');");
    await writeFile(path.join(tempGitDir, "fileB.js"), "console.log('untracked');");

    const workingChanges = await getWorkingTreeChanges(tempGitDir);
    assert.equal(workingChanges.isGit, true);
    assert.equal(workingChanges.changes.length, 2);

    const modifiedA = workingChanges.changes.find((c) => c.path === "fileA.js");
    assert.ok(modifiedA);
    assert.equal(modifiedA.status, "modified");

    const untrackedB = workingChanges.changes.find((c) => c.path === "fileB.js");
    assert.ok(untrackedB);
    assert.equal(untrackedB.status, "untracked");

    // 4. Commit changes to test commit diff comparison
    await executeGit(["add", "."], tempGitDir);
    await executeGit(["commit", "-m", "second commit"], tempGitDir);

    // Now compare HEAD~1 against HEAD (simulating PR diff)
    const commitDiff = await getCommitDiff({
      directoryPath: tempGitDir,
      baseRef: "HEAD~1",
      headRef: "HEAD",
    });

    assert.equal(commitDiff.isGit, true);
    assert.equal(commitDiff.changes.length, 2);

    assert.ok(
      commitDiff.classified.modified.some((c) => c.path === "fileA.js"),
      "fileA.js should be classified as modified in commit diff",
    );
    assert.ok(
      commitDiff.classified.added.some((c) => c.path === "fileB.js"),
      "fileB.js should be classified as added in commit diff",
    );
  } finally {
    await rm(tempGitDir, { recursive: true, force: true });
  }
});
