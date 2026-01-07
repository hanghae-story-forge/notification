FROM node:24-alpine AS base

FROM base AS pruner
RUN apk add --no-cache libc6-compat && \
    npm install turbo --global
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/server/package.json ./apps/server/
COPY apps/client/package.json ./apps/client/

# Copy source files for turbo prune
COPY apps/server ./apps/server

RUN turbo prune --docker --out-dir=output --scope=@hanghae-study/server

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
RUN corepack enable pnpm && pnpm build --filter=@hanghae-study/server

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

RUN apk add --no-cache libc6-compat curl && \
    addgroup --system --gid 1001 hono && \
    adduser --system --uid 1001 -G hono hono

COPY --from=builder /app/apps/server/.pylon ./apps/server/.pylon
COPY --from=installer /app/. .

RUN chown -R hono:hono /app

USER hono

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "apps/server/.pylon/index.js"]
