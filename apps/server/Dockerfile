FROM node:24-alpine AS base

FROM base AS pruner
RUN apk add --no-cache libc6-compat && \
    npm install turbo --global
WORKDIR /app
COPY . ./
RUN turbo prune --docker --out-dir=output --scope=@dongueldonguel/server

FROM base AS installer
RUN apk add --no-cache libc6-compat curl
WORKDIR /app
COPY --from=pruner /app/output/json ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=installer /app .
COPY --from=pruner /app/output/full ./
RUN corepack enable pnpm && pnpm build --filter=@dongueldonguel/server

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

RUN apk add --no-cache libc6-compat curl && \
    addgroup --system --gid 1001 hono && \
    adduser --system --uid 1001 -G hono hono

COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder /app/apps/server/drizzle ./apps/server/drizzle 2>/dev/null || true
COPY --from=installer /app/node_modules ./node_modules
COPY package.json pnpm-workspace.yaml ./

RUN chown -R hono:hono /app

USER hono

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "apps/server/dist/index.js"]
