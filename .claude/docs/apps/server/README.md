# 똥글똥글 Server - 완전한 코드베이스 문서화

## 문서화 완료 현황

이 문서는 2025-01-07에 Git commit `82509c3`을 기준으로 자동 추출되었습니다.

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

### 주요 변경사항 (Commit 82509c3)

#### 멀티 테넌트 아키텍처 도입
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
   - `CreateOrganizationCommand` - 조직 생성
   - `JoinOrganizationCommand` - 조직 가입
   - `AddMemberToOrganizationCommand` - 멤버 추가
   - `GetOrganizationQuery` - 조직 조회
   - `GetOrganizationMembersQuery` - 조직원 목록

4. **프레젠테이션 계층 확장**:
   - Discord Bot Slash Commands (`/check-submission`, `/current-cycle`)
   - Pylon GraphQL API (Code-First approach)

### 문서화 범위

#### Domain Layer (7개 도메인)
- ✅ Organization (조직) - Aggregate Root, Value Objects, Repository
- ✅ OrganizationMember (조직원) - Entity, Value Objects, Enums, Repository
- ✅ Auth (인증) - JWT Value Objects, Service Interface
- ✅ Member (회원) - Aggregate Root, Value Objects, Service, Repository
- ✅ Cycle (사이클) - Aggregate Root, Value Objects, Repository
- ✅ Generation (기수) - Aggregate Root, Service, Repository
- ✅ Submission (제출) - Aggregate Root, Value Objects, Service, Repository

#### Application Layer (CQRS)
- ✅ Commands (8개) - CreateOrganization, JoinOrganization, AddMemberToOrganization, CreateMember, CreateGeneration, CreateCycle, RecordSubmission, UpdateMemberStatus
- ✅ Queries (10개) - GetOrganization, GetOrganizationMembers, GetMemberOrganizations, GetAllMembers, GetMemberByGithub, GetAllGenerations, GetGenerationById, GetCycleById, GetCyclesByGeneration, GetCycleStatus
- ✅ Event Handlers (1개) - SubmissionEventHandler

#### Presentation Layer
- ✅ HTTP Routes - GitHub Webhook, Reminder API, Status API
- ✅ GraphQL API - Pylon Queries (8개), Mutations (4개)
- ✅ Discord Bot - Slash Commands (2개), Registration

#### Infrastructure Layer
- ✅ Persistence - Drizzle ORM Schema (7개 테이블), Repository Implementations (7개)
- ✅ JWT Service - Implementation, Configuration
- ✅ External Services - Discord Webhook, Discord Messages, GitHub Client

#### Database
- ✅ Schema - PostgreSQL Tables, Columns, Indexes, Foreign Keys, Enums

### 통계

- **총 문서 파일**: 20개
- **총 라인 수**: 약 1,500라인
- **다룬 엔티티**: 7개
- **다룬 CQRS Handlers**: 19개
- **다룬 API Endpoints**: 15개
- **다룬 DB Tables**: 7개

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
- **Git Commit**: 82509c3098d10848b4ac6fcb83e1c285cbaeb0c3
- **Last Updated**: 2025-01-07
- **Documentation Tool**: codebase-extractor (Claude Agent)

---

이 문서는 코드베이스 구조를 이해하고, 각 레이어의 책임을 파악하며, 특정 기능을 찾을 수 있도록 설계되었습니다.
