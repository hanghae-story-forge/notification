# Status Routes

- **Scope**: 제출 현황 조회 API (Discord 봇용)
- **Source of Truth**: `src/routes/status/`
- **Last Verified**: 2026-01-05
- **Repo Ref**: df3a0ab

---
metadata:
  version: "1.1.0"
  created_at: "2025-01-05T10:00:00Z"
  last_verified: "2026-01-05T12:00:00Z"
  git_commit: "df3a0ab"
  source_files:
    src/routes/status/status.index.ts:
      git_hash: "df3a0ab"
      source_exists: true
    src/routes/status/status.routes.ts:
      git_hash: "df3a0ab"
      source_exists: true
    src/routes/status/status.handlers.ts:
      git_hash: "df3a0ab"
      source_exists: true
---

## GET /api/status/current

- **Location**: `src/routes/status/status.handlers.ts` (L7-47)
- **Purpose**: 현재 진행중인 사이클 조회 (JSON 형식)
- **Handler**: `getCurrentCycle`
- **Use Case**: Discord 봇 커맨드, 대시보드 표시

### Request

**Example**:
```
GET /api/status/current
```

### Response

**200 OK**:
```typescript
{
  id: number,
  week: number,
  generationName: string,
  startDate: string,        // ISO 8601 datetime
  endDate: string,          // ISO 8601 datetime
  githubIssueUrl: string | null,
  daysLeft: number,         // 남은 일수
  hoursLeft: number         // 남은 시간
}
```

**404 Not Found**:
```typescript
{ error: "No active cycle found" }
```

### Processing Logic

1. **현재 시간 기준 조회**: `now`가 `startDate`와 `endDate` 사이인 사이클
2. **활성화된 기수만**: `generations.isActive = true` 조건
3. **남은 시간 계산**: `endDate - now`를 일/시간으로 변환
4. **응답 구성**: 사이클 정보 + 남은 시간

### Evidence

```typescript
// src/routes/status/status.handlers.ts:11-20
const currentCycle = await db
  .select({
    cycle: cycles,
    generation: generations,
  })
  .from(cycles)
  .innerJoin(generations, eq(cycles.generationId, generations.id))
  .where(and(lt(cycles.startDate, now), gt(cycles.endDate, now)))
  .orderBy(cycles.startDate)
  .limit(1);
```

---

## GET /api/status/current/discord

- **Location**: `src/routes/status/status.handlers.ts` (L50-117)
- **Purpose**: 현재 사이클의 제출 현황을 Discord webhook 페이로드 형식으로 반환
- **Handler**: `getCurrentCycleDiscord`
- **Use Case**: Discord 봇이 직접 Discord 웹훅으로 전송

### Request

**Example**:
```
GET /api/status/current/discord
```

### Response

**200 OK** (Discord webhook payload):
```typescript
{
  embeds: [
    {
      title: string,          // "{generation.name} - {week}주차 제출 현황"
      color: number,          // 0x0099ff (파란색)
      fields: [
        {
          name: string,       // "✅ 제출 ({count})"
          value: string,      // "name1, name2, ..."
          inline: boolean     // false
        },
        {
          name: string,       // "❌ 미제출 ({count})"
          value: string,      // "name1, name2, ..."
          inline: boolean     // false
        },
        {
          name: string,       // "⏰ 마감 시간"
          value: string,      // Discord timestamp (<t:{unix}:R>)
          inline: boolean     // false
        }
      ],
      timestamp: string       // ISO 8601 datetime
    }
  ]
}
```

**404 Not Found**:
```typescript
{ error: "No active cycle found" }
```

### Processing Logic

1. **현재 사이클 조회**: `GET /api/status/current`와 동일
2. **제출 현황 조회**: 제출자/미제출자 이름 목록 추출
3. **Discord 메시지 생성**: `createStatusMessage()` 호출

### Evidence

```typescript
// src/routes/status/status.handlers.ts:89-104
const discordMessage = createStatusMessage(
  `${generation.name} - ${cycle.week}주차`,
  submittedNames,
  notSubmittedNames,
  cycle.endDate
);
return c.json(discordMessage, HttpStatusCodes.OK);
```

---

## GET /api/status/{cycleId}

- **Location**: `src/routes/status/status.handlers.ts` (L9-75)
- **Purpose**: 특정 사이클의 제출 현황 조회 (JSON 형식)
- **Handler**: `getStatus`
- **Use Case**: Discord 봇 커맨드, 대시보드 표시

### Request

**Path Parameters**:
```typescript
cycleId: string  // 숫자 문자열 (예: "42")
```

**Example**:
```
GET /api/status/42
```

### Response

**200 OK**:
```typescript
{
  cycle: {
    id: number,
    week: number,
    startDate: string,        // ISO 8601 datetime
    endDate: string,          // ISO 8601 datetime
    generationName: string
  },
  summary: {
    total: number,            // 전체 멤버 수
    submitted: number,        // 제출자 수
    notSubmitted: number      // 미제출자 수
  },
  submitted: [
    {
      name: string,           // 실명
      github: string,         // GitHub username
      url: string,            // 블로그 글 URL
      submittedAt: string     // ISO 8601 datetime
    }
  ],
  notSubmitted: [
    {
      name: string,           // 실명
      github: string          // GitHub username
    }
  ]
}
```

**404 Not Found**:
```typescript
{ error: "Cycle not found" }
```

### Processing Logic

1. **사이클 조회**: `cycles.id` + `generations` JOIN
2. **제출 목록 조회**: `submissions` + `members` JOIN (cycleId 조건)
3. **전체 멤버 조회**: `members` 테이블
4. **제출자/미제출자 분리**: submittedIds 집합으로 필터링
5. **응답 구성**: 사이클 정보, 요약 통계, 제출자 상세, 미제출자 목록

### Evidence

```typescript
// src/routes/status/status.handlers.ts:28-54
const submissionList = await db
  .select({
    submission: submissions,
    member: members,
  })
  .from(submissions)
  .innerJoin(members, eq(submissions.memberId, members.id))
  .where(eq(submissions.cycleId, cycleId));

const submittedIds = new Set(submissionList.map((s) => s.submission.memberId));
const notSubmitted = allMembers
  .filter((m) => !submittedIds.has(m.id))
  .map((m) => ({ name: m.name, github: m.github }));
```

---

## GET /api/status/{cycleId}/discord

- **Location**: `src/routes/status/status.handlers.ts` (L78-119)
- **Purpose**: 제출 현황을 Discord webhook 페이로드 형식으로 반환
- **Handler**: `getStatusDiscord`
- **Use Case**: Discord 봇이 직접 Discord 웹훅으로 전송

### Request

**Path Parameters**:
```typescript
cycleId: string  // 숫자 문자열 (예: "42")
```

**Example**:
```
GET /api/status/42/discord
```

### Response

**200 OK** (Discord webhook payload):
```typescript
{
  embeds: [
    {
      title: string,          // "{generation.name} - {week}주차 제출 현황"
      color: number,          // 0x0099ff (파란색)
      fields: [
        {
          name: string,       // "✅ 제출 ({count})"
          value: string,      // "name1, name2, ..."
          inline: boolean     // false
        },
        {
          name: string,       // "❌ 미제출 ({count})"
          value: string,      // "name1, name2, ..."
          inline: boolean     // false
        },
        {
          name: string,       // "⏰ 마감 시간"
          value: string,      // Discord timestamp (<t:{unix}:R>)
          inline: boolean     // false
        }
      ],
      timestamp: string       // ISO 8601 datetime
    }
  ]
}
```

**404 Not Found**:
```typescript
{ error: "Cycle not found" }
```

### Processing Logic

1. **사이클 조회**: `GET /api/status/{cycleId}`와 동일
2. **제출자/미제출자 이름 목록**: ID 대신 이름만 추출
3. **Discord 메시지 생성**: `createStatusMessage()` 호출
   - 제출자: 쉼표로 구분된 이름 문자열
   - 미제출자: 쉼표로 구분된 이름 문자열
   - 마감 시간: Discord 상대적 타임스탬프 (`<t:{unix}:R>`)

### Evidence

```typescript
// src/routes/status/status.handlers.ts:111-116
const discordMessage = createStatusMessage(
  `${generation.name} - ${cycle.week}주차`,
  submittedNames,
  notSubmittedNames,
  cycle.endDate
);
return c.json(discordMessage, HttpStatusCodes.OK);
```

---

## Route Registration

- **Location**: `src/routes/status/status.index.ts` (L5-11)
- **Router**: Hono OpenAPI router
- **Mount**: `src/index.ts` (L57) - `app.route('/', statusRouter)`

### Evidence

```typescript
// src/routes/status/status.index.ts
const router = createRouter()
  .openapi(routes.getCurrentCycle, handlers.getCurrentCycle)
  .openapi(routes.getCurrentCycleDiscord, handlers.getCurrentCycleDiscord)
  .openapi(routes.getStatus, handlers.getStatus)
  .openapi(routes.getStatusDiscord, handlers.getStatusDiscord);
```

---

## Discord Integration Notes

### Discord Timestamp Format

메시지에서 마감 시간은 Discord의 동적 타임스탬프 형식을 사용:
```
<t:{unix_timestamp}:R>
```
- `R` (Relative): "2시간 전", "3일 후" 등 상대적 시간 표시

### Message Formatting

- **색상**: 파란색 (0x0099ff) - 정보성 메시지
- **이모지**: ✅ (제출), ❌ (미제출), ⏰ (마감 시간)
- **필드**: 3개 필드 (제출자, 미제출자, 마감 시간)
- **인라인**: 모두 `false` (각 필드가 전체 너비 차지)

### Use Cases

1. **Discord Bot Command**: `/status 42` → `GET /api/status/42/discord` → Discord에 embed 전송
2. **Scheduled Updates**: 주기적 현황 공유 (cron job)
3. **Manual Check**: 관리자가 직접 현황 확인
