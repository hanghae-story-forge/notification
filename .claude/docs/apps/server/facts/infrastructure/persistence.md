# Infrastructure Persistence Layer

---
metadata:
  version: "2.0.0"
  created_at: "2026-01-11T00:00:00Z"
  last_verified: "2026-01-11T00:00:00Z"
  git_commit: "cdbdf2d"
  scope: "apps/server/src/infrastructure/persistence"
  source_files:
    apps/server/src/infrastructure/persistence/drizzle-db/schema.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/infrastructure/persistence/drizzle/cycle.repository.impl.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/infrastructure/persistence/drizzle/member.repository.impl.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/infrastructure/persistence/drizzle/submission.repository.impl.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/infrastructure/persistence/drizzle/generation.repository.impl.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/infrastructure/persistence/drizzle/organization.repository.impl.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/infrastructure/persistence/drizzle/organization-member.repository.impl.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/infrastructure/persistence/drizzle/generation-member.repository.impl.ts:
      git_hash: "cdbdf2d"
      source_exists: true
---

## Database Schema (Drizzle ORM)

- **Location**: `apps/server/src/infrastructure/persistence/drizzle-db/schema.ts`
- **ORM**: Drizzle ORM with PostgreSQL (postgres.js driver)
- **Tables**:

### organizations

- **Purpose**: 조직(스터디 그룹) 테이블
- **Columns**:
  - `id: serial` (PK)
  - `name: text` (NOT NULL, UNIQUE) - 조직 이름
  - `slug: text` (NOT NULL, UNIQUE) - URL 식별자
  - `discordWebhookUrl: text` - Discord 웹훅 URL
  - `isActive: boolean` (DEFAULT true) - 활성화 상태
  - `createdAt: timestamp` (DEFAULT now())
- **Indexes**: `slugIdx` on `slug`

### members

- **Purpose**: 회원 테이블 (Discord 기반 인증)
- **Columns**:
  - `id: serial` (PK)
  - `discordId: text` (NOT NULL, UNIQUE) - Discord User ID (고유 식별자)
  - `discordUsername: text` - Discord username (변경 가능)
  - `discordAvatar: text` - Discord avatar hash
  - `githubUsername: text` - GitHub username (선택, 더 이상 unique 아님)
  - `name: text` (NOT NULL) - 회원 이름
  - `createdAt: timestamp` (DEFAULT now())

### generations

- **Purpose**: 기수 테이블
- **Columns**:
  - `id: serial` (PK)
  - `organizationId: integer` (NOT NULL, FK → organizations.id) - 조직 ID
  - `name: text` (NOT NULL) - 기수명 (예: "똥글똥글 1기")
  - `startedAt: timestamp` (NOT NULL) - 시작일
  - `isActive: boolean` (DEFAULT true) - 활성화 상태
  - `createdAt: timestamp` (DEFAULT now())
- **Indexes**: `orgIdx` on `organizationId`

### cycles

- **Purpose**: 사이클(주차) 테이블
- **Columns**:
  - `id: serial` (PK)
  - `generationId: integer` (NOT NULL, FK → generations.id) - 기수 ID
  - `week: integer` (NOT NULL) - 주차 번호 (1, 2, 3...)
  - `startDate: timestamp` (NOT NULL) - 시작일
  - `endDate: timestamp` (NOT NULL) - 종료일
  - `githubIssueUrl: text` - GitHub Issue URL
  - `createdAt: timestamp` (DEFAULT now())
- **Indexes**: `generationIdx` on `generationId`

### organization_members

- **Purpose**: 조직-멤버 조인 테이블 (멀티 테넌트 지원)
- **Columns**:
  - `id: serial` (PK)
  - `organizationId: integer` (NOT NULL, FK → organizations.id)
  - `memberId: integer` (NOT NULL, FK → members.id)
  - `role: organization_role` (NOT NULL) - 역할 (OWNER, ADMIN, MEMBER)
  - `status: organization_member_status` (NOT NULL) - 상태 (PENDING, APPROVED, REJECTED, INACTIVE)
  - `joinedAt: timestamp` (DEFAULT now())
  - `updatedAt: timestamp` (DEFAULT now())
- **Indexes**: `orgMemberIdx` on `(organizationId, memberId)`, `statusIdx` on `status`

### generation_members

- **Purpose**: 기수-멤버 조인 테이블 (deprecated, organization_members로 대체)
- **Columns**:
  - `id: serial` (PK)
  - `generationId: integer` (NOT NULL, FK → generations.id)
  - `memberId: integer` (NOT NULL, FK → members.id)
  - `joinedAt: timestamp` (DEFAULT now())
- **Indexes**: `generationMemberIdx` on `(generationId, memberId)`

### submissions

- **Purpose**: 제출 테이블
- **Columns**:
  - `id: serial` (PK)
  - `cycleId: integer` (NOT NULL, FK → cycles.id)
  - `memberId: integer` (NOT NULL, FK → members.id)
  - `url: text` (NOT NULL) - 블로그 글 URL
  - `submittedAt: timestamp` (DEFAULT now())
  - `githubCommentId: text` (UNIQUE) - GitHub 댓글 ID (중복 방지)
- **Indexes**: `cycleMemberIdx` on `(cycleId, memberId)`

### Enums

```typescript
enum organization_member_status {
  PENDING,
  APPROVED,
  REJECTED,
  INACTIVE
}

enum organization_role {
  OWNER,
  ADMIN,
  MEMBER
}
```

## Repository Implementations

### CycleRepositoryImpl

- **Location**: `apps/server/src/infrastructure/persistence/drizzle/cycle.repository.impl.ts`
- **Purpose**: Cycle repository 구현 (Drizzle ORM)
- **Key Methods**:
  - `save(cycle)` - Drizzle transaction으로 upsert
  - `findById(id)` - `select().where(eq(id))`
  - `findByIssueUrl(issueUrl)` - `where(eq(githubIssueUrl))`
  - `findActiveCyclesByGeneration(generationId)` - `where(isActive())`
  - `findCyclesWithDeadlineInRangeByOrganization(orgId, start, end)` - 복잡한 날짜 범위 쿼리

### MemberRepositoryImpl

- **Location**: `apps/server/src/infrastructure/persistence/drizzle/member.repository.impl.ts`
- **Purpose**: Member repository 구현
- **Key Methods**:
  - `save(member)` - upsert (discordId unique)
  - `findByDiscordId(discordId)` - 주요 조회 방식
  - `findByGithubUsername(githubUsername)` - GitHub username으로 조회
  - `findAll()` - 전체 조회

### SubmissionRepositoryImpl

- **Location**: `apps/server/src/infrastructure/persistence/drizzle/submission.repository.impl.ts`
- **Purpose**: Submission repository 구현
- **Key Methods**:
  - `save(submission)` - insert (githubCommentId unique)
  - `findByCycleId(cycleId)` - `where(eq(cycleId))`
  - `findByGithubCommentId(commentId)` - 중복 체크용
  - `existsByGithubCommentId(commentId)` - boolean 반환

### GenerationRepositoryImpl

- **Location**: `apps/server/src/infrastructure/persistence/drizzle/generation.repository.impl.ts`
- **Purpose**: Generation repository 구현
- **Key Methods**:
  - `findActiveByOrganization(organizationId)` - 조직의 활성 기수 조회
  - `findByOrganization(organizationId)` - 조직의 모든 기수 조회

### OrganizationRepositoryImpl

- **Location**: `apps/server/src/infrastructure/persistence/drizzle/organization.repository.impl.ts`
- **Purpose**: Organization repository 구현
- **Key Methods**:
  - `findBySlug(slug)` - 주요 조회 방식
  - `save(organization)` - upsert (slug unique)

### OrganizationMemberRepositoryImpl

- **Location**: `apps/server/src/infrastructure/persistence/drizzle/organization-member.repository.impl.ts`
- **Purpose**: OrganizationMember repository 구현
- **Key Methods**:
  - `findActiveByOrganization(organizationId)` - 활성 멤버 조회
  - `isActiveMember(organizationId, memberId)` - 활성 멤버 확인
  - `findByOrganizationAndMember(organizationId, memberId)` - 조직+회원으로 조회

### GenerationMemberRepositoryImpl

- **Location**: `apps/server/src/infrastructure/persistence/drizzle/generation-member.repository.impl.ts`
- **Purpose**: GenerationMember repository 구현
- **Key Methods**:
  - `findByGeneration(generationId)` - 기수별 조회
  - `findByMember(memberId)` - 회원별 조회

## Database Connection

- **Location**: `apps/server/src/infrastructure/lib/db.ts`
- **Driver**: postgres.js
- **Connection String**: `DATABASE_URL` environment variable
- **Default**: `postgresql://localhost:5432/dongueldonguel`

## Evidence

```typescript
// Schema example: members table (L41-L49)
export const members = pgTable('members', {
  id: serial('id').primaryKey(),
  discordId: text('discord_id').notNull().unique(), // 고유 식별자
  discordUsername: text('discord_username'),
  discordAvatar: text('discord_avatar'),
  githubUsername: text('githubUsername'), // 더 이상 unique 아님
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```
