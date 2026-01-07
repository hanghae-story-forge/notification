# 똥글똥글 (Lome) Server - Complete Technical Facts

- **Project**: 똥글똥글 (Donguel-Donguel) - Bi-weekly writing group automation system
- **Scope**: apps/server
- **Architecture**: Domain-Driven Design (DDD) + CQRS + Clean Architecture
- **Last Verified**: 2026-01-07
- **Repo Ref**: 9164ce1

## Quick Navigation

- [Domain Layer](./domain/index.md) - Entities, value objects, aggregates
- [Application Layer](./application/index.md) - Commands, queries, event handlers
- [Infrastructure Layer](./infrastructure/index.md) - Database, persistence, external services
- [Presentation Layer](./presentation/index.md) - HTTP, GraphQL, Discord bot

---

## Project Overview

똥글똥글 is an automation API server for a bi-weekly writing group where members:
1. Submit blog posts via GitHub Issue comments
2. System tracks submissions per cycle (week)
3. Discord notifications are sent for submissions and reminders

**Tech Stack**:
- **Framework**: Hono (TypeScript web framework)
- **Database**: PostgreSQL + Drizzle ORM
- **API**: REST (HTTP/HTTPS), GraphQL (Pylon)
- **Integration**: GitHub Webhooks, Discord Bot/Webhooks
- **Architecture**: DDD (Domain-Driven Design)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  HTTP Routes │  │   GraphQL    │  │    Discord Bot       │ │
│  │  (Hono)      │  │   (Pylon)    │  │    (discord.js)      │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘ │
└─────────┼──────────────────┼─────────────────────┼─────────────┘
          │                  │                     │
          ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐          ┌──────────────────────┐        │
│  │    Commands      │          │       Queries         │        │
│  │  (Write Ops)     │          │    (Read Ops)         │        │
│  └────────┬─────────┘          └──────────┬───────────┘        │
│           │                                │                     │
│           └────────────┬───────────────────┘                     │
│                        ▼                                         │
│           ┌─────────────────────────────┐                       │
│           │      Event Handlers         │                       │
│           └─────────────────────────────┘                       │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │   Entities   │  │ Value Objects│  │   Domain Services    │ │
│  │ (Aggregates) │  │   (Immutable)│  │   (Business Logic)   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────┘ │
│         │                  │                                     │
│         └──────────┬───────┘                                     │
│                    ▼                                             │
│           ┌─────────────────────────────┐                       │
│           │    Repository Interfaces     │                       │
│           └─────────────────────────────┘                       │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  Drizzle ORM     │  │  Discord Webhook │  │  GitHub Webhook│  │
│  │  (PostgreSQL)    │  │  Client          │  │  Handlers     │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Domain Model

### Aggregates

| Aggregate | Root Entity | Boundaries | Key Relationships |
|-----------|-------------|------------|-------------------|
| **Member** | Member | Member ID | Has many OrganizationMembers, has many Submissions |
| **Cycle** | Cycle | Cycle ID | Belongs to Generation, has many Submissions |
| **Generation** | Generation | Generation ID | Belongs to Organization, has many Cycles |
| **Submission** | Submission | Submission ID | References Member, Cycle |
| **Organization** | Organization | Organization ID | Has many Generations, has many OrganizationMembers |

### Entity Relationships

```
Organization (1)
  ├── (1:N) Generation
  │    └── (1:N) Cycle
  │         └── (1:N) Submission
  └── (1:N) OrganizationMember
       └── (N:1) Member

Member (1)
  ├── (1:N) OrganizationMember
  │    └── (N:1) Organization
  └── (1:N) Submission
       └── (N:1) Cycle
```

---

## Database Schema

### Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `organizations` | Study groups | id, name, slug (unique), discordWebhookUrl |
| `members` | Members | id, discordId (unique), githubUsername, name |
| `generations` | Cohorts/periods | id, organizationId (FK), name, startedAt, isActive |
| `cycles` | Weekly cycles | id, generationId (FK), week, startDate, endDate, githubIssueUrl |
| `organization_members` | Org membership | id, organizationId (FK), memberId (FK), role, status |
| `submissions` | Blog submissions | id, cycleId (FK), memberId (FK), url, githubCommentId (unique) |

### Important Notes

- `githubUsername` is **no longer unique** in `members` table (can be shared across organizations)
- `organization_members` replaces `generation_members` (deprecated)
- `submissions.githubCommentId` is unique (prevents duplicate submissions)

---

## Key Workflows

### 1. Member Submission Flow

```
GitHub Issue Comment
  ↓
POST /webhook/github (issue_comment event)
  ↓
RecordSubmissionCommand
  ├→ Find Cycle by GitHub Issue URL
  ├→ Find Member by GitHub Username
  ├→ Verify Member is Active in Organization
  ├→ Validate No Duplicate
  ├→ Create Submission Entity
  └→ Send Discord Notification
```

### 2. Cycle Creation Flow

```
GitHub Issue Created
  ↓
POST /webhook/github (issues event)
  ↓
CreateCycleCommand
  ├→ Parse Week from Title
  ├→ Parse Deadline from Body
  ├→ Find Organization & Active Generation
  ├→ Validate No Duplicate Week
  └→ Create Cycle Entity
```

### 3. Reminder Flow

```
Scheduled Job (n8n/GitHub Actions)
  ↓
POST /api/reminder/send-reminders
  ↓
GetReminderTargetsQuery
  ├→ Find Cycles with Deadline in Range
  └→ For Each Cycle:
      ├→ Get Not-Submitted Members
      └→ Send Discord Notification
```

---

## API Endpoints Summary

### HTTP Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| POST | `/webhook/github` | GitHub webhook |
| GET | `/api/reminder` | Get upcoming deadlines |
| GET | `/api/reminder/:cycleId/not-submitted` | Get not-submitted members |
| POST | `/api/reminder/send-reminders` | Send reminders |
| GET | `/api/status/current` | Get current cycle |
| GET | `/api/status/current/discord` | Get current cycle (Discord format) |
| GET | `/api/status/:cycleId` | Get cycle status |
| GET | `/api/status/:cycleId/discord` | Get cycle status (Discord format) |

### Discord Bot Commands

| Command | Purpose |
|---------|---------|
| `/register` | Register as member |
| `/join-organization` | Join organization |
| `/create-organization` | Create organization |
| `/approve-member` | Approve member (admin) |
| `/join-generation` | Join generation |
| `/cycle-status` | Show submission status |
| `/current-cycle` | Show current cycle |
| `/check-submission` | Check your submission |
| `/list-organizations` | List all organizations |

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://localhost:5432/dongueldonguel` |
| `DISCORD_BOT_TOKEN` | Discord bot token | `MTI...` |
| `DISCORD_CLIENT_ID` | Discord application ID | `123456789` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `DISCORD_WEBHOOK_URL` | Discord webhook for notifications | - |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | - |
| `JWT_EXPIRES_IN` | JWT expiration | `7d` |

---

## Development Commands

```bash
# Development
pnpm install              # Install dependencies
pnpm dev                  # Start dev server with hot reload
pnpm build                # Compile TypeScript
pnpm start                # Run compiled JS

# Database
pnpm db:generate          # Generate migrations from schema
pnpm db:migrate           # Run migrations
pnpm db:push              # Push schema directly (dev only)
pnpm db:studio            # Open Drizzle Studio

# Code Quality
pnpm lint                 # Run ESLint
pnpm lint:fix             # Auto-fix ESLint issues
pnpm format               # Format with Prettier
```

---

## Metadata

- **Last Verified**: 2026-01-07
- **Git Commit**: 9164ce1283112dd34a47ff830c0679e7128506d5
- **Source**: apps/server/src/
- **Architecture**: DDD + CQRS + Clean Architecture
- **Tech Stack**: Hono, TypeScript, Drizzle ORM, PostgreSQL, Discord.js
