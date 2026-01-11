# CQRS Query Handlers

---
metadata:
  version: "2.0.0"
  created_at: "2026-01-11T00:00:00Z"
  last_verified: "2026-01-11T00:00:00Z"
  git_commit: "cdbdf2d"
  scope: "apps/server/src/application/queries"
  source_files:
    apps/server/src/application/queries/get-cycle-status.query.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/application/queries/get-reminder-targets.query.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/application/queries/get-organization.query.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/application/queries/get-all-members.query.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/application/queries/get-member-by-github.query.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/application/queries/get-all-generations.query.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/application/queries/get-generation-by-id.query.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/application/queries/get-cycle-by-id.query.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/application/queries/get-cycles-by-generation.query.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/application/queries/get-organization-members.query.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/application/queries/get-member-organizations.query.ts:
      git_hash: "cdbdf2d"
      source_exists: true
---

## GetCycleStatusQuery

- **Location**: `apps/server/src/application/queries/get-cycle-status.query.ts` (L74-L285)
- **Purpose**: 사이클 제출 현황 조회 (조직 멤버만)
- **Methods**:
  - `getCurrentCycle(organizationSlug)` - 현재 진행 중인 사이클 조회
  - `getCycleStatus(cycleId, organizationSlug)` - 특정 사이클의 제출 현황
  - `getCycleParticipantNames(cycleId, organizationSlug)` - 제출자/미제출자 이름 목록
- **Output**:
  - `CurrentCycleResult` - 현재 사이클 정보 (일수, 시간 남음)
  - `CycleStatusResult` - 제출 현황 (제출자, 미제출자 목록)
- **Dependencies**:
  - `CycleRepository`
  - `GenerationRepository`
  - `OrganizationRepository`
  - `SubmissionRepository`
  - `OrganizationMemberRepository`
  - `MemberRepository`

## GetReminderTargetsQuery

- **Location**: `apps/server/src/application/queries/get-reminder-targets.query.ts` (L51-L149)
- **Purpose**: 마감 임박 사이클 및 미제출자 조회 (n8n 워크플로우용)
- **Methods**:
  - `getCyclesWithDeadlineIn(organizationSlug, hoursBefore)` - 특정 시간 내 마감 사이클 조회
  - `getNotSubmittedMembers(cycleId, organizationSlug)` - 미제출자 목록 조회
- **Output**:
  - `ReminderCycleInfo[]` - 마감 임박한 사이클 목록
  - `NotSubmittedResult` - 미제출자 정보
- **Dependencies**:
  - `CycleRepository`
  - `GenerationRepository`
  - `OrganizationRepository`
  - `SubmissionRepository`
  - `OrganizationMemberRepository`
  - `MemberRepository`

## GetOrganizationQuery

- **Location**: `apps/server/src/application/queries/get-organization.query.ts` (L26-L39)
- **Purpose**: Slug으로 조직 조회
- **Input**: `slug: string` - 조직 식별자
- **Output**: `Organization | null`

## GetOrganizationMembersQuery

- **Purpose**: 조직의 멤버 목록 조회
- **Input**: 조직 Slug 또는 ID
- **Output**: 조직원 목록 (역할, 상태 포함)

## GetMemberOrganizationsQuery

- **Purpose**: 회원이 속한 조직 목록 조회
- **Input**: 회원 ID 또는 Discord ID
- **Output**: 조직 목록

## GetAllMembersQuery

- **Location**: `apps/server/src/application/queries/get-all-members.query.ts`
- **Purpose**: 전체 회원 목록 조회
- **Input**: 없음
- **Output**: `Member[]`

## GetMemberByGithubQuery

- **Location**: `apps/server/src/application/queries/get-member-by-github.query.ts`
- **Purpose**: GitHub 사용자명으로 회원 조회
- **Input**: `github: string` - GitHub 사용자명
- **Output**: `Member | null`

## GetAllGenerationsQuery

- **Location**: `apps/server/src/application/queries/get-all-generations.query.ts`
- **Purpose**: 전체 기수 목록 조회
- **Input**: 없음 (또는 조직 ID로 필터링)
- **Output**: `Generation[]`

## GetGenerationByIdQuery

- **Location**: `apps/server/src/application/queries/get-generation-by-id.query.ts`
- **Purpose**: ID로 기수 조회
- **Input**: `id: number` - 기수 ID
- **Output**: `Generation | null`

## GetCycleByIdQuery

- **Location**: `apps/server/src/application/queries/get-cycle-by-id.query.ts`
- **Purpose**: ID로 사이클 조회
- **Input**: `id: number` - 사이클 ID
- **Output**: `Cycle | null`

## GetCyclesByGenerationQuery

- **Location**: `apps/server/src/application/queries/get-cycles-by-generation.query.ts`
- **Purpose**: 기수별 사이클 목록 조회
- **Input**: `generationId?: number` - 기수 ID (선택)
- **Output**: `Cycle[]`
