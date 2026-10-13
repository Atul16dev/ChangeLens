# ChangeLens Parser Engine

ChangeLens is being built incrementally. This milestone provides a local multi-language parser foundation; it does not include a frontend, database, GitHub integration, dependency graph, or impact analyzer.

## Requirements
- Node.js 22 or newer
- npm

The native `@xberg-io/tree-sitter-language-pack` package was installed and evaluated first, but its Windows x64 native addon failed to load in this environment (`ERR_DLOPEN_FAILED`). The current implementation uses the same vendor's Tree-sitter WASM package, `@xberg-io/tree-sitter-language-pack-wasm` 1.22.1.

## Run locally
```powershell
npm install
npm test
npm run analyze:sample
npm run parsers:warm
```

`analyze:sample` scans the sample MERN project under `tests/fixtures/mern-sample` and prints a JSON report. Scanned code is parsed only; it is never executed.

## Parser pipeline
1. `repository-scanner.js` discovers files, skips common dependency/build folders and symlinks, and applies file-count and source-size limits.
2. `language-detector.js` detects file types and checks that the corresponding grammar is in the installed bundle.
3. `parser-manager.js` dispatches source to the language pack and configures the source-size guard.
4. `code-extractor.js` converts WASM-backed results to plain JSON and records 1-based locations.
5. `file-analyzer.js` reports unsupported languages and individual parser failures without stopping the complete scan.

The JSON includes per-file status, language, metrics, imports, exports, structural declarations, symbols, diagnostics, and aggregate coverage. Import records are parser evidence, not resolved local dependencies. For static JavaScript and TypeScript imports, an import record includes `moduleSpecifier` when it can be read safely from the parser's statement text; `source` preserves the original statement. Other import forms may have a `null` specifier and are not resolved to repository files.

## Supported languages and limits
The WASM package embeds 31 grammars (32 language names counting an alias) in a roughly 57 MB package. Verified grammars include JavaScript/JSX, TypeScript/TSX, HTML, CSS, JSON, YAML, Python, Java, Go, C, C++, C#, PHP, Ruby, Rust, SQL, Bash, and Dockerfile.

SCSS file extensions are recognized but the SCSS grammar is not in the WASM bundle, so those files are reported as unsupported. Makefiles are likewise reported as unsupported because this bundle does not include a Make grammar. The native package advertises 372 grammars and downloads grammars on demand, but its addon could not be loaded in this Windows environment. The WASM package embeds its subset and performs no runtime grammar downloads or disk caching; deployment must include its large WASM artifact but does not need outbound access to fetch grammars.

The package's parse-timeout option caused a WASM runtime trap during compatibility checks and is not enabled. The scanner currently bounds file count, individual file size, and aggregate source size instead.

## Documentation
- [Architecture](./docs/ARCHITECTURE.md)
- [Backend and parser design](./docs/BACKEND_DESIGN.md)
- [Product specification](./docs/PRODUCT_SPEC.md)
- [Roadmap](./docs/ROADMAP.md)
- [Security](./docs/SECURITY.md)
