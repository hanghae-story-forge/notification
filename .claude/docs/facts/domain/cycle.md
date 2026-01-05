# Cycle Domain - 사이클(주차) 도메인

---
metadata:
  domain: Cycle
  aggregate_root: Cycle
  bounded_context: Cycle Management
  last_verified: "2026-01-05T10:00:00Z"
  git_commit: "ac29965"
---

## 개요

사이클 도메인은 기수 내의 주차(1주차, 2주차 등)를 관리합니다. 각 사이클은 시작일과 종료일을 가지며, GitHub Issue URL과 연동됩니다.

## Aggregate Root: Cycle

- **Location**: `src/domain/cycle/cycle.domain.ts` (L41-L172)
- **Purpose**: 사이클 엔티티 (Aggregate Root)
- **Factory Methods**:
  - `Cycle.create(data)` - 새 사이클 생성
  - `Cycle.reconstitute(data)` - DB에서 조회한 엔티티 복원

### 속성 (Properties)

| Property | Type | Description |
|----------|------|-------------|
| `id` | `CycleId` | 사이클 ID (EntityId 상속) |
| `_generationId` | `number` | 소속 기수 ID |
| `_week` | `Week` | 주차 (1-52, Value Object) |
| `_dateRange` | `DateRange` | 날짜 범위 (Value Object) |
| `_githubIssueUrl` | `GitHubIssueUrl \| null` | GitHub Issue URL (Value Object, nullable) |
| `_createdAt` | `Date` | 생성 일시 |

### 비즈니스 로직 (Methods)

- **Location**: `src/domain/cycle/cycle.domain.ts` (L131-L148)
- `getHoursRemaining(): number` - 마감까지 남은 시간 (시간 단위)
- `isPast(): boolean` - 마감이 지났는지 확인
- `isActive(): boolean` - 현재 진행 중인지 확인
- `belongsToGeneration(generationId): boolean` - 특정 기수에 속하는지 확인
- `toDTO(): CycleDTO` - DTO로 변환

## Value Objects

### Week

- **Location**: `src/domain/cycle/vo/week.vo.ts` (L5-L38)
- **Purpose**: 주차 (1-52)
- **Validation**: 1-52 사이 정수 (`InvalidWeekError`)
- **Methods**:
  - `toString(): string` - "N주차" 형식 반환
  - `toNumber(): number` - 숫자 반환

### DateRange

- **Location**: `src/domain/cycle/vo/date-range.vo.ts` (L5-L88)
- **Purpose**: 날짜 범위 (시작일, 종료일)
- **Validation**: startDate < endDate (`InvalidDateRangeError`)
- **Factory Methods**:
  - `DateRange.create(startDate, endDate)` - 생성
  - `DateRange.fromWeek(startDate)` - 시작일로부터 7일 자동 계산
- **Methods**:
  - `getHoursRemaining(): number` - 마감까지 남은 시간
  - `getDaysRemaining(): number` - 마감까지 남은 일수
  - `isPast(): boolean` - 마감 지났는지
  - `isActive(): boolean` - 현재 진행 중인지

### GitHubIssueUrl

- **Location**: `src/domain/cycle/vo/github-issue-url.vo.ts` (L5-L53)
- **Purpose**: GitHub Issue URL
- **Validation**: `https://github.com/*/issues/*` 형식 (`InvalidGitHubIssueUrlError`)
- **Factory Methods**:
  - `GitHubIssueUrl.create(url)` - 생성 (검증 포함)
  - `GitHubIssueUrl.createOrNull(url)` - null 반환 허용

## Domain Events

### CycleCreatedEvent

- **Location**: `src/domain/cycle/cycle.domain.ts` (L16-L27)
- **Purpose**: 사이클 생성 시 발행
- **Payload**:
  - `cycleId: CycleId`
  - `week: Week`
  - `dateRange: DateRange`

## Repository Interface

### CycleRepository

- **Location**: `src/domain/cycle/cycle.repository.ts` (L5-L47)
- **Purpose**: 사이클 리포지토리 인터페이스 (Domain 계층 정의)

### Methods

| Method | Return Type | Description |
|--------|-------------|-------------|
| `save(cycle)` | `Promise<void>` | 사이클 저장 |
| `findById(id)` | `Promise<Cycle \| null>` | ID로 사이클 조회 |
| `findByIssueUrl(issueUrl)` | `Promise<Cycle \| null>` | GitHub Issue URL로 조회 |
| `findByGenerationAndWeek(generationId, week)` | `Promise<Cycle \| null>` | 기수와 주차로 조회 (중복 체크용) |
| `findByGeneration(generationId)` | `Promise<Cycle[]>` | 기수별 모든 사이클 조회 |
| `findActiveCyclesByGeneration(generationId)` | `Promise<Cycle[]>` | 활성화된 기수의 진행 중인 사이클 조회 |
| `findCyclesWithDeadlineInRange(generationId, startTime, endTime)` | `Promise<Cycle[]>` | 특정 시간 범위 내에 마감되는 사이클 조회 (리마인더용) |

## 비즈니스 규칙 (Constraints)

1. **주차 범위**: 1-52주차까지만 허용
2. **날짜 범위**: 시작일 < 종료일
3. **중복 방지**: 동일 기수 내에서 주차 중복 불가
4. **GitHub URL**: 유효한 GitHub Issue URL 형식만 허용

## 관계

- **Generation**: N:1 (여러 사이클이 하나의 기수에 속함)
- **Submission**: 1:N (한 사이클에 여러 제출)

## 사용 예시

### 사이클 생성

```typescript
// Domain Layer에서 직접 생성
const cycle = Cycle.create({
  generationId: 1,
  week: 1,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-01-08'),
  githubIssueUrl: 'https://github.com/org/repo/issues/1'
});

// 또는 Command 통해 생성 (권장)
const result = await createCycleCommand.execute({
  week: 1,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-01-08'),
  githubIssueUrl: 'https://github.com/org/repo/issues/1'
});
```

### 남은 시간 계산

```typescript
const hoursLeft = cycle.getHoursRemaining();
const daysLeft = Math.floor(hoursLeft / 24);

if (cycle.isPast()) {
  console.log('마감 지났음');
} else if (cycle.isActive()) {
  console.log(`진행 중: ${daysLeft}일 ${hoursLeft % 24}시간 남음`);
}
```

### 날짜 범위 자동 계산

```typescript
// 시작일로부터 7일 자동 계산
const dateRange = DateRange.fromWeek(new Date('2026-01-01'));
console.log(dateRange.startDate); // 2026-01-01
console.log(dateRange.endDate);   // 2026-01-08
```
