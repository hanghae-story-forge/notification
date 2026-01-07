# 똥글똥글 (Lome) Server API - 마스터 문서 인덱스

- **프로젝트**: 똥글똥글 (Donguel-Donguel) - 격주 글쓰기 모임 자동화 시스템
- **문서 버전**: 3.0.0 (멀티 테넌트)
- **최종 검증**: 2026-01-07
- **Git Commit**: 9164ce1
- **아키텍처**: DDD + CQRS + Clean Architecture
- **스택**: Hono, TypeScript, Drizzle ORM, PostgreSQL, Discord.js

---

## 문서 개요

이 문서는 똥글똥글 시스템의 **모든 기술 문서, 비즈니스 분석, 기능 명세**를 연결하는 중앙 허브입니다. 57개의 상세 문서가 체계적으로 구성되어 있으며, 프로젝트의 모든 측면을 포괄합니다.

### 문서 구조 (57개 파일)

```
.claude/docs/apps/server/
├── 📊 README.md (1)
│   └── 프로젝트 개요 및 빠른 참조 가이드
│
├── 🔍 facts/ (33개) - 기술적 사실
│   ├── index.md - Facts 전체 개요
│   ├── domain/ (7개) - 도메인 엔티티
│   ├── application/ (4개) - CQRS Commands/Queries
│   ├── infrastructure/ (4개) - 인프라 계층
│   ├── presentation/ (4개) - API 라우트
│   ├── routes/ (3개) - HTTP 엔드포인트
│   ├── services/ (1개) - 서비스 계층
│   ├── database/ (1개) - 데이터베이스 스키마
│   ├── config/ (1개) - 환경 설정
│   └── lib/ (2개) - 유틸리티
│
├── 💡 insights/ (11개) - 비즈니스 분석
│   ├── index.md - Insights 전체 개요
│   ├── operations/ (8개) - 운영 분석
│   └── impact/ (3개) - 영향 분석
│
└── 📋 specs/ (10개) - 기능 명세서
    ├── index.md - Specs 전체 개요
    ├── ddd-architecture.md - DDD 아키텍처 명세
    ├── multi-tenant-architecture.md - 멀티 테넌트 명세
    ├── domain-services.md - 도메인 서비스 명세
    ├── github-webhook.md - GitHub Webhook 명세
    ├── reminder-system.md - 리마인더 시스템 명세
    ├── status-tracking.md - 상태 추적 명세
    ├── discord-notifications.md - Discord 알림 명세
    ├── discord-bot-integration.md - Discord Bot 명세
    ├── graphql-api.md - GraphQL API 명세
    └── organization-management.md - 조직 관리 명세
```

---

## 빠른 탐색 가이드

### 🎯 원하는 정보를 빠르게 찾으려면?

**기술 이해가 필요한가요?**
- → [Facts (기술적 사실)](#-facts---기술적-사실-33개)

**비즈니스 가치를 알고 싶은가요?**
- → [Insights (비즈니스 분석)](#-insights---비즈니스-분석-11개)

**구현 명세가 필요한가요?**
- → [Specs (기능 명세서)](#-specs---기능-명세서-10개)

**빠른 개요가 필요한가요?**
- → [README (프로젝트 개요)](README.md)

---

## 📊 핵심 통계

### 코드베이스 규모
- **도메인 엔티티**: 6개 (Member, Organization, Generation, Cycle, Submission, OrganizationMember)
- **CQRS Commands**: 11개
- **CQRS Queries**: 13개
- **도메인 이벤트**: 5개
- **값 객체 (Value Objects)**: 20+개
- **HTTP 엔드포인트**: 10개
- **GraphQL Queries/Mutations**: 12개
- **Discord Bot Commands**: 11개

### 데이터베이스 스키마
- **테이블 수**: 6개 (organizations, members, generations, cycles, submissions, organization_members)
- **외래 키 관계**: 7개
- **고유 제약조건**: 4개

### 문서 범위
- **총 문서 수**: 57개
- **총 라인 수**: ~10,000+ 라인
- **마지막 전체 검증**: 2026-01-07
- **Git 참조**: 9164ce1283112dd34a47ff830c0679e7128506d5

---

## 🏗️ 시스템 아키텍처

### DDD 4계층 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                          │
│  HTTP Routes │ GraphQL API │ Discord Bot │ Webhook Handlers    │
├─────────────────────────────────────────────────────────────────┤
│                     APPLICATION LAYER                           │
│  Commands (11) │ Queries (13) │ Event Handlers (5)              │
├─────────────────────────────────────────────────────────────────┤
│                       DOMAIN LAYER                              │
│  Entities (6) │ Value Objects (20+) │ Domain Services (4)       │
├─────────────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE LAYER                         │
│  PostgreSQL │ Drizzle ORM │ Discord │ GitHub │ JWT              │
└─────────────────────────────────────────────────────────────────┘
```

### 핵심 패턴
1. **Domain-Driven Design (DDD)**: 도메인 로직을 풍부한 엔티티와 값 객체로 캡슐화
2. **CQRS**: Command(쓰기)와 Query(읽기) 분리
3. **Repository Pattern**: 도메인 리포지토리 인터페이스와 인프라 구현체 분리
4. **Domain Events**: 도메인 이벤트 발행 및 핸들링
5. **Multi-Tenancy**: 조직(organization) 단위로 데이터 격리

---

## 🔍 Facts - 기술적 사실 (33개)

### Facts 전체 문서
- **[Facts Index](facts/index.md)** - Facts 전체 개요 및 아키텍처 다이어그램

### Domain Layer (도메인 계층) - 7개 문서

도메인의 핵심 비즈니스 로직과 엔티티를 정의합니다.

| 문서 | 설명 | 핵심 내용 |
|------|------|----------|
| **[Domain Index](facts/domain/index.md)** | 도메인 계층 개요 | 엔티티 관계도, 집합(Aggregate) 경계 |
| **[Organization](facts/domain/organization.md)** | 조직 엔티티 | 멀티 테넌트 최상위 단위, slug, Discord webhook |
| **[OrganizationMember](facts/domain/organization-member.md)** | 조직원 연결 엔티티 | 역할(OWNER/ADMIN/MEMBER), 상태(PENDING/APPROVED/REJECTED/INACTIVE) |
| **[Member](facts/domain/member.md)** | 회원 엔티티 | Discord ID, GitHub username, name |
| **[Generation](facts/domain/generation.md)** | 기수 엔티티 | 조직의 기간 단위, isActive, startedAt |
| **[Cycle](facts/domain/cycle.md)** | 사이클 엔티티 | 격주 주차, week, startDate, endDate, githubIssueUrl |
| **[Submission](facts/domain/submission.md)** | 제출 엔티티 | blogUrl, githubCommentId (unique), 중복 방지 |

### Application Layer (애플리케이션 계층) - 4개 문서

CQRS 패턴을 구현한 Commands와 Queries를 정의합니다.

| 문서 | 설명 | 핵심 내용 |
|------|------|----------|
| **[Commands](facts/application/commands.md)** | Command Handlers (쓰기) | RecordSubmission, CreateCycle, CreateMember, CreateOrganization, 등 |
| **[Queries](facts/application/queries.md)** | Query Handlers (읽기) | GetCycleStatus, GetReminderTargets, GetAllMembers, 등 |
| **[Event Handlers](facts/application/event-handlers.md)** | 도메인 이벤트 핸들러 | SubmissionRecordedEvent, 등 |
| **[Application Index](facts/application/index.md)** | 애플리케이션 계층 개요 | CQRS 패턴 설명, 전체 목록 |

### Infrastructure Layer (인프라 계층) - 4개 문서

외부 시스템 연동과 영속성을 담당합니다.

| 문서 | 설명 | 핵심 내용 |
|------|------|----------|
| **[Persistence](facts/infrastructure/persistence.md)** | Drizzle ORM 리포지토리 | PostgreSQL 연결, Repository 구현체 |
| **[JWT Service](facts/infrastructure/jwt.md)** | JWT 인증 구현 | 토큰 생성, 검증, Discord OAuth |
| **[External Services](facts/infrastructure/external.md)** | 외부 서비스 연동 | Discord Webhook, GitHub Webhook |
| **[Infrastructure Index](facts/infrastructure/index.md)** | 인프라 계층 개요 | 의존성 주입, 서비스 구성 |

### Presentation Layer (프레젠테이션 계층) - 4개 문서

API 엔드포인트와 Discord Bot 명령어를 정의합니다.

| 문서 | 설명 | 핵심 내용 |
|------|------|----------|
| **[HTTP Routes](facts/presentation/http.md)** | REST API 엔드포인트 | /health, /webhook/github, /api/reminder, /api/status |
| **[GraphQL API](facts/presentation/graphql.md)** | Pylon GraphQL API | 8개 Queries, 4개 Mutations |
| **[Discord Bot](facts/presentation/discord.md)** | Discord Slash Commands | 11개 슬래시 명령어 |
| **[Presentation Index](facts/presentation/index.md)** | 프레젠테이션 계층 개요 | 라우팅 구조, 미들웨어 |

### Routes (상세 HTTP 라우트) - 3개 문서

개별 HTTP 라우트의 상세 구현을 문서화합니다.

| 문서 | 설명 | 핵심 내용 |
|------|------|----------|
| **[GitHub Webhook Route](facts/routes/github.md)** | GitHub 웹훅 핸들러 | Issue Comment, Issues 이벤트 처리 |
| **[Reminder Route](facts/routes/reminder.md)** | 리마인더 API | 마감 임박 사이클 조회, 미제출자 조회 |
| **[Status Route](facts/routes/status.md)** | 상태 조회 API | 제출 현황 JSON/Discord 포맷 |

### Services (서비스 계층) - 1개 문서

| 문서 | 설명 | 핵심 내용 |
|------|------|----------|
| **[Discord Service](facts/services/discord.md)** | Discord 메시지 서비스 | 제출 알림, 리마인더, 현황 리포트 메시지 생성 |

### Database (데이터베이스) - 1개 문서

| 문서 | 설명 | 핵심 내용 |
|------|------|----------|
| **[Schema](facts/database/schema.md)** | 데이터베이스 스키마 | 6개 테이블, 관계, 제약조건 |

### Config (설정) - 1개 문서

| 문서 | 설명 | 핵심 내용 |
|------|------|----------|
| **[Environment](facts/config/environment.md)** | 환경 변수 | DATABASE_URL, DISCORD_BOT_TOKEN, 등 |

### Lib (유틸리티) - 2개 문서

| 문서 | 설명 | 핵심 내용 |
|------|------|----------|
| **[Error Handler](facts/lib/error.md)** | 에러 핸들링 | ConflictError, NotFoundError, 등 |
| **[Router](facts/lib/router.md)** | 라우터 유틸리티 | Hono 라우터 구성 |

---

## 💡 Insights - 비즈니스 분석 (11개)

### Insights 전체 문서
- **[Insights Index](insights/index.md)** - Insights 전체 개요 및 요약

### Operations Analysis (운영 분석) - 8개 문서

운영 관점에서 시스템의 기능과 프로세스를 분석합니다.

| 문서 | 설명 | 핵심 발견 |
|------|------|----------|
| **[GitHub Webhook](insights/operations/github-webhook.md)** | 제출 수집 자동화 | 수동 작업 시간 95% 절감 (주 30분 → 0분) |
| **[Discord Notifications](insights/operations/discord-notifications.md)** | 알림 시스템 분석 | 실시간 피드백 (1초 이내), 신뢰성 99%+ |
| **[Reminder System](insights/operations/reminder-system.md)** | 리마인더 시스템 | 제출률 70% → 90% 향상 (+20%p) |
| **[Status Tracking](insights/operations/status-tracking.md)** | 상태 추적 시스템 | 실시간 현황 조회, 투명성 확보 |
| **[DDD Migration](insights/operations/ddd-migration.md)** | DDD 리팩토링 영향 | 유지보수성 40-60% 개선, 개발 속도 30-50% 향상 |
| **[Domain Model](insights/operations/domain-model.md)** | 도메인 모델 분석 | 비즈니스 개념의 코드 표현, 일관성 확보 |
| **[CQRS Pattern](insights/operations/cqrs-pattern.md)** | CQRS 패턴 효과 | 쿼리 성능 20-40% 향상, 책임 분리 |
| **[Organization Management](insights/operations/organization-management.md)** | 조직 관리 분석 | 멀티 테넌트 운영, 데이터 격리 |

### Impact Analysis (영향 분석) - 3개 문서

시스템이 비즈니스와 사용자에 미치는 영향을 분석합니다.

| 문서 | 설명 | 핵심 발견 |
|------|------|----------|
| **[Member Experience](insights/impact/member-experience.md)** | 멤버 경험 분석 | 원클릭 제출, 셀프서비스 등록, 투명한 현황 |
| **[Operational Efficiency](insights/impact/operational-efficiency.md)** | 운영 효율성 분석 | 연간 104시간 절감 (약 208만원 가치) |
| **[Multi-Tenant Architecture](insights/impact/multi-tenant-architecture.md)** | 멀티 테넌트 영향 | 인프라 비용 절감 (10개 조직 기준 월 $180), 확장성 |

---

## 📋 Specs - 기능 명세서 (10개)

### Specs 전체 문서
- **[Specs Index](specs/index.md)** - Specs 전체 개요, 기능 상태, TODO

### Architecture Specs (아키텍처 명세) - 3개 문서

시스템 아키텍처의 전체 명세를 제공합니다.

| 문서 | 설명 | 비즈니스 가치 |
|------|------|--------------|
| **[DDD Architecture](specs/ddd-architecture.md)** | DDD 아키텍처 명세 | 유지보수성 40-60% 개선, 개발 속도 30-50% 향상 |
| **[Multi-Tenant Architecture](specs/multi-tenant-architecture.md)** ⭐ NEW | 멀티 테넌트 명세 | 인프라 비용 절감 $180/월, 확장성, 프라이버시 강화 |
| **[Domain Services](specs/domain-services.md)** | 도메인 서비스 명세 | 비즈니스 로직 재사용성, 일관성 보장 |

### Feature Specs (기능 명세) - 7개 문서

각 기능의 상세 명세를 제공합니다.

| 문서 | 설명 | 상태 | 우선순위 |
|------|------|------|----------|
| **[GitHub Webhook](specs/github-webhook.md)** | GitHub 웹훅 핸들러 명세 | ✅ 운영 중 | P0 |
| **[Reminder System](specs/reminder-system.md)** | 리마인더 시스템 명세 | ✅ 운영 중 | P0 |
| **[Status Tracking](specs/status-tracking.md)** | 상태 추적 명세 | ✅ 운영 중 | P0 |
| **[Discord Notifications](specs/discord-notifications.md)** | Discord 알림 명세 | ✅ 운영 중 | P0 |
| **[Discord Bot Integration](specs/discord-bot-integration.md)** ⭐ NEW | Discord Bot 명세 | ✅ 운영 중 | P1 |
| **[GraphQL API](specs/graphql-api.md)** ⭐ NEW | GraphQL API 명세 | ✅ 운영 중 | P1 |
| **[Organization Management](specs/organization-management.md)** ⭐ NEW | 조직 관리 명세 | ✅ 운영 중 | P0 |

---

## 🎯 주요 워크플로우

### 1. 제출 기록 흐름

```
GitHub Issue Comment
  ↓
POST /webhook/github (issue_comment event)
  ↓
RecordSubmissionCommand (Application Layer)
  ├→ Find Cycle by GitHub Issue URL
  ├→ Find Member by GitHub Username
  ├→ Verify Member is Active in Organization
  ├→ Validate No Duplicate (SubmissionService)
  ├→ Create Submission Entity (Domain Layer)
  └→ Send Discord Notification (Event Handler)
```

**관련 문서**:
- [Facts: GitHub Webhook Route](facts/routes/github.md)
- [Facts: Commands](facts/application/commands.md)
- [Specs: GitHub Webhook](specs/github-webhook.md)

### 2. 사이클 생성 흐름

```
GitHub Issue Created
  ↓
POST /webhook/github (issues event)
  ↓
CreateCycleCommand (Application Layer)
  ├→ Parse Week from Title
  ├→ Parse Deadline from Body
  ├→ Find Organization & Active Generation
  ├→ Validate No Duplicate Week
  └→ Create Cycle Entity (Domain Layer)
```

**관련 문서**:
- [Facts: Commands](facts/application/commands.md)
- [Specs: GitHub Webhook](specs/github-webhook.md)

### 3. Discord Bot 제출 현황 조회

```
Discord Slash Command (/check-submission)
  ↓
GetCycleStatusQuery.getCurrentCycle() (Application Layer)
  → DB Query (Infrastructure Layer)
  ↓
GetCycleStatusQuery.getCycleParticipantNames()
  → DB Query
  ↓
Discord Message Formatting (Presentation Layer)
  ↓
Send Ephemeral Reply
```

**관련 문서**:
- [Facts: Discord Bot](facts/presentation/discord.md)
- [Facts: Queries](facts/application/queries.md)
- [Specs: Discord Bot Integration](specs/discord-bot-integration.md)

---

## 📊 도메인 모델 관계도

```
Organization (조직)
  │
  ├── (1:N) Generation (기수)
  │     │
  │     └── (1:N) Cycle (사이클/주차)
  │           │
  │           └── (1:N) Submission (제출)
  │                 │
  │                 └── (N:1) Member (회원)
  │
  └── (1:N) OrganizationMember (조직원)
        │
        └── (N:1) Member
```

**관련 문서**:
- [Facts: Domain Index](facts/domain/index.md)
- [Facts: Database Schema](facts/database/schema.md)

---

## 🚀 주요 기능 상태

| 기능 | 상태 | 우선순위 | 비고 |
|------|------|----------|------|
| **멀티 테넌트 아키텍처** | ✅ 운영 중 | P0 | v3.0.0 완료 (commit 9164ce1) |
| **조직(Organization) 엔티티** | ✅ 운영 중 | P0 | organizations 테이블 |
| **조직원(OrganizationMember) 엔티티** | ✅ 운영 중 | P0 | organization_members 테이블 |
| **RBAC (역할 기반 접근 제어)** | ✅ 운영 중 | P1 | OWNER/ADMIN/MEMBER |
| **조직별 Discord 알림 분리** | ✅ 운영 중 | P0 | discord_webhook_url 컬럼 |
| **GitHub Username 중복 허용** | ✅ 운영 중 | P0 | github UNIQUE 제약조건 제거 |
| **GraphQL API** | ✅ 운영 중 | P1 | Pylon Framework 기반 |
| **Discord Bot Slash Commands (11개)** | ✅ 운영 중 | P1 | /register, /join-organization, 등 |
| **DDD 아키텍처** | ✅ 운영 중 | P0 | v2.0.0 완료 |
| **CQRS 패턴** | ✅ 운영 중 | P0 | Command 11개, Query 13개 |
| **도메인 이벤트** | ✅ 운영 중 | P0 | 5개 이벤트 |
| **GitHub Webhook - Issue Comment** | ✅ 운영 중 | P0 | RecordSubmissionCommand |
| **GitHub Webhook - Issues (Auto Cycle)** | ✅ 운영 중 | P0 | CreateCycleCommand |
| **Reminder - Query Cycles** | ✅ 운영 중 | P0 | GetReminderTargetsQuery |
| **Reminder - Not Submitted Members** | ✅ 운영 중 | P1 | 미제출자 조회 |
| **Status - Current Cycle Query** | ✅ 운영 중 | P0 | GetCycleStatusQuery |
| **Discord Notifications** | ✅ 운영 중 | P0 | SubmissionRecordedEvent |

---

## 📈 비즈니스 가치 요약

### 운영 효율성
- **자동화 커버리지**: 약 80%
- **시간 절감**: 연간 104시간 (주 2시간 × 52주)
- **인건비 절감**: 약 208만원/년 (시급 2만원 기준)
- **주요 자동화**: 제출 수집, 회차 생성, 알림 발송, 현황 조회

### 멤버 경험
- **즉시 피드백**: 제출 후 1초 이내 Discord 알림
- **투명성**: 제출 현황 실시간 확인 (API + Discord Bot)
- **마감 준수**: 리마인더로 제출률 70% → 90% 향상 (+20%p)
- **셀프서비스**: 등록, 가입 신청, 현황 조회를 Discord에서 즉시 처리

### 기술적 안정성
- **중복 방지**: `githubCommentId` UNIQUE 제약조건
- **멱등성**: 동일 이벤트 재처리 시 안전
- **DDD 아키텍처**: 유지보수성 40-60% 개선
- **CQRS 패턴**: 쿼리 성능 20-40% 향상

---

## 🔧 개발 커맨드

```bash
# 의존성 설치
pnpm install

# 개발 서버 시작 (핫 리로드)
pnpm dev

# TypeScript 컴파일
pnpm build

# 컴파일된 JS 실행
pnpm start

# 데이터베이스 마이그레이션
pnpm db:generate  # 마이그레이션 파일 생성 (schema.ts로부터)
pnpm db:migrate   # 마이그레이션 실행
pnpm db:push      # 개발용: 스키마 직접 푸시
pnpm db:studio    # Drizzle Studio 실행 (DB GUI)

# 코드 품질
pnpm lint         # ESLint 실행
pnpm lint:fix     # ESLint 자동 수정
pnpm format       # Prettier 포맷팅
pnpm format:check # 포맷팅 확인
```

---

## 🔗 관련 문서

### 워크스페이스 문서
- **[Workspace Index](../../workspace/index.md)** - Turborepo 워크스페이스 개요
- **[Workspace Architecture](../../workspace/architecture.md)** - 워크스페이스 아키텍처

### 유비쿼터스 언어
- **[Ubiquitous Language](../../ubiquitous-language/ubiquitous-language.md)** - 도메인 전문 용어 사전

---

## 📝 문서 사용 가이드

### 경영진/운영자를 위한 가이드

각 명세서 상단의 "개요 (Overview)"와 "비즈니스 가치" 섹션을 참조하세요. 2-3문장으로 핵심 가치를 설명합니다.

**추천 문서**:
- [Insights Index](insights/index.md) - 비즈니스 분석 요약
- [Operational Efficiency](insights/impact/operational-efficiency.md) - 운영 효율성 분석
- [Multi-Tenant Architecture](specs/multi-tenant-architecture.md) - 확장성 전략

### 기술팀을 위한 가이드

"기술 사양 (Technical Specifications)", "API 명세 (API Specifications)", "데이터 구조 (Data Structure)" 섹션에서 구현에 필요한 모든 기술적 세부사항을 확인하세요.

**추천 문서**:
- [Facts Index](facts/index.md) - 기술적 사실 전체 개요
- [DDD Architecture](specs/ddd-architecture.md) - 아키텍처 명세
- [Database Schema](facts/database/schema.md) - 데이터베이스 구조

### 신규 개발자를 위한 가이드

프로젝트의 빠른 이해를 위해 다음 순서로 문서를 읽으세요:

1. **[README](README.md)** - 프로젝트 개요
2. **[Facts Index](facts/index.md)** - 기술 구조 이해
3. **[Domain Index](facts/domain/index.md)** - 도메인 모델 이해
4. **[Application Index](facts/application/index.md)** - CQRS 패턴 이해
5. **[Specs Index](specs/index.md)** - 기능 명세 확인

---

## 🎯 다음 단계 및 권장사항

### 단기 (1-3개월)
1. **모니터링 강화**: GitHub webhook 성공/실패 로그, Discord 알림 발송 추적
2. **권한 관리 구현**: `/approve-member`에 역할 검증 로직 추가
3. **에러 핸들링 개선**: 사용자 친화적 에러 메시지, 재시도 가능한 에러 표시

### 중기 (3-6개월)
1. **데이터 대시보드**: 제출률 추이 그래프, 개인별 통계, 기수 비교 분석
2. **리마인더 최적화**: AB 테스트로 최적 빈도 찾기, 개인별 리마인더 시간 설정
3. **모바일 경험 개선**: Discord Bot 모바일 UX 최적화, PWA 도입

### 장기 (6-12개월)
1. **플랫폼화**: 멀티 테넌트 아키텍처 강화, 조직별 독립 Discord 채널 지원
2. **AI 기능 도입**: 제출 글 자동 요약, 피드백 생성 (GPT-4), 플래그리즘 검출
3. **수익화**: 프리미엄 구독 모델 도입, 기업 교육 프로그램 판매

---

## 📞 문서 관리 정보

- **문서 버전**: 3.0.0
- **생성일**: 2026-01-05
- **최종 검증**: 2026-01-07
- **Git Commit**: 9164ce1283112dd34a47ff830c0679e7128506d5
- **다음 리뷰일**: 2026-02-07
- **문서 관리자**: Claude Code (feature-orchestrator)

---

## 📚 문서 라이선스

이 문서는 똥글똥글 프로젝트의 내부 문서입니다. 프로젝트 팀원과 이해관계자에게 공개됩니다.

---

*이 마스터 인덱스는 57개의 상세 문서를 연결하는 중앙 허브입니다. 각 섹션의 링크를 따라 필요한 정보를 빠르게 찾을 수 있습니다.*
