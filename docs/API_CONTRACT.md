# API Contract

## Overview
This is a proposed future API contract. The current parser milestone is local-only and exposes no HTTP endpoints.

## Endpoints

### `GET /health`
Returns basic server status.

Response:
```json
{
  "status": "ok",
  "service": "changelens-api"
}
```

### `POST /api/repositories/analyze`
Analyze a repository snapshot or local fixture.

Request:
```json
{
  "repo": "sample-project",
  "provider": "local",
  "branch": "main",
  "commitSha": "abc123"
}
```

Response:
```json
{
  "repositoryId": "repo_123",
  "snapshotId": "snap_456",
  "filesDiscovered": 42,
  "graphs": {
    "fileGraph": "built",
    "impactGraph": "built"
  },
  "summary": "Analysis completed"
}
```

### `POST /api/changes/analyze`
Analyze a change set against a base revision.

Request:
```json
{
  "repositoryId": "repo_123",
  "baseCommitSha": "abc123",
  "headCommitSha": "def456",
  "changedFiles": ["src/models/User.ts"]
}
```

Response:
```json
{
  "findings": [],
  "summary": {
    "directDependents": 2,
    "transitiveDependents": 5,
    "uncertainFiles": 1
  }
}
```

### `GET /api/repositories/:id/impact`
Retrieve a previously generated impact report.

## Response conventions
- Use JSON as the API format
- Use explicit fields instead of ambiguous nested objects when possible
- Return `confidence`, `reason`, and `evidence` for every non-trivial finding
- Use consistent status values such as `added`, `modified`, `deleted`, `renamed`, `unchanged`

## Future endpoints
- repository list and metadata lookup
- PR detail retrieval
- analysis job status
- export of findings for UI visualization

## Notes
This contract is intentionally small. The first version prioritizes correctness and traceability over breadth.
