# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

똥글똥글 (Donguel-Donguel) is an automation API server for a bi-weekly writing group. Members submit their blog posts via GitHub Issue comments, and the system tracks submissions and sends Discord notifications.

**Stack**: Hono (web framework), TypeScript, Drizzle ORM, PostgreSQL.

## Development Commands

```bash
# Development
pnpm install              # Install dependencies (uses pnpm)
pnpm dev                  # Start dev server with hot reload (tsx watch)
pnpm build                # Compile TypeScript
pnpm start                # Run compiled JS

# Database
pnpm db:generate          # Generate migrations from schema changes
pnpm db:migrate           # Run migrations
pnpm db:push              # Push schema directly (dev only)
pnpm db:studio            # Open Drizzle Studio for DB inspection

# Code quality
pnpm lint                 # Run ESLint
pnpm lint:fix             # Auto-fix ESLint issues
pnpm format               # Format with Prettier
pnpm format:check         # Check formatting
```

## Architecture

### Entry Point
[index.ts](src/index.ts) - Initializes Hono app, sets up CORS, and mounts route handlers. Serves on port from `PORT` env (default 3000).

### Database Schema
[db/schema.ts](src/db/schema.ts) - Four core tables:
- `members` - Group members (GitHub username, Discord ID, name)
- `generations` - Cohort/Class periods (e.g., "똥글똥글 1기")
- `cycles` - Weekly submission periods linked to a generation, with GitHub Issue URL
- `submissions` - Member blog post submissions per cycle

**Important**: Currently, there's no direct `generations-members` join table. All members are considered global. See [routes/reminder.ts:63](src/routes/reminder.ts#L63) TODO.

### Route Handlers

**GitHub Webhook** ([routes/github.ts](src/routes/github.ts))
- `POST /webhook/github` - Receives GitHub Issue comment events
  - Extracts URL from comment (first http/https link)
  - Finds matching cycle by GitHub Issue URL
  - Records submission (dedupes by `githubCommentId`)
  - Sends Discord notification if `DISCORD_WEBHOOK_URL` is set

**Reminder API** ([routes/reminder.ts](src/routes/reminder.ts)) - Called by n8n workflows
- `GET /api/reminder?hoursBefore=N` - Returns cycles with deadlines within N hours
- `GET /api/reminder/:cycleId/not-submitted` - Returns members who haven't submitted

**Status API** ([routes/status.ts](src/routes/status.ts)) - For Discord bot commands
- `GET /api/status/:cycleId` - Returns submission status (JSON)
- `GET /api/status/:cycleId/discord` - Returns status formatted as Discord webhook payload

### Services

[services/discord.ts](src/services/discord.ts) - Message formatting and webhook sending:
- `createSubmissionMessage()` - New submission notification
- `createReminderMessage()` - Deadline reminder with time remaining
- `createStatusMessage()` - Full submission status report
- `sendDiscordWebhook()` - Sends payload to Discord webhook URL

### Database Access

[lib/db.ts](src/lib/db.ts) - Drizzle instance with postgres.js client. Connection string from `DATABASE_URL` env (defaults to `postgresql://localhost:5432/dongueldonguel`).

## Environment Variables

```env
DATABASE_URL=postgresql://localhost:5432/dongueldonguel
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
PORT=3000
```

## Code Style

- ESLint with TypeScript + Prettier
- Semi-colons required
- Single quotes
- 2-space indent
- Unused vars with `_` prefix are allowed
- `@typescript-eslint/no-explicit-any` is warned (not error)

## Key Integration Points

**n8n Workflows**:
- Reminder workflows query `/api/reminder` endpoints periodically
- Status workflows use `/api/status/:cycleId/discord` for Discord bot responses

**GitHub Webhook**: Configure on target repo settings, listening for "Issue comments" > "Comment created" events.
