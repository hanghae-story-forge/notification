# Cycle Domain

---
metadata:
  version: "2.0.0"
  created_at: "2026-01-11T00:00:00Z"
  last_verified: "2026-01-11T00:00:00Z"
  git_commit: "cdbdf2d"
  scope: "apps/server/src/domain/cycle"
  source_files:
    apps/server/src/domain/cycle/cycle.domain.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/domain/cycle/cycle.repository.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/domain/cycle/vo/week.vo.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/domain/cycle/vo/date-range.vo.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/domain/cycle/vo/github-issue-url.vo.ts:
      git_hash: "cdbdf2d"
      source_exists: true
---

## Cycle Entity

- **Location**: `apps/server/src/domain/cycle/cycle.domain.ts` (L40-L173)
- **Type**: Aggregate Root
- **Purpose**: 격주 글쓰기 모임의 주차(사이클)를 나타내는 엔티티

### Key Properties

- `id: CycleId` - 사이클 ID (EntityId 상속)
- `_generationId: number` - 기수 ID (외부 참조)
- `_week: Week` - 주차 번호 (1, 2, 3...)
- `_dateRange: DateRange` - 시작일/종료일 범위
- `_githubIssueUrl: GitHubIssueUrl | null` - GitHub Issue URL (선택)
- `_createdAt: Date` - 생성 일시

### Factory Methods

#### `create(data: CreateCycleData): Cycle`

- **Purpose**: 새 사이클 생성
- **Location**: L54-L78
- **Input**:
  - `id?: number` - ID (선택)
  - `generationId: number` - 기수 ID (필수)
  - `week: number` - 주차 번호 (필수)
  - `startDate: Date` - 시작일 (필수)
  - `endDate: Date` - 종료일 (필수)
  - `githubIssueUrl?: string` - GitHub Issue URL (선택)
  - `createdAt?: Date` - 생성일시 (선택)
- **Output**: Cycle entity
- **Domain Events**: `CycleCreatedEvent` (새 생성 시에만)

#### `reconstitute(data): Cycle`

- **Purpose**: DB에서 조회한 엔티티 복원
- **Location**: L81-L99
- **Input**: DB 조회 데이터
- **Output**: Cycle entity (도메인 이벤트 없음)

### Business Logic

- `getHoursRemaining(): number` - 마감까지 남은 시간 (시간 단위) (L131-L133)
- `isPast(): boolean` - 마감이 지났는지 확인 (L136-L138)
- `isActive(): boolean` - 현재 진행 중인지 확인 (L141-L143)
- `belongsToGeneration(generationId: number): boolean` - 특정 기수에 속하는지 확인 (L146-L148)

### DTO

```typescript
interface CycleDTO {
  id: number;
  generationId: number;
  week: number;
  startDate: string;
  endDate: string;
  githubIssueUrl: string | null;
  createdAt: string;
}
```

## Cycle Value Objects

### Week

- **Location**: `apps/server/src/domain/cycle/vo/week.vo.ts` (L5-L38)
- **Purpose**: 주차 Value Object
- **Validation**: 1-52 사이의 정수
- **Methods**:
  - `create(value: number): Week`
  - `equals(other: Week): boolean`
  - `toString(): string` - "${value}주차" 반환
  - `toNumber(): number`

### DateRange

- **Location**: `apps/server/src/domain/cycle/vo/date-range.vo.ts` (L5-L88)
- **Purpose**: 날짜 범위 Value Object
- **Validation**: startDate <= endDate
- **Methods**:
  - `create(startDate: Date, endDate: Date): DateRange`
  - `fromWeek(startDate: Date): DateRange` - 시작일로부터 7일간
  - `equals(other: DateRange): boolean`
  - `getHoursRemaining(): number` - 마감까지 남은 시간
  - `getDaysRemaining(): number` - 마감까지 남은 일수
  - `isPast(): boolean` - 마감 지났는지
  - `isActive(): boolean` - 현재 진행 중인지

### GitHubIssueUrl

- **Location**: `apps/server/src/domain/cycle/vo/github-issue-url.vo.ts`
- **Purpose**: GitHub Issue URL Value Object
- **Validation**: 유효한 GitHub Issue URL 형식
- **Methods**:
  - `create(url: string): GitHubIssueUrl`
  - `createOrNull(url: string | null): GitHubIssueUrl | null`

## Cycle Repository Interface

- **Location**: `apps/server/src/domain/cycle/cycle.repository.ts`
- **Purpose**: 사이클 저장소 인터페이스

### Methods

- `save(cycle: Cycle): Promise<void>` - 사이클 저장
- `findById(id: CycleId): Promise<Cycle | null>` - ID로 조회
- `findByGenerationAndWeek(generationId: number, week: Week): Promise<Cycle | null>` - 기수와 주차로 조회
- `findByIssueUrl(issueUrl: string): Promise<Cycle | null>` - GitHub Issue URL로 조회
- `findActiveCyclesByGeneration(generationId: number): Promise<Cycle[]>` - 기수의 진행 중인 사이클
- `findCyclesWithDeadlineInRangeByOrganization(organizationId: number, start: Date, end: Date): Promise<Cycle[]>` - 조직의 마감 임박한 사이클 조회

## Domain Events

### CycleCreatedEvent

- **Location**: `apps/server/src/domain/cycle/cycle.domain.ts` (L16-L27)
- **Type**: `CycleCreated` (const)
- **Properties**:
  - `cycleId: CycleId`
  - `week: Week`
  - `dateRange: DateRange`
  - `occurredAt: Date`
- **Trigger**: 새 사이클 생성 시 (`data.id === 0`)

## Evidence

```typescript
// Cycle entity creation (L54-L78)
static create(data: CreateCycleData): Cycle {
  const week = Week.create(data.week);
  const dateRange = DateRange.create(data.startDate, data.endDate);
  const githubIssueUrl = GitHubIssueUrl.createOrNull(data.githubIssueUrl);

  const id = data.id ? CycleId.create(data.id) : CycleId.create(0);
  const cycle = new Cycle(id, generationId, week, dateRange, githubIssueUrl, createdAt);

  if (data.id === 0) {
    cycle.addDomainEvent(new CycleCreatedEvent(id, week, dateRange));
  }

  return cycle;
}
```
