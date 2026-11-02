# syntax=docker/dockerfile:1.7

# ---------------------------------------------------------------------------
# 1. Install frontend dependencies (cached independently from source changes)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS frontend-deps
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------------------------------------------------------------------------
# 2. Build the React SPA
# ---------------------------------------------------------------------------
FROM frontend-deps AS frontend-build
COPY frontend/ ./
RUN npm run build

# ---------------------------------------------------------------------------
# 3. Install only production backend dependencies
# ---------------------------------------------------------------------------
FROM node:22-alpine AS backend-deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
    && npm cache clean --force

# ---------------------------------------------------------------------------
# 4. Minimal production runtime
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

# tini forwards signals correctly so the container stops gracefully.
RUN apk add --no-cache tini

COPY --from=backend-deps --chown=node:node /app/backend/node_modules ./backend/node_modules
COPY --chown=node:node backend/ ./backend/
COPY --from=frontend-build --chown=node:node /app/frontend/dist ./frontend/dist

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "backend/server.js"]
