# ChangeLens — Code Change Impact Intelligence Platform

[![ChangeLens CI/CD Pipeline](https://github.com/Atul16dev/ChangeLens/actions/workflows/ci.yml/badge.svg)](https://github.com/Atul16dev/ChangeLens/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?logo=nodedotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose%20Ready-2496ED?logo=docker&logoColor=white)
![Tests](https://img.shields.io/badge/Automated%20Tests-269%20Passing-brightgreen)

ChangeLens is an enterprise-grade code change blast radius analysis and static intelligence platform. It parses source trees deterministically using offline Tree-Sitter WASM, generates reverse dependency blast-radius graphs, isolates impacted symbols, flags broken imports, scores risk deterministically (0–100), and provides AI-powered pull request risk reviews.

---

## Key Platform Capabilities

1. **Deterministic AST Blast-Radius Engine**: Reverse BFS graph traversal across JavaScript, TypeScript, Python, and Go with symbol-level dependency resolution.
2. **Interactive 2D & 3D Visual Impact Graphs**: Built with React Flow, ELK.js layered layout, a Three.js 3D Dependency Galaxy view, What-If simulation, Dark/Light ("Prism") themes, and multi-format exports (PNG, SVG, Markdown, PDF, JSON).
3. **Context-Aware AI Reviewer & Chat Assistant**: Gemini-powered risk classification and interactive codebase query engine.
4. **CI/CD Automation Runner**: Automated pull request checks via `changelens-ci` and workflow template generation.
5. **Local Workshop Bridge**: Real-time local git workspace inspection and scanning bridged directly into the browser dashboard.
6. **Enterprise Production-Ready Authentication System**:
   - Secure Argon2id password hashing with OWASP-recommended parameters.
   - 6-digit Email OTP Verification with 5-minute expiry, server-side cooldown, and attempt limits.
   - Transactional email delivery via Nodemailer (SMTP with HTML/plain-text templates and in-memory test adapter).
   - "Continue with Google" & "Continue with GitHub" OAuth2 authorization code flows with cryptographic CSRF state checks.
   - Persistent MongoDB Atlas cloud database with Mongoose schemas and connection pooling.
   - HttpOnly session cookies with configurable `SameSite`/`Secure` flags and session rotation on login/verification.
   - Two-step Password Reset via 6-digit OTP challenge, single-use reset authorization token, and multi-device session invalidation.
   - Brute-force IP rate limiting and timing-safe authentication error envelopes.
7. **Cloud-Persisted History, Tracked Repositories Hub, Feedback & RBAC Admin Console**:
   - Automated persistence of blast radius graph topologies, broken symbol diagnostics, and AI reviews in MongoDB Atlas.
   - Tracked Repositories Hub (`Repository` model) to bookmark favorite GitHub repositories, pin workspaces, sync latest commits, and trigger 1-click PR analysis without re-pasting URLs.
   - Asynchronous Background Job Queue (`QUEUED -> PROCESSING -> COMPLETED`) with live SSE (with keep-alive heartbeats) and polling updates plus a deterministic 0–100 Explainable Risk Scoring Engine.
   - Community 5-Star Feedback Portal (`Feedback` model) for public & per-analysis ratings and analytics.
   - Role-Based Admin & Moderation Console (`AdminInvitation` & `User` moderation controls) for super-admin invites, granular permission updates, account bans/unbans, and activity notes.

---

## Getting Started

### 1. Requirements
- Node.js 22 or newer
- npm

### 2. Installation
```powershell
# Install root dependencies (including AST engine, Mongoose/MongoDB, Argon2, Nodemailer)
npm install

# Install frontend dependencies (React 19, Tailwind CSS, React Flow, Three.js)
npm install --prefix frontend
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```
Key configuration values:
- `MONGODB_URI`: MongoDB Atlas connection string (or fallback to in-memory mode for offline dev/tests).
- `SESSION_SECRET`: Random 32+ character key for signing session cookies.
- `OTP_SECRET`: Random 32+ character key for HMAC-SHA256 OTP challenge generation.
- `SMTP_*`: Credentials for your transactional email provider (Gmail App Password, SendGrid, Mailgun, Amazon SES). In local dev or test mode, emails can be captured in memory.
- `GOOGLE_*` / `GITHUB_CLIENT_*`: Google and GitHub OAuth 2.0 credentials (optional).
- `FRONTEND_ORIGIN` / `FRONTEND_URL`: Allowed frontend origins for CORS (comma-separated for multiple domains).
- `COOKIE_SECURE` / `COOKIE_SAMESITE`: Session cookie transport settings (`false` / `lax` for local HTTP; `true` / `none` for cross-site HTTPS hosting).
- `SUPER_ADMIN_EMAILS`: Comma-separated list of bootstrap super-admin email addresses.
- `CHANGELENS_CACHE_DIR`: Optional directory path for cloned repository caches (defaults to `.changelens-cache/repos` with automatic OS temp-directory fallback on read-only containers).

### 4. Running the Development Servers
```powershell
# Run the backend API server (port 5000)
npm run api

# In a separate terminal, run the frontend Vite dev server (port 5173)
npm run frontend:dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Production Build & Hosting (Render / Railway / Vercel)
```powershell
# Build the frontend production bundle
npm run build

# Start the Express production server (serves API + built SPA)
npm start
```
For split-domain hosting (e.g., frontend on Vercel and API on Render):
- Set `FRONTEND_ORIGIN=https://your-frontend.vercel.app`
- Set `COOKIE_SECURE=true` and `COOKIE_SAMESITE=none` so cross-origin credentialed session cookies are accepted over HTTPS.

### 6. Running with Docker (1-Command Full-Stack Deployment)
Build and launch the full ChangeLens stack (Express API + Compiled React SPA + MongoDB) in one command:
```bash
docker compose up --build
```
Open [http://localhost:5000](http://localhost:5000) in your browser. Health check is available at `/api/v1/health`.

### 7. Running the Automated Test Suite & Linter
```powershell
npm test
npm run lint --prefix frontend
```
The test suite validates:
- AST Parsing & Import Resolution (JS/TS/Python/Go)
- Symbol-Level Impact, Explainable 0–100 Risk Scoring & Predictive Test Selection
- Async Analysis Queue & Graph Layout / What-If Simulation
- Full Authentication Flow (Argon2id, Email OTP, Google & GitHub OAuth, Rate Limiting, Session Rotation, RBAC Admin)
- Tracked Repositories Hub, Feedback, CI Runner & REST API Endpoints

All **269 automated tests** execute cleanly with zero external network or database dependencies.

---

## Authentication API Reference

| Method | Endpoint | Description | Guard |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new user and send 6-digit verification OTP | Public (Rate-limited) |
| `POST` | `/api/v1/auth/verify-email` | Verify email OTP, activate account, and establish session | Public (Rate-limited) |
| `POST` | `/api/v1/auth/resend-verification-otp` | Resend verification code (enforces 60s cooldown) | Public (Rate-limited) |
| `POST` | `/api/v1/auth/login` | Authenticate with email/password; rotates session | Public (Rate-limited) |
| `POST` | `/api/v1/auth/logout` | Invalidate server session and clear HttpOnly cookie | Session |
| `GET` | `/api/v1/auth/me` | Return current authenticated user profile | `requireAuth` |
| `PATCH` | `/api/v1/auth/profile` | Update authenticated user profile details | `requireAuth` |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset 6-digit OTP | Public (Rate-limited) |
| `POST` | `/api/v1/auth/verify-reset-otp` | Verify reset OTP and receive single-use reset token | Public (Rate-limited) |
| `POST` | `/api/v1/auth/reset-password` | Update password with reset token; invalidates active sessions | Public (Rate-limited) |
| `GET` | `/api/v1/auth/google` | Initiate Google OAuth 2.0 authorization code flow | Public |
| `GET` | `/api/v1/auth/google/callback` | Validate OAuth state and code, issue authenticated session | Public |
| `GET` | `/api/v1/auth/github` | Initiate GitHub OAuth authorization code flow | Public |
| `GET` | `/api/v1/auth/github/callback` | Validate GitHub OAuth state/code, link/create user & rotate session | Public |

---

## Analysis, Jobs & Tracked Repositories API Reference

| Method | Endpoint | Description | Guard |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Service health check, uptime, and MongoDB connection status | Public |
| `POST` | `/api/v1/analyze` | Trigger repository scan & AST blast radius analysis (sync or `?async=true`) | Public (Session-attributed) |
| `POST` | `/api/v1/analyze/async` | Enqueue an asynchronous repository analysis job | Public (Session-attributed) |
| `POST` | `/api/v1/jobs/analyze` | Create a queued analysis job | Public (Session-attributed) |
| `POST` | `/api/v1/jobs` | Enqueue a generic background analysis job | Public (Session-attributed) |
| `GET` | `/api/v1/jobs` | List recent analysis jobs | Session / Auth |
| `GET` | `/api/v1/jobs/:jobId` | Poll asynchronous background analysis job progress & status | Public |
| `GET` | `/api/v1/jobs/:jobId/events` | Stream live job progress via Server-Sent Events (SSE with keep-alive) | Public |
| `GET` | `/api/v1/repos` | List user's saved repositories in Tracked Repositories Hub | `requireAuth` |
| `POST` | `/api/v1/repos` | Save/track a GitHub repository with metadata & telemetry | `requireAuth` |
| `PATCH` | `/api/v1/repos/:id/pin` | Pin or unpin a tracked repository | `requireAuth` (Owner only) |
| `DELETE` | `/api/v1/repos/:id` | Remove a repository from Tracked Repositories Hub | `requireAuth` (Owner only) |
| `GET` | `/api/v1/repos/:id/pulls` | Fetch live open Pull Requests for 1-click PR blast radius checks | `requireAuth` (Owner only) |
| `GET` | `/api/v1/analyses` | List saved analyses | Session / Auth |
| `GET` | `/api/v1/analyses/history` | List user's saved analysis reports (search & pagination) | `requireAuth` |
| `GET` | `/api/v1/analyses/:id` | Fetch full saved analysis record by ID | Session / Auth |
| `PATCH` | `/api/v1/analyses/:id/pin` | Pin or unpin a saved analysis report | `requireAuth` |
| `DELETE` | `/api/v1/analyses/:id` | Remove a saved analysis run from MongoDB | `requireAuth` (Owner only) |
| `GET` | `/api/v1/analyses/:id/graph` | Return ELK layered React Flow visual graph nodes and edges | Public |
| `GET` | `/api/v1/analyses/:id/impact` | Return symbol blast radius findings, broken imports, and scores | Public |
| `GET` | `/api/v1/analyses/:id/explain` | Return Gemini AI PR risk explanation & markdown comment | Public |
| `POST` | `/api/v1/analyses/:id/simulate` | Run live What-If blast radius simulation on any file | Public |
| `POST` | `/api/v1/analyses/:id/chat` | Query contextual AI assistant about graph or symbols | Public |

---

## GitHub Integration, Local Bridge, Feedback & Admin API Reference

| Method | Endpoint | Description | Guard |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/github/connect-repo` | Connect and inspect a GitHub repository | Session / Auth |
| `POST` | `/api/v1/github/sync-commits` | Sync recent commits for a connected repository | Session / Auth |
| `GET` | `/api/v1/github/repo-commits` | Fetch synced commit history for a repository | Session / Auth |
| `POST` | `/api/v1/github/inspect-pr` | Inspect changed files and metadata for a GitHub PR | Session / Auth |
| `POST` | `/api/v1/github/analyze-pr` | Run AST blast radius analysis against a GitHub PR | Session / Auth |
| `POST` | `/api/v1/github/post-comment` | Post a ChangeLens PR summary comment back to GitHub | Session / Auth |
| `GET` | `/api/v1/github/workflow-template` | Return recommended ChangeLens GitHub Actions workflow YAML | Public |
| `GET` | `/api/v1/bridge/status/:session` | Check live Local Workshop Bridge agent connection status | Public |
| `GET` | `/api/v1/bridge/changes/:session` | Fetch uncommitted local git changes reported by bridge client | Public |
| `POST` | `/api/v1/bridge/scan/:session` | Run blast radius analysis on local bridge workspace changes | Public |
| `POST` | `/api/v1/feedback` | Submit 5-star platform or per-analysis feedback | Session / Auth |
| `GET` | `/api/v1/feedback/mine` | List feedback submitted by the authenticated user | `requireAuth` |
| `GET` | `/api/v1/feedback/public` | Fetch public community feedback feed with filtering & sorting | Public |
| `GET` | `/api/v1/feedback/stats` | Fetch aggregated rating distribution and summary metrics | Public |
| `GET` | `/api/v1/feedback/analysis/:analysisId` | Fetch feedback linked to a specific analysis ID | Public |
| `GET` | `/api/v1/admin/me` | Return current admin role and granular permissions | Admin / Super-Admin |
| `POST` | `/api/v1/admin/invites` | Create and send an admin role invitation link | Super-Admin |
| `GET` | `/api/v1/admin/invites` | List pending and historical admin invitations | Admin / Super-Admin |
| `DELETE` | `/api/v1/admin/invites/:id` | Revoke or delete an admin invitation | Admin / Super-Admin |
| `GET` | `/api/v1/admin/invites/verify/:token` | Verify an admin invitation token before acceptance | Public |
| `POST` | `/api/v1/admin/invites/accept` | Accept an admin invitation and grant panel access | Public / Authenticated |
| `GET` | `/api/v1/admin/users` | List registered users with role and moderation status | Admin / Super-Admin |
| `PATCH` | `/api/v1/admin/users/:id/access` | Update user role or granular admin permissions | Super-Admin |
| `DELETE` | `/api/v1/admin/users/:id/access` | Revoke admin privileges from a user | Super-Admin |
| `POST` | `/api/v1/admin/users/:id/ban` | Suspend/ban a user account | Admin / Super-Admin |
| `POST` | `/api/v1/admin/users/:id/unban` | Restore a banned user account | Admin / Super-Admin |
| `GET` | `/api/v1/admin/users/:id/activity` | Inspect user activity history and admin notes | Admin / Super-Admin |
| `POST` | `/api/v1/admin/users/:id/notes` | Attach a moderation note to a user record | Admin / Super-Admin |

---

## Security Architecture

1. **Password Hashing**: Passwords are hashed using `@node-rs/argon2` with Argon2id, 64 MB memory cost, 3 iterations, and 4 lanes. Hashes are never logged or returned in responses.
2. **OTP Security**:
   - 6-digit cryptographically random integers generated via `crypto.randomInt`.
   - Never stored in plaintext; stored as HMAC-SHA256 digests.
   - Verified using `crypto.timingSafeEqual` to avoid timing side-channels.
   - Max 5 attempts before challenge invalidation.
   - 5-minute strict TTL and 60-second resend cooldown.
3. **Session Management**:
   - Cryptographically random session identifiers managed via `express-session` with a persistent `connect-mongo` session store on MongoDB Atlas.
   - Cookies are configured with `HttpOnly: true`, configurable `SameSite` (`lax` default, or `none` paired with `Secure: true` via `COOKIE_SECURE`/`COOKIE_SAMESITE` for split-domain HTTPS hosting).
   - Session identifiers are regenerated upon login, registration, and email verification to neutralize session fixation.
   - Password reset immediately destroys all active sessions across all devices for the target user.
4. **Credential Leakage Prevention**:
   - Generic timing-safe error envelopes for failed logins (`INVALID_CREDENTIALS`).
   - Forgot-password requests return standard success responses whether the account exists or not, preventing email enumeration.
