# ==============================================================================
# Stage 1: Build React + Vite Frontend Production Bundle
# ==============================================================================
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Production Runtime (Express API + AST Engine + Static SPA)
# ==============================================================================
FROM node:22-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY analyzer/ ./analyzer/
COPY api/ ./api/
COPY bin/ ./bin/
COPY scripts/ ./scripts/
COPY services/ ./services/
COPY tests/fixtures/mern-sample/ ./tests/fixtures/mern-sample/

COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Pre-warm Tree-Sitter WASM parsers so runtime analysis starts instantaneously
RUN npm run parsers:warm || true

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 5000) + '/api/v1/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "api/server.js"]
