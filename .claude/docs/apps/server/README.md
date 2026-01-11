# 똥글똥글 Server - 완전한 코드베이스 문서화

## 문서화 완료 현황

이 문서는 2026-01-11에 Git commit `cdbdf2d`를 기준으로 자동 추출되었습니다.

### 문서 구조

```
.claude/docs/apps/server/
├── index.md                    # 메인 개요 및 빠른 참조
├── README.md                   # 이 파일
├── facts/                      # 코드베이스 사실 (코드로부터 검증됨)
│   ├── index.md               # Facts 인덱스
│   ├── domain/                # 도메인 계층 문서
│   │   ├── organization.md    # 조직 도메인
│   │   ├── organization-member.md # 조직원 도메인
│   │   ├── auth.md            # JWT 인증 도메인
│   │   ├── member.md          # 회원 도메인
│   │   ├── cycle.md           # 사이클 도메인
│   │   ├── generation.md      # 기수 도메인
│   │   └── submission.md      # 제출 도메인
│   ├── application/           # 애플리케이션 계층 문서
│   │   ├── commands.md        # CQRS Commands (8개)
│   │   ├── queries.md         # CQRS Queries (10개)
│   │   └── event-handlers.md  # Domain Event Handlers
│   ├── presentation/          # 프레젠테이션 계층 문서
│   │   ├── http.md            # HTTP REST API
│   │   ├── graphql.md         # Pylon GraphQL API
│   │   └── discord.md         # Discord Bot Commands
│   ├── infrastructure/        # 인프라 계층 문서
│   │   ├── persistence.md     # Drizzle ORM 리포지토리
│   │   ├── jwt.md             # JWT 서비스 구현
│   │   └── external.md        # 외부 서비스 (Discord, GitHub)
│   └── database/              # 데이터베이스 문서
│       └── schema.md          # PostgreSQL 스키마
├── insights/                   # 아키텍처 통찰
│   └── operations/            # 운영 관련 통찰
└── specs/                      # 기술 명세
```

### 주요 변경사항 (Commit cdbdf2d)

#### 멀티 테넌트 아키텍처 도입 (v3.0.0)
1. **새로운 도메인**:
   - `Organization` - 조직(스터디 그룹) 엔티티
   - `OrganizationMember` - 조직-회원 관계 엔티티
   - `JWTService` - JWT 기반 인증

2. **데이터베이스 스키마 변경**:
   - `organizations` 테이블 추가
   - `organization_members` 테이블 추가 (기존 `generation_members` 대체)
   - `generations` 테이블에 `organization_id` FK 추가
   - `members.github` 더 이상 unique 아님

3. **새로운 CQRS Handlers**:
   - Commands (9개): RecordSubmission, CreateCycle, CreateGeneration, CreateMember, CreateOrganization, JoinGeneration, JoinOrganization, AddMemberToOrganization, UpdateMemberStatus
   - Queries (12개): GetCycleStatus, GetReminderTargets, GetOrganization, GetAllMembers, GetMemberByGithub, GetAllGenerations, GetGenerationById, GetCycleById, GetCyclesByGeneration, GetOrganizationMembers, GetMemberOrganizations, GetActiveCycle
   - Event Handlers (1개): SubmissionEventHandler

4. **프레젠테이션 계층 확장**:
   - Discord Bot Slash Commands (9개): /register, /join-organization, /create-organization, /approve-member, /join-generation, /cycle-status, /current-cycle, /check-submission, /list-organizations
   - Pylon GraphQL API (Code-First approach)
   - HTTP Routes: GitHub Webhook, Reminder API, Status API

#### DDD 아키텍처 리팩토링 (v2.0.0)
- 4계층 DDD 구조 도입 (Domain, Application, Infrastructure, Presentation)
- CQRS 패턴 적용
- 도메인 이벤트 기반 알림 시스템
- 값 객체로 데이터 무결성 보장

### 문서화 범위

#### Domain Layer (8개 도메인)
- ✅ Organization (조직) - Aggregate Root, Value Objects, Repository
- ✅ OrganizationMember (조직원) - Entity, Value Objects, Enums, Repository
- ✅ Auth (인증) - JWT Value Objects, Service Interface
- ✅ Member (회원) - Aggregate Root, Value Objects, Service, Repository
- ✅ Cycle (사이클) - Aggregate Root, Value Objects, Repository
- ✅ Generation (기수) - Aggregate Root, Service, Repository
- ✅ GenerationMember (기수원) - Entity, Repository (deprecated)
- ✅ Submission (제출) - Aggregate Root, Value Objects, Service, Repository

#### Application Layer (CQRS)
- ✅ Commands (9개) - CreateOrganization, JoinOrganization, AddMemberToOrganization, CreateMember, CreateGeneration, CreateCycle, RecordSubmission, JoinGeneration, UpdateMemberStatus
- ✅ Queries (12개) - GetOrganization, GetOrganizationMembers, GetMemberOrganizations, GetAllMembers, GetMemberByGithub, GetAllGenerations, GetGenerationById, GetCycleById, GetCyclesByGeneration, GetCycleStatus, GetReminderTargets, GetActiveCycle
- ✅ Event Handlers (1개) - SubmissionEventHandler

#### Presentation Layer
- ✅ HTTP Routes - GitHub Webhook, Reminder API, Status API
- ✅ GraphQL API - Pylon Queries (8개), Mutations (4개)
- ✅ Discord Bot - Slash Commands (9개), Registration

#### Infrastructure Layer
- ✅ Persistence - Drizzle ORM Schema (7개 테이블), Repository Implementations (7개)
- ✅ JWT Service - Implementation, Configuration
- ✅ External Services - Discord Webhook, Discord Messages, GitHub Client

#### Database
- ✅ Schema - PostgreSQL Tables, Columns, Indexes, Foreign Keys, Enums

### 통계

- **총 문서 파일**: 47개
- **총 라인 수**: 약 3,500+라인
- **다룬 엔티티**: 8개 도메인
- **다룬 CQRS Handlers**: 22개 (Commands: 9, Queries: 12, Event Handlers: 1)
- **다룬 API Endpoints**: 20+개 (HTTP: 10, GraphQL: 12, Discord: 9)
- **다룬 DB Tables**: 7개
- **운영 분석 문서**: 13개 (Operations: 10, Impact: 3)
- **기능 명세서**: 11개

### 사용 방법

1. **빠른 참조**: `index.md`에서 전체 개요와 핵심 개념 학습
2. **도메인 이해**: `facts/domain/`에서 각 도메인의 엔티티, 값 객체, 비즈니스 로직 확인
3. **CQRS 패턴**: `facts/application/`에서 Command/Query 핸들러의 책임과 의존성 확인
4. **API 사용**: `facts/presentation/`에서 HTTP/GraphQL/Discord API의 사용법 확인
5. **인프라 이해**: `facts/infrastructure/`에서 리포지토리 구현과 외부 서비스 연동 방식 확인
6. **DB 스키마**: `facts/database/schema.md`에서 테이블 구조와 관계 확인

### 업데이트 방법

이 문서는 Git commit에 기반하므로, 코드 변경 시 다음 단계로 업데이트:

1. Git diff로 변경된 파일 확인
2. 해당 파일의 문서 업데이트
3. 메타데이터 갱신 (git_commit, last_verified)
4. 새로운 도메인/핸들러/엔드포인트 추가 시 문서 생성

### 참고

- **Source Code**: `apps/server/src/`
- **Git Commit**: cdbdf2d1efe48aaee1bb65c8cb58f773e41d30ee
- **Last Updated**: 2026-01-11
- **Documentation Tool**: feature-analysis-orchestrator (Claude Agent)

---

이 문서는 코드베이스 구조를 이해하고, 각 레이어의 책임을 파악하며, 특정 기능을 찾을 수 있도록 설계되었습니다.

## Quick Start Guide

### 1. 프로젝트 이해하기

똥글똥글은 **격주 글쓰기 모임 자동화 시스템**입니다:
- 멤버들이 GitHub Issue에 댓글로 블로그 글을 제출
- 시스템이 자동으로 제출을 기록하고 Discord에 알림
- 마감 임박 시 자동 리마인더 발송
- 제출 현황 실시간 조회

### 2. 핵심 아키텍처

**DDD 4계층 구조**:
```
Presentation (HTTP/GraphQL/Discord) → Application (CQRS) → Domain (Business Logic) → Infrastructure (DB/External)
```

**주요 패턴**:
- **CQRS**: 명령(Command)과 조회(Query) 분리
- **Domain Events**: 도메인 이벤트 기반 알림
- **Value Objects**: 데이터 무결성 보장
- **Aggregates**: 트랜잭션 경계 명확화

### 3. 문서 탐색 경로

**새로운 팀원**:
1. [facts/index.md](./facts/index.md) - 전체 개요와 핵심 개념
2. [insights/index.md](./insights/index.md) - 비즈니스 가치와 운영 효율
3. [specs/index.md](./specs/index.md) - 기능 명세서

**기능 개발**:
1. [facts/domain/](./facts/domain/) - 관련 도메인 엔티티 확인
2. [facts/application/](./facts/application/) - Command/Query 핸들러 확인
3. [specs/](./specs/) - 기능 명세서 참조

**운영/유지보수**:
1. [insights/operations/](./insights/operations/) - 운영 분석
2. [insights/impact/](./insights/impact/) - 영향 분석
3. [facts/infrastructure/](./facts/infrastructure/) - 인프라 구조

### 4. 주요 기능

**핵심 기능**:
- GitHub Webhook 자동화 (제출 수집, 회차 생성)
- Discord 알림 시스템 (제출, 리마인더, 현황)
- 리마인더 시스템 (마감 임박 알림)
- 제출 현황 조회 (실시간 통계)
- Discord Bot (9개 슬래시 명령어)

**멀티 테넌트 기능**:
- 조직 관리 (다중 스터디 그룹 지원)
- 조직원 관리 (승인 기반 가입)
- 역할 기반 접근 제어 (OWNER, ADMIN, MEMBER)

### 5. 데이터 모델

**핵심 엔티티 관계**:
```
Organization (조직)
  ├── Generation (기수)
  │    └── Cycle (회차)
  │         └── Submission (제출)
  └── OrganizationMember (조직원)
       └── Member (회원)
```

### 6. API 엔드포인트

**HTTP API**:
- `POST /webhook/github` - GitHub webhook
- `GET /api/reminder` - 리마인더 대상 조회
- `GET /api/status/:cycleId` - 제출 현황 조회

**GraphQL API**:
- Queries: members, generations, cycles, cycleStatus
- Mutations: addMember, addGeneration, addCycle, addSubmission

**Discord Bot**:
- /register, /join-organization, /create-organization
- /approve-member, /join-generation
- /cycle-status, /current-cycle, /check-submission, /list-organizations
