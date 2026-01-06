# GraphQL Presentation Layer

- **Scope**: apps/server
- **Layer**: presentation
- **Source of Truth**: apps/server/src/presentation/graphql/
- **Last Verified**: 2025-01-07
- **Repo Ref**: 82509c3

## Pylon GraphQL Service

- **Location**: `apps/server/src/presentation/graphql/pylon.service.ts`
- **Purpose**: Code-First GraphQL API (Pylon 프레임워크)
- **Approach**: TypeScript 클래스 정의로부터 GraphQL 스키마 자동 생성

### GraphQL Queries

- **Location**: `apps/server/src/presentation/graphql/pylon.service.ts` (L234-L316)

#### members

- **Purpose**: 전체 회원 목록 조회
- **Returns**: `GqlMember[]`
- **Handler**: `getAllMembersQuery.execute()`

#### member

- **Purpose**: GitHub 사용자명으로 회원 조회
- **Args**: `github: string`
- **Returns**: `GqlMember | null`
- **Handler**: `getMemberByGithubQuery.execute(github)`

#### generations

- **Purpose**: 전체 기수 목록 조회
- **Returns**: `GqlGeneration[]`
- **Handler**: `getAllGenerationsQuery.execute()`

#### generation

- **Purpose**: ID로 기수 조회
- **Args**: `id: number`
- **Returns**: `GqlGeneration | null`
- **Handler**: `getGenerationByIdQuery.execute(id)`

#### activeGeneration

- **Purpose**: 활성화된 기수 조회
- **Returns**: `GqlGeneration | null`
- **Handler**: `generationRepo.findActive()`

#### cycles

- **Purpose**: 사이클 목록 조회 (generationId로 필터링 가능)
- **Args**: `generationId?: number`
- **Returns**: `GqlCycle[]`
- **Handler**: `getCyclesByGenerationQuery.execute(generationId)`

#### cycle

- **Purpose**: ID로 사이클 조회
- **Args**: `id: number`
- **Returns**: `GqlCycle | null`
- **Handler**: `getCycleByIdQuery.execute(id)`

#### activeCycle

- **Purpose**: 현재 진행 중인 사이클 조회 (dongueldonguel 조직)
- **Returns**: `GqlCycle | null`
- **Handler**: `getCycleStatusQuery.getCurrentCycle('dongueldonguel')`
- **Note**: 현재 하드코딩된 조직 slug 사용

#### cycleStatus

- **Purpose**: 사이클별 제출 현황 조회
- **Args**: 
  - `cycleId: number`
  - `organizationSlug: string`
- **Returns**: `GqlCycleStatus`
- **Handler**: `getCycleStatusQuery.getCycleStatus(cycleId, organizationSlug)`

### GraphQL Mutations

- **Location**: `apps/server/src/presentation/graphql/pylon.service.ts` (L318-L382)

#### addMember

- **Purpose**: 회원 추가
- **Args**:
  - `github: string`
  - `name: string`
  - `discordId?: string`
- **Returns**: `GqlMember`
- **Handler**: `createMemberCommand.execute()`

#### addGeneration

- **Purpose**: 기수 생성
- **Args**:
  - `name: string`
  - `startedAt: string` (ISO 8601)
  - `organizationSlug: string`
- **Returns**: `GqlGeneration`
- **Handler**: `createGenerationCommand.execute()`

#### addCycle

- **Purpose**: 사이클 생성
- **Args**:
  - `generationId: number`
  - `week: number`
  - `startDate: string` (ISO 8601)
  - `endDate: string` (ISO 8601)
  - `githubIssueUrl: string`
  - `organizationSlug: string`
- **Returns**: `GqlCycle`
- **Handler**: `createCycleCommand.execute()`

#### addSubmission

- **Purpose**: 제출 추가 (현재 미구현)
- **Returns**: 에러 메시지 (GitHub webhook 사용 권장)
- **Note**: GitHub username과 githubIssueUrl이 필요하므로 webhook endpoint 사용 권장

### GraphQL Types

- **Location**: `apps/server/src/presentation/graphql/pylon.service.ts` (L86-L155)

#### GqlMember

- **Fields**: `id`, `github`, `discordId`, `name`, `createdAt`

#### GqlGeneration

- **Fields**: `id`, `name`, `startedAt`, `isActive`, `createdAt`

#### GqlCycle

- **Fields**: `id`, `generationId`, `week`, `startDate`, `endDate`, `githubIssueUrl`, `createdAt`

#### GqlCycleStatus

- **Fields**: `cycle`, `summary`, `submitted`, `notSubmitted`
