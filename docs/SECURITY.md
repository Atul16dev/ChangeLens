# Security

## Security goals
ChangeLens handles untrusted repository content and must therefore be designed with defensive analysis in mind.

## Current controls
- Repository code is parsed only; it is never executed.
- The local scanner skips symlinked entries and common dependency/build directories.
- File count, individual source size, and total source size are bounded.
- Unsupported files and per-file parse failures are explicitly reported.
- The analyzer performs no network fetches and has no access to credentials in this milestone.

## Current limitations
The parser-timeout option causes a WASM runtime trap in the selected package and is therefore not enabled. Keep source limits conservative and revisit timeout enforcement before exposing parsing to untrusted remote users.

The scanner is local-only. There is no API, authentication, database, GitHub integration, or LLM integration in this milestone.

## Future requirements
- Treat repository contents and PR text as untrusted data.
- Never execute repository code or scripts.
- Keep credentials out of logs and analyzed content.
- Use least-privilege GitHub App permissions.
- Verify webhook signatures before accepting GitHub events.
- Isolate expensive parsing and enforce request/rate/resource limits in a deployed service.
