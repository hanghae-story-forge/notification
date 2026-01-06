# Apps Server Facts

This directory contains detailed documentation for the apps/server module extracted from the actual codebase.

## Structure

- [domain/](domain/) - Domain entities, value objects, and repository interfaces
  - [organization.md](domain/organization.md) - Organization aggregate root
  - [organization-member.md](domain/organization-member.md) - Organization-Member relationship entity
  - [auth.md](domain/auth.md) - JWT authentication domain
  - [member.md](domain/member.md) - Member aggregate root
  - [cycle.md](domain/cycle.md) - Cycle aggregate root
  - [generation.md](domain/generation.md) - Generation aggregate root
  - [submission.md](domain/submission.md) - Submission aggregate root

- [application/](application/) - CQRS handlers
  - [commands.md](application/commands.md) - Command handlers (write operations)
  - [queries.md](application/queries.md) - Query handlers (read operations)
  - [event-handlers.md](application/event-handlers.md) - Domain event handlers

- [presentation/](presentation/) - API layer
  - [http.md](presentation/http.md) - HTTP REST API routes
  - [graphql.md](presentation/graphql.md) - Pylon GraphQL API
  - [discord.md](presentation/discord.md) - Discord bot slash commands

- [infrastructure/](infrastructure/) - External dependencies
  - [persistence.md](infrastructure/persistence.md) - Drizzle ORM repositories
  - [jwt.md](infrastructure/jwt.md) - JWT service implementation
  - [external.md](infrastructure/external.md) - Discord and GitHub clients

- [database/](database/) - Database schema
  - [schema.md](database/schema.md) - PostgreSQL schema documentation

## Metadata

- **Last Verified**: 2025-01-07
- **Git Commit**: 82509c3098d10848b4ac6fcb83e1c285cbaeb0c3
- **Source**: apps/server/src/

## Quick Reference

### Multi-Tenant Architecture

```
Organization (1)
  ├── Generations (N)
  │     └── Cycles (N)
  │           └── Submissions (N)
  └── OrganizationMembers (N) ←→ Members (N)
```

### Key Commands

- Create Organization: `CreateOrganizationCommand`
- Join Organization: `JoinOrganizationCommand`
- Create Cycle: `CreateCycleCommand`
- Record Submission: `RecordSubmissionCommand`

### Key Queries

- Get Organization: `GetOrganizationQuery`
- Get Cycle Status: `GetCycleStatusQuery`
- Get Current Cycle: `GetCycleStatusQuery.getCurrentCycle()`
- Get Reminder Targets: `GetReminderTargetsQuery`

### API Endpoints

- GitHub Webhook: `POST /webhook/github`
- Reminder API: `GET /api/reminder`
- Status API: `GET /api/status/:cycleId`
- GraphQL: `/graphql` (Pylon)
- Discord Bot: `/check-submission`, `/current-cycle`
