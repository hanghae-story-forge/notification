# Build stage
FROM node:18-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@10.0.0

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/
COPY apps/client/package.json ./apps/client/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy workspace configuration and source files
COPY turbo.json tsconfig.json ./
COPY apps/server ./apps/server

# Build the server
RUN pnpm build --filter=@dongueldonguel/server

# Production stage
FROM node:18-alpine AS runner

# Install pnpm
RUN npm install -g pnpm@10.0.0

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built files from builder
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json

# Copy drizzle migrations if they exist
COPY --from=builder /app/apps/server/drizzle ./apps/server/drizzle 2>/dev/null || true

# Set permissions
RUN chown -R hono:nodejs /app

# Switch to non-root user
USER hono

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "apps/server/dist/index.js"]
