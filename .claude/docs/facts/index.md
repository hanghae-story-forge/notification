---
metadata:
  version: "2.0.0"
  created_at: "2026-01-05T10:00:00Z"
  last_verified: "2026-01-05T10:00:00Z"
  git_commit: "ac29965"
  project: "똥글똥글 (Donguel-Donguel)"
  description: "격주 글쓰기 모임 자동화 API 서버 - DDD Architecture"
  source_files:
    src/index.ts:
      git_hash: "ac29965"
      source_exists: true
    src/domain/:
      git_hash: "ac29965"
      source_exists: true
    src/application/:
      git_hash: "ac29965"
      source_exists: true
    src/infrastructure/:
      git_hash: "ac29965"
      source_exists: true
    src/presentation/:
      git_hash: "ac29965"
      source_exists: true
---

# FACTS - 똥글똥글 (Donguel-Donguel) Codebase Documentation

## 프로젝트 개요

똥글똥글은 격주 글쓰기 모임의 자동화를 위한 API 서버입니다. 회원들이 GitHub Issue 댓글로 블로그 글을 제출하면, 시스템이 이를 기록하고 Discord로 알림을 발송합니다.

**Tech Stack**:
- **Framework**: Hono (TypeScript web framework)
- **Database**: PostgreSQL with Drizzle ORM
- **External Integrations**: Discord (webhook & bot), GitHub (webhook)
- **Architecture**: Domain-Driven Design (DDD)

## DDD 아키텍처 개요

이 프로젝트는 4계층 DDD 아키텍처를 따릅니다:

```
src/
├── domain/              # 도메인 계층 - 비즈니스 로직과 엔티티
├── application/         # 애플리케이션 계층 - 유스케이스 (Command/Query)
├── infrastructure/      # 인프라스트럭처 계층 - DB, 외부 서비스 연동
└── presentation/        # 프레젠테이션 계층 - HTTP, Discord, GraphQL
```

### 계층별 책임

1. **Domain Layer (`domain/`)**: 비즈니스 로직, 엔티티, 값 객체, 리포지토리 인터페이스
2. **Application Layer (`application/`)**: 유스케이스 구현 (Command, Query, Event Handlers)
3. **Infrastructure Layer (`infrastructure/`)**: 기술적 구현 (DB, 외부 API, 라이브러리)
4. **Presentation Layer (`presentation/`)**: 외부 인터페이스 (HTTP routes, Discord bot, GraphQL)

## 도메인 모델

### 핵심 도메인 (Bounded Contexts)

1. **Member Domain**: 회원 (GitHub username, Discord ID, 이름)
2. **Generation Domain**: 기수 (똥글똥글 1기, 2기...)
3. **Cycle Domain**: 주차 사이클 (1주차, 2주차...)
4. **Submission Domain**: 제출 (회원별 블로그 글 제출 기록)

### 도메인 관계

```
Generation (1) ──────< (N) Cycle (1) ──────< (N) Submission
                       │
                       └─────────────< (N) Member (global)
```

## 문서 구조

### Domain Layer
- [domain/member.md](./domain/member.md) - 회원 도메인
- [domain/generation.md](./domain/generation.md) - 기수 도메인
- [domain/cycle.md](./domain/cycle.md) - 사이클 도메인
- [domain/submission.md](./domain/submission.md) - 제출 도메인

### Application Layer
- [application/commands.md](./application/commands.md) - Command (상태 변경 유스케이스)
- [application/queries.md](./application/queries.md) - Query (상태 조회 유스케이스)
- [application/event-handlers.md](./application/event-handlers.md) - Event Handlers

### Infrastructure Layer
- [infrastructure/persistence.md](./infrastructure/persistence.md) - DB 스키마 및 리포지토리 구현
- [infrastructure/external.md](./infrastructure/external.md) - 외부 연동 (Discord, GitHub)

### Presentation Layer
- [presentation/http.md](./presentation/http.md) - HTTP Routes (GitHub webhook, Reminder, Status)
- [presentation/discord.md](./presentation/discord.md) - Discord Bot
- [presentation/graphql.md](./presentation/graphql.md) - GraphQL API

## 빠른 참조

### 주요 엔드포인트

| 경로 | 메서드 | 목적 |
|------|--------|------|
| `/health` | GET | Docker 헬스체크 (DB 연결 확인) |
| `/` | GET | 루트 엔드포인트 (서버 상태) |
| `/webhook/github` | POST | GitHub 웹훅 수신 (이슈/댓글 이벤트) |
| `/api/reminder` | GET | 마감 임박 사이클 조회 |
| `/api/reminder/{cycleId}/not-submitted` | GET | 미제출자 목록 조회 |
| `/api/reminder/send-reminders` | POST | 리마인더 알림 발송 |
| `/api/status/current` | GET | 현재 진행중인 사이클 조회 |
| `/api/status/current/discord` | GET | 현재 사이클 제출 현황 (Discord 포맷) |
| `/api/status/{cycleId}` | GET | 제출 현황 조회 (JSON) |
| `/api/status/{cycleId}/discord` | GET | 제출 현황 조회 (Discord 포맷) |
| `/graphql` | GET/POST | GraphQL 엔드포인트 |

### 환경변수

```env
DATABASE_URL=postgresql://localhost:5432/dongueldonguel
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_BOT_TOKEN=...
DISCORD_CLIENT_ID=...
DISCORD_GUILD_ID=... (optional, for guild commands)
GITHUB_APP_WEBHOOK_SECRET=... (optional)
PORT=3000
```

## 개발 커맨드

```bash
pnpm install              # 의존성 설치
pnpm dev                  # 개발 서버 실행 (hot reload)
pnpm build                # TypeScript 빌드
pnpm start                # 빌드된 코드 실행

pnpm db:generate          # Migration 생성
pnpm db:migrate           # Migration 실행
pnpm db:push              # 스키마 직접 push (개발용)
pnpm db:studio            # Drizzle Studio 실행
```

## 아키텍처 원칙

1. **의존성 방향**: 상위 계층(Presentation/Application) → 하위 계층(Domain)
2. **인터페이스 분리**: Domain 계층에서 리포지토리 인터페이스 정의, Infrastructure에서 구현
3. **도메인 이벤트**: 중요한 비즈니스 이벤트를 도메인 계층에서 발행
4. **CQRS**: Command(상태 변경)와 Query(상태 조회) 분리

## Git 커밋 참조

- **Current Commit**: `ac29965` - "refactor: Consolidate Presentation Layer into unified presentation/ directory"
- **Base Branch**: `BBAK-jun/gwangju`

## 변경 이력

### v2.0.0 (2026-01-05)
- DDD 아키텍처로 완전 리팩토링
- 4계층 구조 도입 (Domain, Application, Infrastructure, Presentation)
- CQRS 패턴 적용 (Command/Query 분리)
- 도메인 이벤트 기반 알림 시스템
- GraphQL API 추가
- Discord Bot 슬래시 명령어 추가

### v1.0.0
- 초기 Hono 기반 API 구현
- GitHub Webhook 연동
- Discord Webhook 알림
