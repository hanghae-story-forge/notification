# Cycle Domain

- **Scope**: apps/server
- **Layer**: domain
- **Source of Truth**: apps/server/src/domain/cycle/
- **Last Verified**: 2025-01-07
- **Repo Ref**: 82509c3

## Cycle Entity

- **Location**: `apps/server/src/domain/cycle/cycle.domain.ts` (L40-L173)
- **Type**: Aggregate Root
- **Purpose**: 격주 글쓰기 모임의 주차(사이클)를 나타내는 엔티티
- **Key Properties**:
  - `_generationId: number` - 기수 ID (외부 참조)
  - `_week: Week` - 주차 번호 (1, 2, 3...)
  - `_dateRange: DateRange` - 시작일/종료일 범위
  - `_githubIssueUrl: GitHubIssueUrl | null` - GitHub Issue URL
  - `_createdAt: Date` - 생성 일시
- **Domain Events**:
  - `CycleCreatedEvent` - 사이클 생성 시 발행
- **Business Logic**:
  - `getHoursRemaining()` - 마감까지 남은 시간
  - `isPast()` - 마감이 지났는지 확인
  - `isActive()` - 현재 진행 중인지 확인
  - `belongsToGeneration(generationId)` - 특정 기수에 속하는지 확인

## CycleRepository Interface

- **Location**: `apps/server/src/domain/cycle/cycle.repository.ts`
- **Methods**:
  - `save(cycle): Promise<void>` - 사이클 저장
  - `findById(id): Promise<Cycle | null>` - ID로 조회
  - `findByGenerationAndWeek(generationId, week): Promise<Cycle | null>` - 기수와 주차로 조회
  - `findByIssueUrl(issueUrl): Promise<Cycle | null>` - GitHub Issue URL로 조회
  - `findActiveCyclesByGeneration(generationId): Promise<Cycle[]>` - 기수의 진행 중인 사이클
