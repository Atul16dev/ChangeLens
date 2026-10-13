# Data Model

## High-level concepts
- Repository
- Snapshot
- FileRecord
- DependencyGraph
- ChangeSet
- Finding
- Evidence
- PullRequest

## Repository
Represents the project being analyzed.

Fields:
- `id`
- `name`
- `owner`
- `defaultBranch`
- `provider` (for example `github`)
- `url`
- `createdAt`

## Snapshot
An immutable point-in-time view of repository contents.

Fields:
- `repositoryId`
- `commitSha`
- `branch`
- `fetchedAt`
- `fileCount`
- `sizeBytes`

## FileRecord
A file in a snapshot.

Fields:
- `snapshotId`
- `path`
- `language`
- `contentHash`
- `sizeBytes`
- `status` (added, modified, deleted, renamed, unchanged)

## DependencyGraph
Represents relationships between files and/or symbols.

Graph node examples:
- file
- exported symbol
- class
- function
- property access object

Graph edge examples:
- imports
- calls
- property reads
- inheritance
- object member access

## ChangeSet
The change being evaluated.

Fields:
- `baseCommitSha`
- `headCommitSha`
- `changedFiles[]`
- `statusMap`
- `diffSummary`

## Finding
A possible impact result.

Fields:
- `id`
- `sourceFile`
- `sourceSymbol`
- `impactedFile`
- `impactedSymbol`
- `relationshipType`
- `reason`
- `confidence`
- `evidence[]`
- `recommendedChecks[]`
- `uncertaintyNotes[]`

## Evidence
Every finding should be grounded in data.

Fields:
- `type` (import, call, property, export, diff, rename)
- `location`
- `snippet`
- `source`

## PullRequest
A GitHub pull request or equivalent change request.

Fields:
- `number`
- `repositoryId`
- `baseCommitSha`
- `headCommitSha`
- `title`
- `changedFiles[]`
- `state`
- `mergedAt`

## Notes
The project should favor explicit records over implicit assumptions. Findings must be explainable, auditable, and tied to exact evidence when available.

These are proposed future persistence models. The current parser engine does not use MongoDB or persist repository contents.
