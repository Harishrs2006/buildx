# Build from the repository root (npm workspaces need the root lockfile):
#   docker build -f apps/api/Dockerfile -t buildx-api .

# ─── Build stage ────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages ./packages
RUN npm ci --workspace=apps/api --workspace=packages/shared --ignore-scripts
COPY apps/api ./apps/api
# Builds @buildx/shared first (prebuild), then the API to apps/api/dist/server.js
RUN npm run build --workspace=apps/api

# ─── Production stage ────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages ./packages
RUN npm ci --omit=dev --workspace=apps/api --ignore-scripts && npm cache clean --force
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api
# The production logger writes to ./logs
RUN mkdir logs && chown node:node logs
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- "http://localhost:${API_PORT:-${PORT:-4000}}/health" || exit 1
CMD ["node", "dist/server.js"]
