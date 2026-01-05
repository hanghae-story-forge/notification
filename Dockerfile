# Base image
FROM node:24-alpine AS base
WORKDIR /app

# Dependencies stage
FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Builder stage
FROM base AS builder
RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json tsup.config.ts ./
COPY src ./src
RUN pnpm install --frozen-lockfile
RUN pnpm build

# Runner stage
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 hono

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=builder /app/dist ./dist

USER hono

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

CMD ["node", "dist/index.js"]
