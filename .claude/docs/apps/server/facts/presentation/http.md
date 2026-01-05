# Presentation Layer - HTTP Routes

---
metadata:
  layer: Presentation
  component: HTTP
  framework: Hono
  documentation: OpenAPI 3.0
  last_verified: "2026-01-05T10:00:00Z"
  git_commit: "ac29965"
---

## 개요

Presentation 계층의 HTTP 모듈은 외부 HTTP 요청을 처리하고, 적절한 Command/Query를 호출하여 결과를 반환합니다. Hono 프레임워크와 OpenAPI 3.0 스펙을 사용합니다.

## Route Modules

| 모듈 | 경로 | 목적 | Location |
|------|------|------|----------|
| GitHub Webhook | `/webhook/github` | GitHub 이벤트 수신 | `presentation/http/github/` |
| Reminder API | `/api/reminder` | 리마인더 대상 조회 | `presentation/http/reminder/` |
| Status API | `/api/status` | 제출 현황 조회 | `presentation/http/status/` |

## GitHub Webhook Routes

### Routes

- **Location**: `src/presentation/http/github/github.routes.ts` (L1-L161)
- **Base Path**: `/webhook/github`

### POST /webhook/github

GitHub 웹훅 엔드포인트로, 이벤트 타입에 따라 다른 핸들러로 라우팅합니다.

#### 이벤트: issue_comment (created)

- **Handler**: `handleIssueComment()` (L100-L171)
- **Purpose**: Issue 댓글 작성 시 제출 기록
- **Location**: `src/presentation/http/github/github.handlers.ts`

**Request**:
```typescript
{
  action: "created",
  issue: {
    number: 1,
    html_url: "https://github.com/org/repo/issues/1",
    ...
  },
  comment: {
    id: 1234567890,
    user: { login: "john-doe" },
    body: "https://blog.example.com/post",
    ...
  }
}
```

**Response**:
- `200 OK`: 제출 기록 성공
- `400 Bad Request`: URL 없음
- `404 Not Found`: 사이클 또는 회원 없음
- `500 Internal Server Error`: 서버 에러

**실행 흐름**:
1. 댓글에서 URL 추출 (정규식: `https?://[^\s]+`)
2. `RecordSubmissionCommand` 실행
3. Discord 알림 전송 (webhook URL 설정된 경우)

#### 이벤트: issues (opened)

- **Handler**: `handleIssues()` (L174-L236)
- **Purpose**: Issue 생성 시 사이클 자동 생성
- **Location**: `src/presentation/http/github/github.handlers.ts`

**Request**:
```typescript
{
  action: "opened",
  issue: {
    number: 1,
    title: "[1주차] 글 제출",
    html_url: "https://github.com/org/repo/issues/1",
    body: "마감: 2026-01-08",
    ...
  }
}
```

**Response**:
- `201 Created`: 사이클 생성 성공
- `200 OK`: 이미 존재 (무시)
- `400 Bad Request`: 주차 패턴 없음
- `404 Not Found`: 활성화된 기수 없음
- `500 Internal Server Error`: 서버 에러

**실행 흐름**:
1. 이슈 제목에서 주차 추출 (정규식 패턴)
2. 이슈 본문에서 날짜 추출 (패턴: "마감: YYYY-MM-DD")
3. `CreateCycleCommand` 실행

## Reminder API Routes

### Routes

- **Location**: `src/presentation/http/reminder/reminder.routes.ts` (L1-L117)
- **Base Path**: `/api/reminder`

### GET /api/reminder

- **Handler**: `getReminderCycles()` (L35-L52)
- **Purpose**: 마감 임박 사이클 조회
- **Location**: `src/presentation/http/reminder/reminder.handlers.ts`

**Query Parameters**:
- `hoursBefore` (optional, default: "24") - 마감까지 N시간 내 사이클 조회

**Response**:
```typescript
{
  cycles: [
    {
      cycleId: 1,
      cycleName: "똥글똥글 1기 - 1주차",
      endDate: "2026-01-08T23:59:59Z",
      githubIssueUrl: "https://github.com/org/repo/issues/1"
    }
  ]
}
```

**Use Case**: n8n workflow에서 주기적으로 호출하여 리마인더 발송

### GET /api/reminder/{cycleId}/not-submitted

- **Handler**: `getNotSubmittedMembers()` (L55-L72)
- **Purpose**: 특정 사이클의 미제출자 목록 조회

**Path Parameters**:
- `cycleId` - 사이클 ID

**Response**:
```typescript
{
  cycleId: 1,
  week: 1,
  endDate: "2026-01-08T23:59:59Z",
  notSubmitted: [
    {
      github: "alice",
      name: "Alice",
      discordId: "123456789012345678"
    }
  ],
  submittedCount: 2,
  totalMembers: 3
}
```

**Use Case**: n8n workflow에서 특정 사이클의 미제출자에게 개별 알림

### POST /api/reminder/send-reminders

- **Handler**: `sendReminderNotifications()` (L75-L138)
- **Purpose**: 리마인더 알림 발송

**Query Parameters**:
- `hoursBefore` (optional, default: "24")

**Response**:
```typescript
{
  sent: 1,
  cycles: [
    {
      cycleId: 1,
      cycleName: "똥글똥글 1기 - 1주차"
    }
  ]
}
```

**실행 흐름**:
1. 마감 임박 사이클 조회
2. 각 사이클별 미제출자 조회
3. Discord 웹훅으로 알림 전송

**Use Case**: GitHub Actions cron job에서 주기적으로 호출

## Status API Routes

### Routes

- **Location**: `src/presentation/http/status/status.routes.ts` (L1-L168)
- **Base Path**: `/api/status`

### GET /api/status/current

- **Handler**: `getCurrentCycle()` (L34-L53)
- **Purpose**: 현재 진행 중인 사이클 조회

**Response**:
```typescript
{
  id: 1,
  week: 1,
  generationName: "똥글똥글 1기",
  startDate: "2026-01-01T00:00:00Z",
  endDate: "2026-01-08T23:59:59Z",
  githubIssueUrl: "https://github.com/org/repo/issues/1",
  daysLeft: 3,
  hoursLeft: 72
}
```

### GET /api/status/current/discord

- **Handler**: `getCurrentCycleDiscord()` (L56-L109)
- **Purpose**: 현재 사이클 제출 현황 (Discord 포맷)

**Response**: Discord webhook payload (embeds)

**Use Case**: Discord bot 슬래시 명령어 (/current-cycle)

### GET /api/status/{cycleId}

- **Handler**: `getStatus()` (L112-L128)
- **Purpose**: 특정 사이클 제출 현황 조회

**Path Parameters**:
- `cycleId` - 사이클 ID

**Response**:
```typescript
{
  cycle: {
    id: 1,
    week: 1,
    startDate: "2026-01-01T00:00:00Z",
    endDate: "2026-01-08T23:59:59Z",
    generationName: "똥글똥글 1기"
  },
  summary: {
    total: 3,
    submitted: 2,
    notSubmitted: 1
  },
  submitted: [
    {
      name: "Alice",
      github: "alice",
      url: "https://blog.example.com/alice",
      submittedAt: "2026-01-02T10:00:00Z"
    }
  ],
  notSubmitted: [
    {
      name: "Bob",
      github: "bob"
    }
  ]
}
```

### GET /api/status/{cycleId}/discord

- **Handler**: `getStatusDiscord()` (L131-L159)
- **Purpose**: 특정 사이클 제출 현황 (Discord 포맷)

**Path Parameters**:
- `cycleId` - 사이클 ID

**Response**: Discord webhook payload (embeds)

**Use Case**: Discord bot 슬래시 명령어 (/check-submission)

## 공통 Endpoint

### GET /health

- **Location**: `src/index.ts` (L24-L46)
- **Purpose**: Docker 헬스체크 (DB 연결 확인)

**Response**:
```typescript
{
  status: "healthy",
  database: "connected",
  timestamp: "2026-01-05T10:00:00Z"
}
```

### GET /

- **Location**: `src/index.ts` (L49)
- **Purpose**: 루트 엔드포인트

**Response**:
```typescript
{
  status: "ok",
  message: "똥글똥글 API"
}
```

## OpenAPI Documentation

모든 Route는 `@hono/zod-openapi`를 사용하여 OpenAPI 스펙을 정의합니다:

```typescript
export const getStatus = createRoute({
  path: '/api/status/{cycleId}',
  method: 'get',
  tags: ['Status'],
  request: {
    params: z.object({
      cycleId: z.string().regex(/^\d+$/, 'Cycle ID must be a number'),
    }),
  },
  responses: {
    200: jsonContent(StatusResponseSchema, 'Status retrieved'),
    404: jsonContent(NotFoundErrorSchema, 'Cycle not found'),
    500: jsonContent(InternalServerErrorSchema, 'Server error'),
  },
});
```

## 에러 처리

도메인 에러를 HTTP 상태 코드로 매핑:

| 도메인 에러 | HTTP 상태 코드 |
|-------------|----------------|
| `NotFoundError` | 404 Not Found |
| `ConflictError` | 200 OK (이미 존재함은 에러가 아님) |
| `ValidationError` | 400 Bad Request |
| 기타 에러 | 500 Internal Server Error |

## 의존성 주입

각 Handler에서 필요한 Repository와 Command/Query 인스턴스를 직접 생성:

```typescript
// Repository & Service Instances
const submissionRepo = new DrizzleSubmissionRepository();
const cycleRepo = new DrizzleCycleRepository();
const memberRepo = new DrizzleMemberRepository();
const generationRepo = new DrizzleGenerationRepository();
const submissionService = new SubmissionService(submissionRepo);
const discordClient = new DiscordWebhookClient();

// Command/Query Instances
const recordSubmissionCommand = new RecordSubmissionCommand(
  cycleRepo,
  memberRepo,
  submissionRepo,
  submissionService
);
```

## 향후 개선

1. **Dependency Injection**: DI 컨테이너 도입 (InversifyJS, TSyringe)
2. **Middleware**: 인증, 로깅, 레이트 리미팅
3. **API Versioning**: `/api/v1/`, `/api/v2/`
4. **Request Validation**: 더 강력한 Zod 스키마
