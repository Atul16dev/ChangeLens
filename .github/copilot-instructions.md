# Copilot Instructions for ChangeLens

## Project purpose
ChangeLens is an AI-assisted code change impact analysis platform. It helps developers understand the potential blast radius of code changes through traceable code evidence.

## Current architecture
- The current product is a local JavaScript ES module parser engine using Node.js 22+ and Tree-sitter through `@xberg-io/tree-sitter-language-pack-wasm`.
- Keep language detection, parser dispatch, code extraction, repository scanning, and future dependency analysis in separate modules.
- The parser emits normalized JSON and does not resolve imports or infer semantic dependencies.
- There is no frontend, database, GitHub integration, API, or impact analyzer yet.

## Coding conventions
- Prefer small, understandable modules over monolithic services.
- Use JavaScript ES modules and Node.js built-in APIs where suitable.
- Keep analysis logic testable and separate from HTTP or UI code.
- Report parse errors and unsupported languages explicitly.
- Never execute code from scanned repositories.
- Make analysis limitations visible in results and documentation.

## Current implementation stage
The multi-language parser foundation and MERN fixture tests are implemented. The native language-pack package failed to load its Windows x64 addon, so the MVP uses the vendor's WASM sibling package. It contains a curated grammar subset; SCSS is not bundled.

## Development approach
- Verify normalized parse output before adding dependency resolution.
- Add file-level dependency graphs and reverse-impact traversal as separate, tested modules.
- Keep GitHub, PR analysis, API, persistence, frontend, and AI as later milestones.
- Update documentation when implementation scope or limitations change.
