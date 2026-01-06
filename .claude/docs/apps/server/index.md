# 똥글똥글 Server API Documentation

- **Scope**: apps/server
- **Type**: NestJS-style DDD Architecture with Hono
- **Last Verified**: 2025-01-07
- **Repo Ref**: 82509c3
- **Stack**: Hono, TypeScript, Drizzle ORM, PostgreSQL

## Project Overview

똥글똥글은 격주 글쓰기 모임 자동화 시스템입니다. 멤버들은 GitHub Issue 댓글로 블로그 글을 제출하고, 시스템이 이를 기록하여 Discord 알림을 발송합니다. 최근 멀티 테넌트 아키텍처로 전환하여 여러 스터디 그룹(조직)을 지원합니다.

## Architecture

### DDD Layer Structure

```
apps/server/src/
├── domain/                    # 도메인 계층 (DDD)
│   ├── organization/         # 조직 도메인 (멀티 테넌트)
│   ├── organization-member/  # 조직원 도메인
│   ├── auth/                # JWT 인증 도메인
│   ├── member/              # 회원 도메인
│   ├── cycle/               # 사이클 도메인
│   ├── generation/          # 기수 도메인
│   └── submission/          # 제출 도메인
├── application/              # 애플리케이션 계층 (CQRS)
│   ├── commands/            # Command Handlers (쓰기)
│   ├── queries/             # Query Handlers (읽기)
│   └── event-handlers/      # Domain Event Handlers
├── presentation/             # 프레젠테이션 계층
│   ├── http/                # Hono HTTP Routes
│   │   ├── github/          # GitHub Webhook
│   │   ├── reminder/        # Reminder API (n8n)
│   │   └── status/          # Status API (Discord bot)
│   ├── graphql/             # Pylon GraphQL
│   └── discord/             # Discord Bot (Slash Commands)
└── infrastructure/           # 인프라 계층
    ├── persistence/         # Drizzle ORM
    ├── jwt/                 # JWT Service
    └── external/            # Discord, GitHub
```

### Key Patterns

1. **Domain-Driven Design (DDD)**: 도메인 로직을 풍부한 엔티티와 값 객체로 캡슐화
2. **CQRS**: Command(쓰기)와 Query(읽기) 분리
3. **Repository Pattern**: 도메인 리포지토리 인터페이스와 인프라 구현체 분리
4. **Domain Events**: 도메인 이벤트 발행 및 핸들링
5. **Multi-Tenancy**: 조직(organization) 단위로 데이터 격리

## Core Domains

### Organization (조직)

스터디 그룹을 나타내는 최상위 단위. 여러 기수(generation)를 가질 수 있으며 각 기수는 여러 사이클(cycle)로 구성됩니다.

- **Slug**: URL 친화적인 식별자 (예: dongueldonguel, saechbalclub)
- **Discord Webhook**: 제출 알림을 받을 Discord 웹훅 URL
- **Active Status**: 활성/비활성화 상태 관리

### Member (회원)

Discord ID를 기반으로 한 회원. 여러 조직에 속할 수 있으며 각 조직에서 역할(OWNER/ADMIN/MEMBER)과 상태(PENDING/APPROVED/REJECTED/INACTIVE)를 가집니다.

- **Discord ID**: 고유 식별자 (Snowflake ID)
- **GitHub Username**: 선택적, 여러 조직에서 중복 사용 가능
- **Name**: 회원 실명

### Generation (기수)

조직의 기간 단위. 예: "똥글똥글 1기", "새발클 3기"

- **Organization**: 조직에 속함 (다대일)
- **Active Status**: 조직별 하나의 활성화된 기수만 존재
- **Started At**: 기수 시작일

### Cycle (사이클/주차)

격주 글쓰기 주차. 예: "1주차", "2주차"

- **Generation**: 기수에 속함 (다대일)
- **Week**: 주차 번호 (1, 2, 3...)
- **Date Range**: 시작일/종료일 (기본 7일간)
- **GitHub Issue URL**: 제출용 GitHub Issue 링크

### Submission (제출)

회원의 블로그 글 제출. GitHub Issue 댓글로 자동 기록됩니다.

- **Cycle**: 사이클에 속함 (다대일)
- **Member**: 회원의 제출 (다대일)
- **Blog URL**: 블로그 글 URL
- **GitHub Comment ID**: 중복 제출 방지용

## API Endpoints

### HTTP REST API

#### GitHub Webhook
- `POST /webhook/github` - GitHub Issue/Comment 이벤트 수신

#### Reminder API (n8n Workflows)
- `GET /api/reminder?hoursBefore=N` - N시간 내 마감 사이클 목록
- `GET /api/reminder/:cycleId/not-submitted` - 미제출자 목록

#### Status API (Discord Bot)
- `GET /api/status/:cycleId` - 제출 현황 (JSON)
- `GET /api/status/:cycleId/discord` - 제출 현황 (Discord webhook payload)

### GraphQL API (Pylon)

- **Queries**: `members`, `member`, `generations`, `generation`, `cycles`, `cycle`, `activeCycle`, `cycleStatus`
- **Mutations**: `addMember`, `addGeneration`, `addCycle`, `addSubmission` (webhook 사용 권장)

### Discord Bot Commands

- `/check-submission` - 현재 주차 제출 현황 확인
- `/current-cycle` - 현재 진행 중인 주차 정보 확인

## Workflows

### 1. 제출 기록 흐름

```
GitHub Issue Comment → Webhook → RecordSubmissionCommand
  → Submission 생성 → Domain Event → Discord 알림
```

1. 회원이 GitHub Issue에 댓글 작성 (URL 포함)
2. GitHub Webhook 수신 (`handleIssueComment`)
3. `RecordSubmissionCommand` 실행:
   - Issue URL로 Cycle 조회
   - GitHub Username으로 Member 조회
   - Member가 해당 Organization의 활성 멤버인지 확인
   - Submission 생성 및 저장
4. `SubmissionRecordedEvent` 발행 → Discord 알림 전송

### 2. 사이클 생성 흐름

```
GitHub Issue 생성 → Webhook → CreateCycleCommand
  → Cycle 생성 → 저장
```

1. 관리자가 GitHub Issue 생성 (주차 패턴 포함)
2. GitHub Webhook 수신 (`handleIssues`)
3. Issue 제목에서 주차 번호 추출
4. Issue 본문에서 마감일 추출
5. `CreateCycleCommand` 실행:
   - 조직의 활성화된 기수 조회
   - 중복 주차 검사
   - Cycle 생성 및 저장

### 3. Discord Bot 제출 현황 조회

```
Discord Slash Command → GetCycleStatusQuery
  → DB 조회 → Discord 메시지 생성 → 응답
```

1. 사용자가 `/check-submission` 실행
2. `GetCycleStatusQuery.getCurrentCycle()`로 현재 사이클 조회
3. `GetCycleStatusQuery.getCycleParticipantNames()`로 제출 현황 조회
4. Discord 메시지 포맷팅 (`createStatusMessage`)
5. 응답 전송

## Environment Variables

```env
DATABASE_URL=postgresql://localhost:5432/dongueldonguel
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
PORT=3000

# Discord Bot (선택)
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_CLIENT_ID=your-client-id
DISCORD_GUILD_ID=your-guild-id
```

## Database Migration

```bash
# Drizzle ORM 사용
pnpm db:generate  # 마이그레이션 파일 생성 (schema.ts로부터)
pnpm db:migrate   # 마이그레이션 실행
pnpm db:push      # 개발용: 스키마 직접 푸시
pnpm db:studio    # Drizzle Studio 실행 (DB GUI)
```

## Recent Changes (Multi-Tenancy)

1. **New Domain**: Organization, OrganizationMember
2. **Database Schema**: 
   - `organizations` 테이블 추가
   - `organization_members` 테이블 추가 (기존 `generation_members` 대체)
   - `generations` 테이블에 `organization_id` FK 추가
3. **Auth**: JWT 기반 인증 추가 (Discord OAuth)
4. **GitHub Username**: 더 이상 unique 아님 (여러 조직에서 사용 가능)
5. **Query/Command**: 모든 조회/생성 로직에 조직 식별 추가

## Documentation Files

Detailed documentation for each layer:

- [Domain Models](facts/domain/) - 도메인 엔티티 및 값 객체
- [Command Handlers](facts/application/commands.md) - CQRS Commands
- [Query Handlers](facts/application/queries.md) - CQRS Queries
- [Event Handlers](facts/application/event-handlers.md) - Domain Event Handlers
- [HTTP Routes](facts/presentation/http.md) - REST API 엔드포인트
- [Discord Bot](facts/presentation/discord.md) - Discord Slash Commands
- [GraphQL API](facts/presentation/graphql.md) - Pylon GraphQL API
- [Persistence](facts/infrastructure/persistence.md) - Drizzle ORM 리포지토리
- [External Services](facts/infrastructure/external.md) - Discord, GitHub
- [JWT Service](facts/infrastructure/jwt.md) - JWT 인증 구현
- [Database Schema](facts/database/schema.md) - PostgreSQL 스키마

## References

- **Repository**: [github.com/dongueldonguel/papeete](https://github.com/dongueldonguel/papeete)
- **Commit**: 82509c3098d10848b4ac6fcb83e1c285cbaeb0c3
- **Last Updated**: 2025-01-07
