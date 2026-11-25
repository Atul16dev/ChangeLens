# ChangeLens — Code Change Impact Intelligence Platform

[![ChangeLens CI/CD Pipeline](https://github.com/Atul16dev/ChangeLens/actions/workflows/ci.yml/badge.svg)](https://github.com/Atul16dev/ChangeLens/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?logo=nodedotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose%20Ready-2496ED?logo=docker&logoColor=white)
![Tests](https://img.shields.io/badge/Automated%20Tests-261%20Passing-brightgreen)

ChangeLens is an enterprise-grade code change blast radius analysis and static intelligence platform. It parses source trees deterministically using offline Tree-Sitter WASM, generates reverse dependency blast-radius graphs, isolates impacted symbols, flags broken imports, scores risk deterministically (0–100), and provides AI-powered pull request risk reviews.

---

## Key Platform Capabilities

1. **Deterministic AST Blast-Radius Engine**: Reverse BFS graph traversal across JavaScript, TypeScript, Python, and Go with symbol-level dependency resolution.
2. **Interactive Visual Impact Graph**: Built with React Flow, ELK.js layered layout, What-If simulation, and multi-format exports (PNG, SVG, Markdown, PDF, JSON).
3. **Context-Aware AI Reviewer & Chat Assistant**: Gemini-powered risk classification and interactive codebase query engine.
4. **CI/CD Automation Runner**: Automated pull request checks via `changelens-ci`.
5. **Enterprise Production-Ready Authentication System**:
   - Secure Argon2id password hashing with OWASP-recommended parameters.
   - 6-digit Email OTP Verification with 5-minute expiry, server-side cooldown, and attempt limits.
   - Transactional email delivery via Nodemailer (SMTP with HTML/plain-text templates and in-memory test adapter).
   - "Continue with Google" & "Continue with GitHub" OAuth2 authorization code flows with cryptographic CSRF state checks.
   - Persistent MongoDB Atlas cloud database with Mongoose schemas and connection pooling.
   - HttpOnly, SameSite, Secure session cookies with session rotation on login/verification.
   - Two-step Password Reset via 6-digit OTP challenge, single-use reset authorization token, and multi-device session invalidation.
   - Brute-force IP rate limiting and timing-safe authentication error envelopes.
6. **Cloud-Persisted Analysis History & Tracked Repositories Hub (MongoDB CRUD)**:
   - Automated persistence of blast radius graph topologies, broken symbol diagnostics, and AI reviews in MongoDB Atlas.
   - Tracked Repositories Hub (`Repository` model) to bookmark favorite GitHub repositories, pin workspaces, sync latest commits, and trigger 1-click PR analysis without re-pasting URLs.
   - Asynchronous Background Job Queue (`QUEUED -> PROCESSING -> COMPLETED`) with live SSE/polling updates and a deterministic 0–100 Explainable Risk Scoring Engine.

---

## Getting Started

### 1. Requirements
- Node.js 22 or newer
- npm

### 2. Installation
```powershell
# Install root dependencies (including AST engine, Mongoose/MongoDB, Argon2, Nodemailer)
npm install

# Install frontend dependencies (React 19, Tailwind CSS, React Flow)
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
- `GOOGLE_*`: Google OAuth 2.0 Client ID and Secret (optional).

### 4. Running the Development Servers
```powershell
# Run the backend API server (port 5000)
npm run api

# In a separate terminal, run the frontend Vite dev server (port 5173)
npm run frontend:dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Running with Docker (1-Command Full-Stack Deployment)
Build and launch the full ChangeLens stack (Express API + Compiled React SPA + MongoDB + Redis) in one command:
```bash
docker compose up --build
```
Open [http://localhost:5000](http://localhost:5000) in your browser. Health check is available at `/api/v1/health`.

### 6. Running the Automated Test Suite
```powershell
npm test
```
The test suite validates:
- AST Parsing & Import Resolution (JS/TS/Python/Go)
- Symbol-Level Impact, Explainable 0–100 Risk Scoring & Predictive Test Selection
- Async Analysis Queue & Graph Layout / What-If Simulation
- Full Authentication Flow (Argon2id, Email OTP, Google & GitHub OAuth, Rate Limiting, Session Rotation, RBAC Admin)
- Tracked Repositories Hub, CI Runner & REST API Endpoints

All **261 automated tests** execute cleanly with zero external network or database dependencies.

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
| `POST` | `/api/v1/analyze` | Trigger repository scan & AST blast radius analysis (sync or `?async=true`) | Public (Session-attributed) |
| `GET` | `/api/v1/jobs/:jobId` | Poll asynchronous background analysis job progress & status | Public |
| `GET` | `/api/v1/jobs/:jobId/events` | Stream live job progress via Server-Sent Events (SSE) | Public |
| `GET` | `/api/v1/repos` | List user's saved repositories in Tracked Repositories Hub | `requireAuth` |
| `POST` | `/api/v1/repos` | Save/track a GitHub repository with metadata & telemetry | `requireAuth` |
| `PATCH` | `/api/v1/repos/:id/pin` | Pin or unpin a tracked repository | `requireAuth` (Owner only) |
| `DELETE` | `/api/v1/repos/:id` | Remove a repository from Tracked Repositories Hub | `requireAuth` (Owner only) |
| `GET` | `/api/v1/repos/:id/pulls` | Fetch live open Pull Requests for 1-click PR blast radius checks | `requireAuth` (Owner only) |
| `GET` | `/api/v1/analyses/history` | List user's saved analysis reports (search & pagination) | `requireAuth` |
| `DELETE` | `/api/v1/analyses/:id` | Remove a saved analysis run from MongoDB | `requireAuth` (Owner only) |
| `GET` | `/api/v1/analyses/:id/graph` | Return ELK layered React Flow visual graph nodes and edges | Public |
| `GET` | `/api/v1/analyses/:id/impact` | Return symbol blast radius findings, broken imports, and scores | Public |
| `GET` | `/api/v1/analyses/:id/explain` | Return Gemini AI PR risk explanation & markdown comment | Public |
| `POST` | `/api/v1/analyses/:id/simulate` | Run live What-If blast radius simulation on any file | Public |
| `POST` | `/api/v1/analyses/:id/chat` | Query contextual AI assistant about graph or symbols | Public |

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
   - Cookies are configured with `HttpOnly: true`, `SameSite: 'lax'`, and `Secure: true` in production.
   - Session identifiers are regenerated upon login, registration, and email verification to neutralize session fixation.
   - Password reset immediately destroys all active sessions across all devices for the target user.
4. **Credential Leakage Prevention**:
   - Generic timing-safe error envelopes for failed logins (`INVALID_CREDENTIALS`).
   - Forgot-password requests return standard success responses whether the account exists or not, preventing email enumeration.
