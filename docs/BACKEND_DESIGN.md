# Backend and Parser Design

## Current scope
There is no HTTP backend yet. The current deliverable is a standalone local parser engine in JavaScript ES modules, runnable with Node.js and the built-in test runner.

## Analysis flow
1. Recursively discover files in a local repository.
2. Skip dependency/build directories and symbolic links.
3. Detect file language from its extension or recognized Dockerfile name.
4. Confirm that the grammar exists in the selected Tree-sitter WASM bundle.
5. Parse through the package's `process()` API.
6. Normalize metrics, imports, exports, declarations, symbols, diagnostics, and locations into plain JSON.
7. Return per-file statuses and aggregate coverage without stopping on an individual parse failure.

## Module responsibilities
- `language-detector.js`: extension/name detection and bundled-grammar availability
- `parser-manager.js`: shared package registry, parse limits, and optional prewarming
- `code-extractor.js`: conversion from WASM handles to plain JavaScript data; handles are explicitly freed
- `file-analyzer.js`: per-file orchestration and error result shape
- `repository-scanner.js`: local discovery, exclusions, resource limits, and report coverage

## Package behavior and deployment
The selected package `@xberg-io/tree-sitter-language-pack-wasm` bundles a fixed grammar set into its WASM artifact. It does not fetch grammars on first use and does not keep a disk grammar cache. The package is large (about 57 MB unpacked) but deployment does not need outbound network access to obtain grammars.

`npm run parsers:warm` asks the package to initialize its bundled parsers before a workload. File and repository byte limits remain enabled independently.

The package's parse-timeout setting caused a WASM runtime trap during compatibility testing, so this version does not set that option. The scanner instead limits file count, individual file size, and aggregate source bytes. This is a known limitation to revisit before processing untrusted large repositories in a service.

## Explicit limitations
- The WASM package contains a curated subset, not all 372 native package grammars.
- SCSS is detected by extension but is not present in this bundle; Makefiles are also unsupported.
- Import records are syntax evidence only; the parser does not resolve local modules or construct a dependency graph.
- A parser result is structural metadata, not a claim of full semantic understanding.
- GitHub access, PR comparison, persistence, HTTP APIs, and impact analysis are not implemented.
