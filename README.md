# ChangeLens — Code Change Impact Intelligence Platform

ChangeLens is an enterprise-grade code change blast radius analysis and static intelligence platform. It parses source trees deterministically using offline Tree-Sitter WASM, generates reverse dependency blast-radius graphs, isolates impacted symbols, flags broken imports, and provides AI-powered pull request risk reviews.

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
   - "Continue with Google" OAuth2 / OpenID Connect authorization code flow with cryptographic state checks.
   - Persistent MongoDB Atlas cloud database with Mongoose schemas and connection pooling.
   - HttpOnly, SameSite, Secure session cookies with session rotation on login/verification.
   - Two-step Password Reset via 6-digit OTP challenge, single-use reset authorization token, and multi-device session invalidation.
   - Brute-force IP rate limiting and timing-safe authentication error envelopes.

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

### 5. Running the Automated Test Suite
```powershell
npm test
```
The test suite validates:
- AST Parsing & Import Resolution (JS/TS/Python/Go)
- Symbol-Level Impact & Blast Radius Calculation
- Graph Layout & What-If Simulation
- Full Authentication Flow (Registration, OTP verification, Rate Limiting, Session Rotation, Reset Password)
- CI Runner & REST API Endpoints

All 135 tests execute synchronously in under 2.5 seconds with zero external network dependencies.

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
