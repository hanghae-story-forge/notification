# Reminder Routes

- **Scope**: n8n 워크플로우용 리마인더 API
- **Source of Truth**: `src/routes/reminder/`
- **Last Verified**: 2026-01-05
- **Repo Ref**: df3a0ab

---
metadata:
  version: "1.0.1"
  created_at: "2025-01-05T10:00:00Z"
  last_verified: "2026-01-05T12:00:00Z"
  git_commit: "df3a0ab"
  source_files:
    src/routes/reminder/reminder.index.ts:
      git_hash: "df3a0ab"
      source_exists: true
    src/routes/reminder/reminder.routes.ts:
      git_hash: "df3a0ab"
      source_exists: true
    src/routes/reminder/reminder.handlers.ts:
      git_hash: "df3a0ab"
      source_exists: true
    src/routes/reminder/reminder.handlers.ts:
      git_hash: "70c2bdf3530c090d5e48c7649754b57b104f3fa5"
      source_exists: true
---

## GET /api/reminder

- **Location**: `src/routes/reminder/reminder.handlers.ts` (L9-32)
- **Purpose**: 마감 임박한 사이클 목록 조회 (n8n cron job용)
- **Handler**: `getReminderCycles`

### Request

**Query Parameters**:
```typescript
hoursBefore?: string  // 기본값: "24" (단위: 시간)
```

**Example**:
```
GET /api/reminder?hoursBefore=12
```

### Response

**200 OK**:
```typescript
{
  cycles: [
    {
      cycleId: number,
      cycleName: string,        // "{generation.name} - {week}주차"
      endDate: string,          // ISO 8601 datetime
      githubIssueUrl?: string
    }
  ]
}
```

### Query Logic

1. **현재 시간** 기준으로 `hoursBefore` 시간 후의 시점 계산
2. **조건**: `generations.isActive = true` AND `cycles.endDate < (now + hoursBefore)` AND `cycles.endDate > now`
3. **결과**: 마감 시간이 지정된 윈도우 내에 있는 활성 사이클 목록

### Evidence

```typescript
// src/routes/reminder/reminder.handlers.ts:14-22
const activeCycles = await db
  .select({
    cycle: cycles,
    generation: generations,
  })
  .from(cycles)
  .innerJoin(generations, eq(cycles.generationId, generations.id))
  .where(and(eq(generations.isActive, true), lt(cycles.endDate, deadline), gt(cycles.endDate, now)));
```

---

## GET /api/reminder/{cycleId}/not-submitted

- **Location**: `src/routes/reminder/reminder.handlers.ts` (L35-80)
- **Purpose**: 특정 사이클의 미제출자 목록 조회
- **Handler**: `getNotSubmittedMembers`

### Request

**Path Parameters**:
```typescript
cycleId: string  // 숫자 문자열 (예: "123")
```

**Example**:
```
GET /api/reminder/42/not-submitted
```

### Response

**200 OK**:
```typescript
{
  cycleId: number,
  week: number,
  endDate: string,          // ISO 8601 datetime
  notSubmitted: [
    {
      github: string,       // GitHub username
      name: string,         // 실명
      discordId: string | null
    }
  ],
  submittedCount: number,
  totalMembers: number
}
```

**404 Not Found**:
```typescript
{ error: "Cycle not found" }
```

### Processing Logic

1. **사이클 확인**: `cycles.id`로 조회
2. **전체 멤버**: `members` 테이블에서 모든 멤버 조회
3. **제출자 추출**: `submissions.cycleId`로 제출된 memberId 목록 추출
4. **미제출자 필터링**: 제출자 ID 집합에서 없는 멤버

### Known Issue

> **TODO** (L48): 현재 전체 멤버를 대상으로 미제출자를 계산합니다. 기수-멤버 연결 테이블(`generation_members`)이 도입되면, 해당 기수에 속한 멤버만 필터링해야 합니다.

### Evidence

```typescript
// src/routes/reminder/reminder.handlers.ts:50-67
const allMembers = await db.select().from(members);
const submittedMembers = await db
  .select({ memberId: submissions.memberId })
  .from(submissions)
  .where(eq(submissions.cycleId, cycleId));
const submittedIds = new Set(submittedMembers.map((s) => s.memberId));
const notSubmitted = allMembers
  .filter((m) => !submittedIds.has(m.id))
  .map((m) => ({ github: m.github, name: m.name, discordId: m.discordId }));
```

---

## POST /api/reminder/send-reminders

- **Location**: `src/routes/reminder/reminder.handlers.ts` (L83-143)
- **Purpose**: 마감 임박한 사이클에 대해 Discord 리마인더 알림 발송
- **Handler**: `sendReminderNotifications`
- **Use Case**: GitHub Actions cron job 또는 n8n workflow

### Request

**Query Parameters**:
```typescript
hoursBefore?: string  // 기본값: "24" (단위: 시간)
```

**Example**:
```
POST /api/reminder/send-reminders?hoursBefore=6
```

### Response

**200 OK**:
```typescript
{
  sent: number,        // 발송된 알림 수
  cycles: [
    {
      cycleId: number,
      cycleName: string
    }
  ]
}
```

**500 Internal Server Error**:
```typescript
{ error: "DISCORD_WEBHOOK_URL not configured" }
```

### Processing Logic

1. **사이클 조회**: `GET /api/reminder`와 동일한 로직으로 대상 사이클 찾기
2. **환경변수 확인**: `DISCORD_WEBHOOK_URL` 설정 확인
3. **순회 처리**: 각 사이클마다
   - 제출자 목록 조회
   - 미제출자 목록 생성 (제출 안 된 멤버 이름)
   - 미제출자가 없으면 스킵
   - `createReminderMessage()`로 Discord 페이로드 생성
   - `sendDiscordWebhook()`으로 전송
4. **결과 집계**: 발송된 사이클 목록 반환

### Evidence

```typescript
// src/routes/reminder/reminder.handlers.ts:106-134
for (const { cycle, generation } of activeCycles) {
  const submittedMembers = await db
    .select({ memberId: submissions.memberId })
    .from(submissions)
    .where(eq(submissions.cycleId, cycle.id));
  const submittedIds = new Set(submittedMembers.map((s) => s.memberId));
  const allMembers = await db.select().from(members);
  const notSubmitted = allMembers
    .filter((m) => !submittedIds.has(m.id))
    .map((m) => m.name);

  if (notSubmitted.length === 0) continue;

  await sendDiscordWebhook(
    discordWebhookUrl,
    createReminderMessage(cycleName, cycle.endDate, notSubmitted)
  );
}
```

---

## Route Registration

- **Location**: `src/routes/reminder/reminder.index.ts` (L5-10)
- **Router**: Hono OpenAPI router
- **Mount**: `src/index.ts` (L26) - `app.route('/', reminderRouter)`

### Evidence

```typescript
// src/routes/reminder/reminder.index.ts
const router = createRouter()
  .openapi(routes.getReminderCycles, handlers.getReminderCycles)
  .openapi(routes.getNotSubmittedMembers, handlers.getNotSubmittedMembers)
  .openapi(routes.sendReminderNotifications, handlers.sendReminderNotifications);
```
