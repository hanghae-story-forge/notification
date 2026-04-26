# Deployment

## Current production hosting

The `notification` server is deployed on **Render**.

- Production service URL: <https://donguel-donguel-notification.onrender.com>
- Health check: <https://donguel-donguel-notification.onrender.com/health>
- GitHub repository: `hanghae-story-forge/notification`
- Runtime shape: single server container built from `apps/server/Dockerfile`

GitHub deployment records show Render-managed PR preview environments using this naming pattern:

```txt
https://donguel-donguel-notification-pr-<PR_NUMBER>.onrender.com
```

Render Dashboard deploy/log URLs are attached to GitHub deployment statuses as `target_url` / `log_url`.

## Deployment flow

```txt
feature branch
  -> push to GitHub
  -> open PR to main
  -> GitHub Actions CI runs lint/type-check/build/test
  -> Render creates a PR preview deployment
  -> merge PR into main
  -> Render deploys production service
  -> verify /health
```

The repository does not currently use GitHub Actions to deploy production directly. GitHub Actions are used for validation only:

- `.github/workflows/ci.yml`
- `.github/workflows/docker-build-test.yml`

Production deployment is handled by Render's GitHub integration.

## Required production environment variables

Render must provide the runtime environment variables validated in `apps/server/src/env.ts`.

Required for production runtime:

```txt
DATABASE_URL
DISCORD_BOT_TOKEN
DISCORD_CLIENT_ID
DISCORD_GUILD_ID
NODE_ENV=production
APP_ENV=production
```

Optional or feature-specific:

```txt
DISCORD_WEBHOOK_URL
APP_ID
APP_PRIVATE_KEY
APP_INSTALLATION_ID
DISCORD_OAUTH_CLIENT_ID
DISCORD_OAUTH_CLIENT_SECRET
DISCORD_OAUTH_REDIRECT_URI
JWT_SECRET
JWT_EXPIRES_IN
JWT_ISSUER
JWT_AUDIENCE
```

Do not commit secret values. Keep them in Render's Environment settings.

## Database migrations

Drizzle migrations live under:

```txt
apps/server/drizzle
```

The server Docker image runs pending Drizzle migrations before starting the application process:

```bash
node_modules/.bin/drizzle-kit migrate --config apps/server/drizzle.config.ts
node apps/server/.pylon/index.js
```

This means a Render production deploy applies pending migrations using Render's `DATABASE_URL` before the app starts.

Important notes:

1. Migrations must be backward-compatible with the currently running application where possible.
2. `apps/server/drizzle` is ignored by `.gitignore`, so new migration files may require forced staging:

   ```bash
   git add -f apps/server/drizzle
   ```

3. Before merging to `main`, verify locally:

   ```bash
   export PATH="$HOME/.hermes/node/bin:$PATH"
   pnpm type-check
   pnpm test
   pnpm --filter @hanghae-study/server test:coverage:study-operations
   git diff --check
   ```

## Post-deploy verification

After Render deploys production, verify:

```bash
curl -fsS https://donguel-donguel-notification.onrender.com/health
```

Expected shape:

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "..."
}
```

Also check:

```bash
curl -fsS https://donguel-donguel-notification.onrender.com/
```

Expected shape:

```json
{
  "status": "ok",
  "message": "똥글똥글 API"
}
```
