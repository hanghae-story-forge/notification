# 똥글똥글 API 문서화 FACTS

- **Scope**: Hono 기반 API 서버 전체 구조
- **Source of Truth**: 소스 코드 및 Drizzle 스키마
- **Last Verified**: 2025-01-05
- **Repo Ref**: f32413325de67a3ad1bde6649d16474d236d164b

## 개요

똥글똥글 (Donguel-Donguel)은 격주 글쓰기 모임 자동화 API 서버입니다. 멤버들이 GitHub Issue 댓글로 블로그 포스트를 제출하면, 시스템이 이를 추적하고 Discord 알림을 전송합니다.

## 문서 구조

### [routes/](./routes/)
- **[github.md](./routes/github.md)** - GitHub 웹훅 핸들러 (이슈 생성, 댓글 처리)
- **[reminder.md](./routes/reminder.md)** - 리마인더 API (n8n 워크플로우용)
- **[status.md](./routes/status.md)** - 제출 현황 API (Discord 봇용)

### [database/](./database/)
- **[schema.md](./database/schema.md)** - 데이터베이스 스키마 정의 (members, generations, cycles, submissions)

### [services/](./services/)
- **[discord.md](./services/discord.md)** - Discord 웹훅 메시지 생성 및 전송 서비스

### [config/](./config/)
- **[environment.md](./config/environment.md)** - 환경변수 설정 및 검증

## 기술 스택

- **Framework**: Hono (TypeScript web framework)
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **API Documentation**: OpenAPI 3.0 (@hono/zod-openapi)
- **External Integrations**: GitHub Webhooks, Discord Webhooks, n8n workflows

## 핵심 엔드포인트

| 경로 | 메서드 | 목적 |
|------|--------|------|
| `/webhook/github` | POST | GitHub 웹훅 수신 (이슈/댓글 이벤트) |
| `/api/reminder` | GET | 마감 임박 사이클 조회 |
| `/api/reminder/{cycleId}/not-submitted` | GET | 미제출자 목록 조회 |
| `/api/reminder/send-reminders` | POST | 리마인더 알림 발송 |
| `/api/status/{cycleId}` | GET | 제출 현황 조회 (JSON) |
| `/api/status/{cycleId}/discord` | GET | 제출 현황 조회 (Discord 포맷) |
| `/graphql` | GET/POST | GraphQL 엔드포인트 |

## 데이터 모델 관계도

```
generations (기수)
    ↓ 1:N
cycles (회차/주차)
    ↓ 1:N
submissions (제출 기록)
    ↓ N:1
members (멤버)

generation_members (기수-멤버 조인 테이블)
    ↓ N:1 (generations)
    ↓ N:1 (members)
```

## 외부 통합

### GitHub Webhook
- **Event Types**: `issue_comment` (created), `issues` (opened)
- **Purpose**: 이슈 생성 시 회차 자동 생성, 댓글 작성 시 제출 기록

### Discord Webhook
- **Purpose**: 제출 알림, 마감 리마인더, 현황 공유
- **Formats**: Embed 메시지 (컬러, 필드, 타임스탬프)

### n8n Workflows
- **Purpose**: 주기적 리마인더 발송 (cron job)
- **Endpoints**: `/api/reminder?hoursBefore=N`, `/api/reminder/send-reminders`

---

**Metadata Version**: 1.0.0
**Created**: 2025-01-05T10:00:00Z
**Git Commit**: f32413325de67a3ad1bde6649d16474d236d164b
