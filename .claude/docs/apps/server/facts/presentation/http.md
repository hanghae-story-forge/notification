# HTTP Presentation Layer

- **Scope**: apps/server
- **Layer**: presentation
- **Source of Truth**: apps/server/src/presentation/http/
- **Last Verified**: 2025-01-07
- **Repo Ref**: 82509c3

## GitHub Webhook Routes

- **Location**: `apps/server/src/presentation/http/github/github.routes.ts`
- **Purpose**: GitHub Webhook 수신 엔드포인트
- **Routes**:
  - `POST /webhook/github` - GitHub Issue/Comment 이벤트 수신

### GitHub Issue Comment Handler

- **Location**: `apps/server/src/presentation/http/github/github.handlers.ts` (L111-L182)
- **Route**: `POST /webhook/github` (x-github-event: issue_comment)
- **Purpose**: GitHub Issue 댓글(제출) 처리
- **Request**: GitHub Issue Comment Webhook Payload
  - `comment.user.login` - GitHub 사용자명
  - `comment.body` - 댓글 내용 (URL 추출용)
  - `comment.id` - 댓글 ID
  - `issue.html_url` - Issue URL
- **Response**: 
  - 200 OK - 제출 기록 완료
  - 400 Bad Request - URL 없음
  - 404 Not Found - Cycle/Member 없음
  - 409 Conflict - 이미 제출됨
- **Business Logic**:
  1. 댓글에서 URL 추출 (http/https로 시작하는 첫 번째 링크)
  2. `RecordSubmissionCommand` 실행
  3. Discord 알림 전송
- **Evidence**:
  ```typescript
  // L121-L128: URL 추출
  const urlMatch = commentBody.match(/(https?:\/\/[^\s]+)/);
  if (!urlMatch) {
    return c.json(
      { message: 'No URL found in comment' },
      HttpStatusCodes.BAD_REQUEST
    );
  }
  ```

### GitHub Issues Handler

- **Location**: `apps/server/src/presentation/http/github/github.handlers.ts` (L184-L254)
- **Route**: `POST /webhook/github` (x-github-event: issues)
- **Purpose**: GitHub Issue 생성(사이클 생성) 처리
- **Request**: GitHub Issues Webhook Payload
  - `issue.title` - Issue 제목 (주차 번호 추출용)
  - `issue.body` - Issue 본문 (마감일 추출용)
  - `issue.html_url` - Issue URL
  - `repository.name` - 레포지토리 이름 (조직 식별용)
- **Response**:
  - 201 Created - 사이클 생성 완료
  - 200 OK - 이미 존재함 (중복 무시)
  - 400 Bad Request - 주차 패턴 없음
- **Business Logic**:
  1. Issue 제목에서 주차 번호 추출 (정규식)
  2. Issue 본문에서 마감일 추출 (정규식)
  3. 조직 식별 (repository.name 또는 query param)
  4. `CreateCycleCommand` 실행
- **Evidence**:
  ```typescript
  // L61-L78: 주차 번호 추출 정규식
  function parseWeekFromTitle(title: string): number | null {
    const patterns = [
      /\[(\d+)주차\]/, // [1주차]
      /(\d+)주차/, // 1주차
      /\[week\s*(\d+)\]/i, // [week 1]
      /week\s*(\d+)/i, // week 1
      /\[(\d+)\]\s*주/, // [1] 주
    ];
    // ...
  }
  ```

## Reminder Routes

- **Location**: `apps/server/src/presentation/http/reminder/reminder.routes.ts`
- **Purpose**: 마감 알림 API (n8n 워크플로우용)
- **Routes**:
  - `GET /api/reminder?hoursBefore=N` - N시간 내 마감 사이클 목록
  - `GET /api/reminder/:cycleId/not-submitted` - 미제출자 목록

## Status Routes

- **Location**: `apps/server/src/presentation/http/status/status.routes.ts`
- **Purpose**: 제출 현황 API (Discord bot용)
- **Routes**:
  - `GET /api/status/:cycleId` - 사이클별 제출 현황 (JSON)
  - `GET /api/status/:cycleId/discord` - 사이클별 제출 현황 (Discord webhook payload)
