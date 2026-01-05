# GitHub Webhook Routes

- **Scope**: GitHub 웹훅 수신 및 처리 라우트
- **Source of Truth**: `src/routes/github/`
- **Last Verified**: 2025-01-05
- **Repo Ref**: f32413325de67a3ad1bde6649d16474d236d164b

---
metadata:
  version: "1.0.0"
  created_at: "2025-01-05T10:00:00Z"
  last_verified: "2025-01-05T10:00:00Z"
  git_commit: "f32413325de67a3ad1bde6649d16474d236d164b"
  source_files:
    src/routes/github/github.index.ts:
      git_hash: "dabaff4d59addd2063b9f6ea34bd79fbf8df95e0"
      source_exists: true
    src/routes/github/github.routes.ts:
      git_hash: "3e004cf5b1344142182366f1c2bca0d1e802772e4"
      source_exists: true
    src/routes/github/github.handlers.ts:
      git_hash: "d5f4478f893352cf652d5fc51013f3166ff0d546"
      source_exists: true
---

## POST /webhook/github (issue_comment)

- **Location**: `src/routes/github/github.handlers.ts` (L54-122)
- **Purpose**: GitHub Issue 댓글 생성 시 제출 기록 자동 저장
- **Event Type**: `issue_comment` (action: created)
- **Handler**: `handleIssueComment`
- **Auth**: GitHub webhook signature 검증 (Hono 미들웨어)

### Request

**Headers**:
```typescript
x-github-event: "issue_comment"
```

**Body Schema**:
```typescript
{
  action: "created",
  issue: {
    number: number,
    html_url: string,      // Issue URL (cycle.generationId 찾기용)
    title: string,
    body: string | null,
    created_at: string
  },
  comment: {
    id: number,
    user: { login: string },  // GitHub username
    body: string,             // 블로그 URL 추출 대상
    html_url: string,
    created_at: string
  },
  repository: {
    name: string,
    owner: { login: string }
  }
}
```

### Response

**200 OK** (제출 완료):
```typescript
{ message: "Submission recorded" }
```

**200 OK** (이미 제출함):
```typescript
{ message: "Already submitted" }
```

**400 Bad Request**:
```typescript
{ message: "No URL found in comment" }
```

**404 Not Found**:
```typescript
{ message: "No cycle found for this issue" }
{ message: "Member not found" }
```

### Processing Logic

1. **URL 추출**: 댓글 본문에서 첫 번째 `https://` 링크 추출
2. **사이클 찾기**: `cycles.githubIssueUrl`로 매칭
3. **멤버 찾기**: `members.github`로 매칭
4. **중복 확인**: `submissions` 테이블에서 `cycleId + memberId` 조합 확인
5. **제출 저장**: URL과 GitHub comment ID 함께 저장
6. **Discord 알림**: `DISCORD_WEBHOOK_URL` 설정 시 알림 전송

### Evidence

```typescript
// src/routes/github/github.handlers.ts:62-66
const urlMatch = commentBody.match(/(https?:\/\/[^\s]+)/);
if (!urlMatch) {
  return c.json({ message: 'No URL found in comment' }, HttpStatusCodes.BAD_REQUEST);
}
```

---

## POST /webhook/github (issues)

- **Location**: `src/routes/github/github.handlers.ts` (L125-185)
- **Purpose**: GitHub Issue 생성 시 회차(cycle) 자동 생성
- **Event Type**: `issues` (action: opened)
- **Handler**: `handleIssues`

### Request

**Headers**:
```typescript
x-github-event: "issues"
```

**Body Schema**:
```typescript
{
  action: "opened",
  issue: {
    number: number,
    html_url: string,
    title: string,          // 주차 번호 파싱 대상
    body: string | null,    // 마감일 파싱 대상
    created_at: string
  },
  repository: {
    name: string,
    owner: { login: string }
  }
}
```

### Response

**201 Created** (회차 생성됨):
```typescript
{
  message: "Cycle created",
  cycle: {
    id: number,
    generationId: number,
    week: number,
    startDate: Date,
    endDate: Date,
    githubIssueUrl: string,
    createdAt: Date
  }
}
```

**200 OK** (무시됨):
```typescript
{ message: "No week pattern found in title, ignoring" }
{ message: "Cycle already exists for this week" }
```

**400 Bad Request**:
```typescript
{ message: "No active generation found" }
```

### Processing Logic

1. **주차 파싱**: 이슈 제목에서 주차 번호 추출 (예: `[1주차]`, `Week 1`)
   - 지원 패턴: `[(\d+)주차]`, `(\d+)주차`, `[week\s*(\d+)]`, `week\s*(\d+)`, `[[(\d+)\]]\s*주`
2. **기수 찾기**: `generations.isActive = true`인 가장 최신 기수
3. **중복 확인**: 동일한 `generationId + week` 조합 확인
4. **날짜 계산**: 이슈 본문에서 마감일 추출 또는 기본값 (현재 + 7일)
   - 마감일 패턴: `마감: YYYY-MM-DD`, `DEADLINE: YYYY-MM-DDTHH:mm:ss`
5. **회차 생성**: `cycles` 테이블에 삽입

### Evidence

```typescript
// src/routes/github/github.handlers.ts:15-32
function parseWeekFromTitle(title: string): number | null {
  const patterns = [
    /\[(\d+)주차\]/,     // [1주차]
    /(\d+)주차/,         // 1주차
    /\[week\s*(\d+)\]/i, // [week 1]
    /week\s*(\d+)/i,     // week 1
    /\[(\d+)\]\s*주/,    // [1] 주
  ];
  // ... 패턴 매칭 로직
}
```

---

## POST /webhook/github (unknown events)

- **Location**: `src/routes/github/github.handlers.ts` (L187-190)
- **Purpose**: 처리하지 않는 GitHub 이벤트 타입 수신
- **Handler**: `handleUnknownEvent`

### Response

**200 OK**:
```typescript
{ message: "Unhandled event: {event_type}" }
```

---

## Route Registration

- **Location**: `src/routes/github/github.index.ts` (L5-12)
- **Router**: Hono OpenAPI router
- **Mount**: `src/index.ts` (L23) - `app.route('/', githubRouter)`

### Evidence

```typescript
// src/routes/github/github.index.ts
router.openapi(routes.handleIssueComment, handlers.handleIssueComment);
router.openapi(routes.handleIssues, handlers.handleIssues);
router.openapi(routes.handleUnknownEvent, handlers.handleUnknownEvent);
```
