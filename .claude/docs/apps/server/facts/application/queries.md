# Application Layer - Queries (상태 조회 유스케이스)

---
metadata:
  layer: Application
  pattern: CQRS (Query)
  last_verified: "2026-01-05T10:00:00Z"
  git_commit: "ac29965"
---

## 개요

Query는 시스템의 상태를 조회하는 유스케이스를 구현합니다. CQRS 패턴의 Query 부분으로, 상태를 변경하지 않고 데이터를 반환합니다.

## Query 목록

| Query | 목적 | Location |
|-------|------|----------|
| `GetCycleStatusQuery` | 사이클 현황 조회 | `application/queries/get-cycle-status.query.ts` |
| `GetReminderTargetsQuery` | 리마인더 대상 조회 | `application/queries/get-reminder-targets.query.ts` |
| `GetAllMembersQuery` | 전체 회원 조회 | `application/queries/get-all-members.query.ts` |
| `GetMemberByGithubQuery` | GitHub 사용자명으로 회원 조회 | `application/queries/get-member-by-github.query.ts` |
| `GetAllGenerationsQuery` | 전체 기수 조회 | `application/queries/get-all-generations.query.ts` |
| `GetGenerationByIdQuery` | 기수 ID로 조회 | `application/queries/get-generation-by-id.query.ts` |
| `GetCycleByIdQuery` | 사이클 ID로 조회 | `application/queries/get-cycle-by-id.query.ts` |
| `GetCyclesByGenerationQuery` | 기수별 사이클 조회 | `application/queries/get-cycles-by-generation.query.ts` |

## GetCycleStatusQuery

- **Location**: `src/application/queries/get-cycle-status.query.ts` (L70-L218)
- **Purpose**: 사이클 제출 현황 조회 (Discord bot, status API용)

### Methods

#### getCurrentCycle()

- **Return**: `Promise<CurrentCycleResult | null>`
- **Purpose**: 현재 진행 중인 사이클 조회

```typescript
interface CurrentCycleResult {
  id: number;
  week: number;
  generationName: string;
  startDate: string;
  endDate: string;
  githubIssueUrl: string | null;
  daysLeft: number;
  hoursLeft: number;
}
```

#### getCycleStatus(cycleId)

- **Return**: `Promise<CycleStatusResult>`
- **Purpose**: 특정 사이클의 제출 현황 조회

```typescript
interface CycleStatusResult {
  cycle: {
    id: number;
    week: number;
    startDate: string;
    endDate: string;
    generationName: string;
  };
  summary: {
    total: number;
    submitted: number;
    notSubmitted: number;
  };
  submitted: SubmittedMember[];
  notSubmitted: NotSubmittedMember[];
}
```

#### getCycleParticipantNames(cycleId)

- **Return**: `Promise<CycleParticipantNamesResult | null>`
- **Purpose**: Discord 메시지용 제출자/미제출자 이름 목록 조회

```typescript
interface CycleParticipantNamesResult {
  cycleName: string;
  submittedNames: string[];
  notSubmittedNames: string[];
  endDate: Date;
}
```

### 의존성

- `CycleRepository` - 사이클 조회
- `GenerationRepository` - 기수 조회
- `SubmissionRepository` - 제출 목록 조회
- `MemberRepository` - 회원 목록 조회

## GetReminderTargetsQuery

- **Location**: `src/application/queries/get-reminder-targets.query.ts` (L48-L119)
- **Purpose**: 리마인더 발송 대상 조회 (n8n workflow용)

### Methods

#### getCyclesWithDeadlineIn(hoursBefore)

- **Return**: `Promise<ReminderCycleInfo[]>`
- **Purpose**: 마감 시간이 특정 시간 내인 사이클 조회

```typescript
interface ReminderCycleInfo {
  cycleId: number;
  cycleName: string;
  endDate: string;
  githubIssueUrl: string | null;
}
```

#### getNotSubmittedMembers(cycleId)

- **Return**: `Promise<NotSubmittedResult>`
- **Purpose**: 특정 사이클의 미제출자 목록 조회

```typescript
interface NotSubmittedResult {
  cycleId: number;
  week: number;
  endDate: string;
  notSubmitted: NotSubmittedMemberInfo[];
  submittedCount: number;
  totalMembers: number;
}

interface NotSubmittedMemberInfo {
  github: string;
  name: string;
  discordId: string | null;
}
```

### 의존성

- `CycleRepository` - 사이클 조회
- `GenerationRepository` - 활성화된 기수 조회
- `SubmissionRepository` - 제출 목록 조회
- `MemberRepository` - 회원 목록 조회

## GetMemberByGithubQuery

- **Location**: `src/application/queries/get-member-by-github.query.ts`
- **Purpose**: GitHub 사용자명으로 회원 조회

### Method

```typescript
async execute(githubUsername: string): Promise<Member | null>
```

## GetAllMembersQuery

- **Location**: `src/application/queries/get-all-members.query.ts`
- **Purpose**: 전체 회원 목록 조회

### Method

```typescript
async execute(): Promise<Member[]>
```

## GetGenerationByIdQuery

- **Location**: `src/application/queries/get-generation-by-id.query.ts`
- **Purpose**: 기수 ID로 조회

### Method

```typescript
async execute(id: number): Promise<Generation | null>
```

## GetAllGenerationsQuery

- **Location**: `src/application/queries/get-all-generations.query.ts`
- **Purpose**: 전체 기수 목록 조회

### Method

```typescript
async execute(): Promise<Generation[]>
```

## GetCycleByIdQuery

- **Location**: `src/application/queries/get-cycle-by-id.query.ts`
- **Purpose**: 사이클 ID로 조회

### Method

```typescript
async execute(id: number): Promise<Cycle | null>
```

## GetCyclesByGenerationQuery

- **Location**: `src/application/queries/get-cycles-by-generation.query.ts`
- **Purpose**: 기수별 사이클 목록 조회

### Method

```typescript
async execute(generationId: number): Promise<Cycle[]>
```

## 사용 예시

### 현재 사이클 조회 (Discord Bot)

```typescript
const currentCycle = await getCycleStatusQuery.getCurrentCycle();

if (currentCycle) {
  console.log(`현재 주차: ${currentCycle.generationName} - ${currentCycle.week}주차`);
  console.log(`마감까지: ${currentCycle.daysLeft}일 ${currentCycle.hoursLeft}시간`);
}
```

### 제출 현황 조회 (Status API)

```typescript
const status = await getCycleStatusQuery.getCycleStatus(cycleId);

console.log(`전체: ${status.summary.total}명`);
console.log(`제출: ${status.summary.submitted}명`);
console.log(`미제출: ${status.summary.notSubmitted}명`);

status.submitted.forEach(member => {
  console.log(`✅ ${member.name}: ${member.url}`);
});

status.notSubmitted.forEach(member => {
  console.log(`❌ ${member.name}`);
});
```

### 리마인더 대상 조회 (n8n)

```typescript
// 마감 24시간 내 사이클 조회
const cycles = await getReminderTargetsQuery.getCyclesWithDeadlineIn(24);

for (const cycle of cycles) {
  // 미제출자 목록 조회
  const result = await getReminderTargetsQuery.getNotSubmittedMembers(cycle.cycleId);

  if (result.notSubmitted.length > 0) {
    const names = result.notSubmitted.map(m => m.name);
    // Discord 알림 전송
    await discordClient.sendReminderNotification(
      webhookUrl,
      cycle.cycleName,
      new Date(result.endDate),
      names
    );
  }
}
```

### 회원 조회

```typescript
// GitHub 사용자명으로 조회
const member = await getMemberByGithubQuery.execute('john-doe');

// 전체 회원 조회
const members = await getAllMembersQuery.execute();
```

### 기수 조회

```typescript
// 전체 기수 조회
const generations = await getAllGenerationsQuery.execute();

// 특정 기수 조회
const generation = await getGenerationByIdQuery.execute(1);
```

### 사이클 조회

```typescript
// 기수별 사이클 조회
const cycles = await getCyclesByGenerationQuery.execute(1);

// 특정 사이클 조회
const cycle = await getCycleByIdQuery.execute(1);
```

## Query 패턴 특징

1. **상태 불변**: Query는 상태를 변경하지 않음
2. **최적화된 조회**: 필요한 데이터만 조합해서 반환
3. **DTO 반환**: 도메인 엔티티를 필요에 따라 DTO로 변환
4. **에러 처리**: `NotFoundError` 등 도메인 에러 전파
