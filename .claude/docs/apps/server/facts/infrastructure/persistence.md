# Infrastructure Persistence Layer

- **Scope**: apps/server
- **Layer**: infrastructure
- **Source of Truth**: apps/server/src/infrastructure/persistence/
- **Last Verified**: 2025-01-07
- **Repo Ref**: 82509c3

## Drizzle DB Setup

- **Location**: `apps/server/src/infrastructure/persistence/drizzle-db/schema.ts`
- **Purpose**: Drizzle ORM 스키마 정의 (PostgreSQL)
- **ORM**: Drizzle ORM with postgres.js driver
- **Connection String**: `DATABASE_URL` 환경 변수

### Table: organizations

- **Location**: `apps/server/src/infrastructure/persistence/drizzle-db/schema.ts` (L25-L38)
- **Purpose**: 조직(스터디 그룹) 테이블
- **Columns**:
  - `id: serial` - PK
  - `name: text` - 조직 이름 (UNIQUE, NOT NULL)
  - `slug: text` - URL 식별자 (UNIQUE, NOT NULL, INDEXED)
  - `discord_webhook_url: text` - Discord 웹훅 URL
  - `is_active: boolean` - 활성화 상태 (DEFAULT: true)
  - `created_at: timestamp` - 생성 일시 (DEFAULT: NOW())
- **Indexes**:
  - `organizations_slug_idx` - slug 컬럼

### Table: members

- **Location**: `apps/server/src/infrastructure/persistence/drizzle-db/schema.ts` (L40-L49)
- **Purpose**: 회원 테이블 (Discord 기반)
- **Columns**:
  - `id: serial` - PK
  - `discord_id: text` - Discord User ID (UNIQUE, NOT NULL)
  - `discord_username: text` - Discord 사용자명
  - `discord_avatar: text` - Discord 아바타 해시
  - `github: text` - GitHub 사용자명 (더 이상 unique 아님)
  - `name: text` - 회원 실명 (NOT NULL)
  - `created_at: timestamp` - 생성 일시 (DEFAULT: NOW())

### Table: generations

- **Location**: `apps/server/src/infrastructure/persistence/drizzle-db/schema.ts` (L51-L67)
- **Purpose**: 기수 테이블 (조직에 속함)
- **Columns**:
  - `id: serial` - PK
  - `organization_id: integer` - 조직 ID (FK → organizations.id, NOT NULL)
  - `name: text` - 기수명 (NOT NULL)
  - `started_at: timestamp` - 시작일 (NOT NULL)
  - `is_active: boolean` - 활성화 상태 (DEFAULT: true)
  - `created_at: timestamp` - 생성 일시 (DEFAULT: NOW())
- **Indexes**:
  - `generations_org_idx` - organization_id 컬럼
- **Foreign Keys**:
  - `organization_id` → `organizations.id`

### Table: cycles

- **Location**: `apps/server/src/infrastructure/persistence/drizzle-db/schema.ts` (L69-L86)
- **Purpose**: 사이클(주차) 테이블 (기수에 속함)
- **Columns**:
  - `id: serial` - PK
  - `generation_id: integer` - 기수 ID (FK → generations.id, NOT NULL)
  - `week: integer` - 주차 번호 (NOT NULL)
  - `start_date: timestamp` - 시작일 (NOT NULL)
  - `end_date: timestamp` - 종료일 (NOT NULL)
  - `github_issue_url: text` - GitHub Issue URL
  - `created_at: timestamp` - 생성 일시 (DEFAULT: NOW())
- **Indexes**:
  - `cycles_generation_idx` - generation_id 컬럼
- **Foreign Keys**:
  - `generation_id` → `generations.id`

### Table: organization_members

- **Location**: `apps/server/src/infrastructure/persistence/drizzle-db/schema.ts` (L88-L111)
- **Purpose**: 조직-회원 조인 테이블 (다대다 관계)
- **Columns**:
  - `id: serial` - PK
  - `organization_id: integer` - 조직 ID (FK → organizations.id, NOT NULL)
  - `member_id: integer` - 회원 ID (FK → members.id, NOT NULL)
  - `role: organization_role` - 역할 (OWNER/ADMIN/MEMBER, NOT NULL)
  - `status: organization_member_status` - 상태 (PENDING/APPROVED/REJECTED/INACTIVE, NOT NULL)
  - `joined_at: timestamp` - 가입 일시 (DEFAULT: NOW())
  - `updated_at: timestamp` - 상태 변경 일시 (DEFAULT: NOW())
- **Indexes**:
  - `org_members_org_member_idx` - (organization_id, member_id)
  - `org_members_status_idx` - status 컬럼
- **Foreign Keys**:
  - `organization_id` → `organizations.id`
  - `member_id` → `members.id`

### Table: generation_members (Deprecated)

- **Location**: `apps/server/src/infrastructure/persistence/drizzle-db/schema.ts` (L113-L132)
- **Purpose**: 기수-회원 조인 테이블 (organization_members로 대체됨)
- **Status**: Deprecated (하위 호환용으로 유지)

### Table: submissions

- **Location**: `apps/server/src/infrastructure/persistence/drizzle-db/schema.ts` (L134-L156)
- **Purpose**: 제출 테이블
- **Columns**:
  - `id: serial` - PK
  - `cycle_id: integer` - 사이클 ID (FK → cycles.id, NOT NULL)
  - `member_id: integer` - 회원 ID (FK → members.id, NOT NULL)
  - `url: text` - 블로그 글 URL (NOT NULL)
  - `submitted_at: timestamp` - 제출 일시 (DEFAULT: NOW())
  - `github_comment_id: text` - GitHub 댓글 ID (UNIQUE, 중복 방지)
- **Indexes**:
  - `submissions_cycle_member_idx` - (cycle_id, member_id)
  - `submissions_github_comment_idx` - github_comment_id
- **Foreign Keys**:
  - `cycle_id` → `cycles.id`
  - `member_id` → `members.id`

## Repository Implementations

### DrizzleOrganizationRepository

- **Location**: `apps/server/src/infrastructure/persistence/drizzle/organization.repository.impl.ts`
- **Purpose**: OrganizationRepository 인터페이스의 Drizzle ORM 구현체
- **Methods**:
  - `save(organization)` - UPSERT (id가 0이면 INSERT, 아니면 UPDATE)
  - `findById(id)` - SELECT WHERE id = ?
  - `findBySlug(slug)` - SELECT WHERE slug = ?
  - `findAll()` - SELECT ALL

### DrizzleMemberRepository

- **Location**: `apps/server/src/infrastructure/persistence/drizzle/member.repository.impl.ts`
- **Purpose**: MemberRepository 인터페이스의 Drizzle ORM 구현체
- **Methods**:
  - `save(member)` - UPSERT
  - `findById(id)` - SELECT WHERE id = ?
  - `findByDiscordId(discordId)` - SELECT WHERE discord_id = ?
  - `findByGithubUsername(github)` - SELECT WHERE github = ?
  - `findAll()` - SELECT ALL

### DrizzleCycleRepository

- **Location**: `apps/server/src/infrastructure/persistence/drizzle/cycle.repository.impl.ts`
- **Purpose**: CycleRepository 인터페이스의 Drizzle ORM 구현체
- **Methods**:
  - `save(cycle)` - UPSERT
  - `findById(id)` - SELECT WHERE id = ?
  - `findByGenerationAndWeek(generationId, week)` - SELECT WHERE generation_id = ? AND week = ?
  - `findByIssueUrl(issueUrl)` - SELECT WHERE github_issue_url = ?
  - `findActiveCyclesByGeneration(generationId)` - SELECT WHERE generation_id = ? AND start_date <= NOW() AND end_date >= NOW()

### DrizzleSubmissionRepository

- **Location**: `apps/server/src/infrastructure/persistence/drizzle/submission.repository.impl.ts`
- **Purpose**: SubmissionRepository 인터페이스의 Drizzle ORM 구현체
- **Methods**:
  - `save(submission)` - INSERT
  - `findById(id)` - SELECT WHERE id = ?
  - `findByCycleId(cycleId)` - SELECT WHERE cycle_id = ?
  - `findByGithubCommentId(githubCommentId)` - SELECT WHERE github_comment_id = ?

### DrizzleGenerationRepository

- **Location**: `apps/server/src/infrastructure/persistence/drizzle/generation.repository.impl.ts`
- **Purpose**: GenerationRepository 인터페이스의 Drizzle ORM 구현체
- **Methods**:
  - `save(generation)` - UPSERT
  - `findById(id)` - SELECT WHERE id = ?
  - `findActiveByOrganization(organizationId)` - SELECT WHERE organization_id = ? AND is_active = true

### DrizzleOrganizationMemberRepository

- **Location**: `apps/server/src/infrastructure/persistence/drizzle/organization-member.repository.impl.ts`
- **Purpose**: OrganizationMemberRepository 인터페이스의 Drizzle ORM 구현체
- **Methods**:
  - `save(organizationMember)` - UPSERT
  - `findById(id)` - SELECT WHERE id = ?
  - `findByOrganizationAndMember(organizationId, memberId)` - SELECT WHERE organization_id = ? AND member_id = ?
  - `findActiveByOrganization(organizationId)` - SELECT WHERE organization_id = ? AND status = 'APPROVED'
  - `isActiveMember(organizationId, memberId)` - EXISTS (SELECT 1 WHERE organization_id = ? AND member_id = ? AND status = 'APPROVED')
