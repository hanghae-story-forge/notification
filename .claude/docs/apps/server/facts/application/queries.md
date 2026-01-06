# CQRS Query Handlers

- **Scope**: apps/server
- **Layer**: application
- **Source of Truth**: apps/server/src/application/queries/
- **Last Verified**: 2025-01-07
- **Repo Ref**: 82509c3

## GetOrganizationQuery

- **Location**: `apps/server/src/application/queries/get-organization.query.ts` (L26-L39)
- **Purpose**: Slug으로 조직 조회
- **Input**: `GetOrganizationRequest`
  - `slug: string` - 조직 식별자
- **Output**: `GetOrganizationResult`
  - `organization: Organization | null` - 조회된 조직
- **Dependencies**:
  - `OrganizationRepository`

## GetOrganizationMembersQuery

- **Location**: `apps/server/src/application/queries/get-organization-members.query.ts`
- **Purpose**: 조직의 멤버 목록 조회
- **Input**: 조직 Slug 또는 ID
- **Output**: 조직원 목록 (역할, 상태 포함)

## GetMemberOrganizationsQuery

- **Location**: `apps/server/src/application/queries/get-member-organizations.query.ts`
- **Purpose**: 회원이 속한 조직 목록 조회
- **Input**: 회원 ID 또는 Discord ID
- **Output**: 조직 목록

## GetAllMembersQuery

- **Location**: `apps/server/src/application/queries/get-all-members.query.ts`
- **Purpose**: 전체 회원 목록 조회
- **Input**: 없음
- **Output**: `Member[]` - 전체 회원 목록
- **Dependencies**:
  - `MemberRepository`

## GetMemberByGithubQuery

- **Location**: `apps/server/src/application/queries/get-member-by-github.query.ts`
- **Purpose**: GitHub 사용자명으로 회원 조회
- **Input**: `github: string` - GitHub 사용자명
- **Output**: `Member | null` - 조회된 회원
- **Dependencies**:
  - `MemberRepository`

## GetAllGenerationsQuery

- **Location**: `apps/server/src/application/queries/get-all-generations.query.ts`
- **Purpose**: 전체 기수 목록 조회
- **Input**: 없음 (또는 조직 ID로 필터링)
- **Output**: `Generation[]` - 전체 기수 목록
- **Dependencies**:
  - `GenerationRepository`

## GetGenerationByIdQuery

- **Location**: `apps/server/src/application/queries/get-generation-by-id.query.ts`
- **Purpose**: ID로 기수 조회
- **Input**: `id: number` - 기수 ID
- **Output**: `Generation | null` - 조회된 기수
- **Dependencies**:
  - `GenerationRepository`

## GetCycleByIdQuery

- **Location**: `apps/server/src/application/queries/get-cycle-by-id.query.ts`
- **Purpose**: ID로 사이클 조회
- **Input**: `id: number` - 사이클 ID
- **Output**: `Cycle | null` - 조회된 사이클
- **Dependencies**:
  - `CycleRepository`

## GetCyclesByGenerationQuery

- **Location**: `apps/server/src/application/queries/get-cycles-by-generation.query.ts`
- **Purpose**: 기수별 사이클 목록 조회
- **Input**: `generationId?: number` - 기수 ID (선택)
- **Output**: `Cycle[]` - 사이클 목록
- **Dependencies**:
  - `CycleRepository`

## GetCycleStatusQuery

- **Location**: `apps/server/src/application/queries/get-cycle-status.query.ts` (L74-L285)
- **Purpose**: 사이클 제출 현황 조회 (조직 멤버만)
- **Methods**:
  1. `getCurrentCycle(organizationSlug)` - 현재 진행 중인 사이클 조회
  2. `getCycleStatus(cycleId, organizationSlug)` - 특정 사이클의 제출 현황
  3. `getCycleParticipantNames(cycleId, organizationSlug)` - 제출자/미제출자 이름 목록
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
- **Evidence**:
  ```typescript
  // L87-L129: 현재 진행 중인 사이클 조회
  async getCurrentCycle(organizationSlug: string): Promise<CurrentCycleResult | null> {
    const organization = await this.organizationRepo.findBySlug(organizationSlug);
    const generation = await this.generationRepo.findActiveByOrganization(organization.id.value);
    const cycles = await this.cycleRepo.findActiveCyclesByGeneration(generation.id.value);
    // ...
  }
  ```

## GetReminderTargetsQuery

- **Location**: `apps/server/src/application/queries/get-reminder-targets.query.ts`
- **Purpose**: 마감 임박 사이클 및 미제출자 조회 (n8n 워크플로우용)
- **Input**: `hoursBefore: number` - 마감 N시간 전
- **Output**: 
  - 마감 임박한 사이클 목록
  - 각 사이클별 미제출자 목록
- **Dependencies**:
  - `CycleRepository`
  - `SubmissionRepository`
  - `OrganizationMemberRepository`
