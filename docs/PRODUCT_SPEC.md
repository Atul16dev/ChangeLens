# Product Specification

## Purpose
ChangeLens is an AI-assisted code change impact analysis platform for developers who need to understand the blast radius of a code change before merging. The system answers the question: "If I change this code, which other parts of the project should I inspect or test, and why?"

## Problem it solves
When a developer changes a shared model, exported function, API contract, or business rule, the risk is not always obvious. Some consequences are easy to see, but others hide in indirect dependencies, service layers, analytics code, route handlers, and tests.

ChangeLens should help developers spot likely impact areas early and provide traceable evidence rather than vague guesses.

## Core user story
As a developer, I want to analyze a repository and a pull request so that I can identify likely downstream impact areas, understand why they are related, and decide what to test before merging.

## Primary capabilities
- Connect or enter a repository reference
- Analyze repository structure and dependencies
- Review changed files from a commit or pull request
- Find direct and transitive dependency relationships
- Trace likely impact from changed symbols, files, and modules
- Present evidence with file paths, import sites, symbol names, and relationship types
- Recommend tests or manual checks for impacted areas
- Clearly mark uncertainty when analysis is incomplete

## Non-goals for version 1
- Full semantic code understanding across every language and framework
- Automatic security audit decisions for every repository
- Guaranteed correctness for all dynamic runtime behaviors
- Private repository integration in the first implementation
- Overreliance on LLM-generated conclusions without deterministic evidence

## Principles
1. Evidence before conclusions
2. Deterministic analysis before probabilistic explanation
3. Small, understandable modules
4. Explicit analysis limitations
5. Secure handling of repository contents
6. Reproducible analysis tied to commit SHAs
7. Testable logic separated from controllers
8. Incremental implementation

## Immediate scope: parser foundation
The current milestone is a local multi-language parser engine. It:
- scans a local repository without executing its code
- detects languages per file and selects bundled Tree-sitter grammars
- extracts syntax-backed imports, exports, declarations, symbols, locations, and diagnostics where available
- normalizes results to JSON and reports unsupported files and parse failures
- does not resolve imports, build dependency graphs, or predict change impact yet

## Example impact scenario
If a model property like `Customer.email` changes to `Customer.contactEmail`, the platform should identify likely impact in:
- services that read the property
- controllers that serialize the model
- notification logic
- analytics modules
- route handlers
- tests that assert the old property name

The system should explain the evidence for each finding rather than claiming every connected file is definitely broken.

## Success criteria
A successful MVP provides:
- a deterministic dependency graph for a sample repo
- a repository provider abstraction
- a pull request analysis pipeline
- evidence-backed impact findings
- a usable UI for viewing results
- a clear statement of limitations for any uncertain findings

## Current implementation stage
The parser foundation, local scanner, and MERN sample tests are implemented in JavaScript ES modules for Node.js 22+. The native language-pack package could not load its Windows binary in this environment, so the current MVP uses the vendor's WASM package. Its curated subset does not include SCSS. No frontend, database, HTTP backend, GitHub integration, or impact analyzer has been built.
