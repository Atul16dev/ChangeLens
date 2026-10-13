# Development Roadmap

## Completed: Workspace baseline
- Confirmed the initial workspace had no application code.
- Added product and architecture documentation.

## Current milestone: Multi-language parser engine
Implemented:
- Node.js ES module project targeting Node 22+
- Local recursive scanner with exclusions and resource limits
- Extension-based language detection
- Tree-sitter WASM ParserManager and JSON normalization
- Per-file parse errors and unsupported-language reporting
- MERN fixture project and Node built-in tests

Known limitations:
- The selected WASM package embeds a 31-grammar subset; SCSS is not bundled.
- The package is about 57 MB unpacked.
- The package's parse-timeout option traps in the current WASM runtime and is not enabled.
- Import data is syntactic evidence only; there is no resolver or graph.

## Next testable milestone
Extend fixtures and extractor checks for the supported language set, then design the language-neutral dependency record format. Keep dependency resolution and graph traversal out of the parser module.

## Later phases
1. Dependency resolver and file-level graph
2. Impact traversal with reverse dependencies and evidence paths
3. Immutable repository snapshots and public GitHub provider
4. Pull request base/head analysis
5. API, persistence, and dashboard
6. Symbol-level analysis
7. Evidence-grounded AI explanations
8. Private GitHub App access and deployment hardening
