# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1: build the React frontend (same pattern as the original template)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: production API + built frontend
# ---------------------------------------------------------------------------
FROM node:22-alpine

WORKDIR /app

# Install only production backend dependencies.
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev && npm cache clean --force

# backend/.env is included on purpose (see .dockerignore) so the MongoDB URL
# and JWT secret from .env are used inside the container. Environment variables
# supplied by the hosting platform (e.g. byteXL) take precedence over .env.
COPY backend/ ./backend/

# Also support a root .env (some platforms place the database URL here).
# The wildcard always matches .env.example, so the build works without .env.
COPY .env* ./

COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "backend/server.js"]
