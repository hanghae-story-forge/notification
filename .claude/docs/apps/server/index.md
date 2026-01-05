# Server App Documentation

- **App Name**: @dongueldonguel/server
- **Description**: 격주 글쓰기 모임 자동화 API 서버
- **Framework**: Hono (TypeScript)
- **Architecture**: Domain-Driven Design (DDD)
- **Last Updated**: 2025-01-05

## Overview

똥글똥글 서버 앱은 격주 글쓰기 모임의 자동화를 위한 API 서버입니다. 회원들이 GitHub Issue 댓글로 블로그 글을 제출하면, 시스템이 이를 기록하고 Discord로 알림을 발송합니다.

## Tech Stack

- **Framework**: Hono (TypeScript web framework)
- **Database**: PostgreSQL with Drizzle ORM
- **External Integrations**: Discord (webhook & bot), GitHub (webhook)
- **Architecture**: Domain-Driven Design (DDD)
- **API**: REST + GraphQL (Pylon)

## Documentation Navigation

### Technical Facts
- [Domain Models](./facts/domain/) - 도메인 엔티티 및 값 객체
- [Application Layer](./facts/application/) - CQRS Commands/Queries
- [Presentation Layer](./facts/presentation/) - HTTP, GraphQL, Discord
- [Infrastructure](./facts/infrastructure/) - Database, External services
- [Full Facts Index](./facts/index.md)

### Business Insights
- [Operations Analysis](./insights/operations/) - 시스템 운영 분석
- [Impact Analysis](./insights/impact/) - 비즈니스 영향 분석
- [Full Insights Index](./insights/index.md)

### Feature Specifications
- [GitHub Webhook](./specs/github-webhook.md)
- [Discord Notifications](./specs/discord-notifications.md)
- [Reminder System](./specs/reminder-system.md)
- [DDD Architecture](./specs/ddd-architecture.md)
- [Full Specs Index](./specs/index.md)

## Quick Reference

### Main Endpoints

| Path | Method | Purpose |
|------|--------|---------|
| `/health` | GET | Health check |
| `/webhook/github` | POST | GitHub webhook |
| `/api/reminder` | GET | Upcoming deadlines |
| `/api/status/{cycleId}` | GET | Submission status |
| `/graphql` | GET/POST | GraphQL API |

### Development

```bash
# From workspace root
pnpm dev --filter=@dongueldonguel/server

# Database migrations
pnpm db:migrate
```

### Environment Variables

```env
DATABASE_URL=postgresql://localhost:5432/dongueldonguel
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
PORT=3000
```
