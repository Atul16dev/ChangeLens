# Architecture

## Current parser-engine flow
The current implementation is a local JavaScript ES module project. It does not include an API, database, GitHub integration, UI, dependency graph, or impact analyzer.

Local repository -> file discovery -> language detection -> ParserManager -> Tree-sitter WASM processing -> code extraction -> normalized JSON report

### Modules
- `analyzer/repository-scanner.js` discovers files without following symlinks, skips dependency/build folders, enforces size limits, and reports coverage.
- `analyzer/language-detector.js` uses the language-pack extension catalog and confirms that the detected grammar exists in the selected WASM bundle.
- `analyzer/parser-manager.js` owns parser configuration, dispatch, and grammar prewarming.
- `analyzer/code-extractor.js` converts the package's WASM-backed result objects into plain JSON and releases their WASM handles.
- `analyzer/file-analyzer.js` combines detection, parsing, normalized extraction, and per-file failure reporting.

## Parser package decision
The preferred native package, `@xberg-io/tree-sitter-language-pack`, installed its Windows x64 binary but that binary failed to load in this environment with `ERR_DLOPEN_FAILED`. The verified same-vendor alternative, `@xberg-io/tree-sitter-language-pack-wasm`, runs on Node.js 22 and remains Tree-sitter-based.

The WASM package embeds 31 grammars (32 language names including an alias) in a roughly 57 MB module. It has no runtime grammar downloads or disk cache. It includes the requested MVP languages except SCSS and Make; detected file types without a bundled grammar are reported as unsupported.

## Future architecture (not implemented)
The parser output can later feed independent modules for import resolution, dependency graph construction, change comparison, and impact findings. Those modules should remain separate from the parser and should not infer semantic relationships from syntax alone.

Future layers may add repository providers, application services, an API, persistence, a frontend, and optional evidence-grounded AI explanations. None is part of this parser milestone.

## Design principles
- Deterministic parsing before probabilistic explanation
- Separate detection, parsing, extraction, and later dependency analysis
- Report unsupported files and parse failures without hiding them
- Treat repository content as untrusted and never execute it
- Keep analysis output reproducible and explicit about coverage
