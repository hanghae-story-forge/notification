# GitHub Webhook Handler

- **Status**: As-Is (현재 구현)
- **Scope**: GitHub 이벤트 기반 자동화 (제출 수집, 회차 생성)
- **Based on**:
  - Facts: [../facts/routes/github.md](../facts/routes/github.md)
  - Insights: [../insights/operations/github-webhook.md](../insights/operations/github-webhook.md)
- **Last Verified**: 2026-01-05

## 개요 (Overview)

- **목적**: GitHub Issue와 Issue 댓글 이벤트를 수신하여 제출 수집과 회차 생성을 자동화
- **범위**:
  - In-Scope:
    - Issue 댓글 생성 시 제출 자동 기록
    - Issue 생성 시 회차 자동 생성
    - 주차 번호 파싱 (5개 패턴 지원)
    - 마감일 파싱 (2개 패턴 지원)
    - Discord 알림 발송
  - Out-of-Scope:
    - Pull Request 이벤트 처리
    - Issue 수정/삭제 이벤트 처리
    - 댓글 수정/삭제 이벤트 처리
- **비즈니스 가치**: 제출 수집과 회차 생성의 수동 작업 시간을 **95% 이상 절감** (월 20-30분 절감)

## 핵심 기능 (Core Features)

### 1. 제출 자동 기록 (Issue Comment Handler)

- **설명**: GitHub Issue 댓글 생성 이벤트를 수신하여 블로그 URL을 추출하고 제출 기록을 저장
- **주요 규칙**:
  - 댓글 본문에서 첫 번째 `https://` 링크를 제출 URL로 간주
  - `cycles.githubIssueUrl`로 해당 회차를 매칭
  - `members.github`로 멤버를 식별
  - `submissions.githubCommentId` UNIQUE 제약조건으로 중복 제출 방지
  - 동일 댓글 재처리 시 "Already submitted" 반환 (200 OK)

### 2. 회차 자동 생성 (Issues Handler)

- **설명**: GitHub Issue 생성 이벤트를 수신하여 새로운 회차(cycle)를 자동으로 생성
- **주요 규칙**:
  - 이슈 제목에서 주차 번호 추출 (5개 패턴 지원)
  - 이슈 본문에서 마감일 추출 (2개 패턴 지원)
  - `generations.isActive = true`인 가장 최신 기수에 회차 생성
  - 동일한 `generationId + week` 조합이 이미 존재하면 무시
  - 주차 패턴을 찾지 못하면 조용히 무시

### 3. Week 패턴 파싱

- **지원 패턴** (5개):
  - `[(\d+)주차]` - 예: `[1주차]`
  - `(\d+)주차` - 예: `1주차`
  - `[week\s*(\d+)]` - 예: `[week 1]` (대소문자 구분 없음)
  - `week\s*(\d+)` - 예: `week 1` (대소문자 구분 없음)
  - `[(\d+)\]\s*주` - 예: `[1] 주`

### 4. 마감일 파싱

- **지원 패턴** (2개):
  - `마감: YYYY-MM-DD` - 예: `마감: 2025-01-10`
  - `DEADLINE: YYYY-MM-DDTHH:mm:ss` - 예: `DEADLINE: 2025-01-10T23:59:59`
- **기본값**: 패턴을 찾지 못하면 현재 시간 + 7일

## 기술 사양 (Technical Specifications)

- **아키텍처 개요**:
  - Hono 라우터로 GitHub 웹훅 엔드포인트 제공
  - GitHub 이벤트 타입(`x-github-event` 헤더)으로 핸들러 라우팅
  - Drizzle ORM으로 PostgreSQL에 데이터 저장
  - Discord webhook으로 알림 전송

- **의존성**:
  - Services:
    - Database Service ([`src/lib/db.ts`](../facts/database/schema.md))
    - Discord Service ([`src/services/discord.ts`](../facts/services/discord.md))
  - Packages:
    - `hono` - Web framework
    - `@hono/zod-openapi` - OpenAPI specification
    - `drizzle-orm` - ORM
  - Libraries:
    - Zod (via Hono) - Request validation
  - Env Vars:
    - `DATABASE_URL` - PostgreSQL 연결 (필수)
    - `DISCORD_WEBHOOK_URL` - Discord webhook URL (선택)

- **구현 접근**:
  - 단일 엔드포인트 `POST /webhook/github`로 모든 GitHub 이벤트 수신
  - `x-github-event` 헤더 값으로 핸들러 함수 분기
  - 각 핸들러는 독립적으로 에러 처리 (하나가 실패해도 다른 이벤트 처리 가능)
  - DB 트랜잭션은 사용하지 않음 (각 핸들러가 단일 INSERT/SELECT)

- **관측/운영**:
  - GitHub webhook delivery ID 로깅 미구현
  - 에러 로깅은 콘솔 출력만 수행
  - 성공/실패 메트릭 수집 미구현

- **실패 모드/대응**:
  - **URL 추출 실패**: 400 Bad Request 반환
  - **회차를 찾지 못함**: 404 Not Found 반환
  - **멤버를 찾지 못함**: 404 Not Found 반환
  - **Discord webhook 실패**: 예외 발생하나 제출 저장은 완료
  - **중복 제출**: "Already submitted" 메시지 반환 (200 OK)

## 데이터 구조 (Data Structure)

- **모델/스키마**:
  - **Table**: `cycles`
    - Columns: `id`, `generationId`, `week`, `startDate`, `endDate`, `githubIssueUrl`, `createdAt`
    - Relationships: N:1 to `generations`
  - **Table**: `submissions`
    - Columns: `id`, `cycleId`, `memberId`, `url`, `submittedAt`, `githubCommentId` (UNIQUE)
    - Relationships: N:1 to `cycles`, N:1 to `members`

- **데이터 흐름**:
  ```
  GitHub Issue Comment Event
    ↓
  URL 추출 (첫 번째 https:// 링크)
    ↓
  cycles.githubIssueUrl로 회차 매칭
    ↓
  members.github로 멤버 매칭
    ↓
  submissions 테이블에 중복 확인 후 저장
    ↓
  Discord webhook 알림 발송 (선택)
  ```

- **검증/제약**:
  - `submissions.githubCommentId` UNIQUE 제약조건으로 중복 방어
  - `cycles.githubIssueUrl`은 NULL 가능 (수동 생성 회차 지원)
  - `members.github` UNIQUE 제약조건으로 멤버 식별

## API 명세 (API Specifications)

### POST /webhook/github (issue_comment)

- **Purpose**: GitHub Issue 댓글 생성 시 제출 자동 기록
- **Auth**: GitHub webhook signature 검증 (Hono 미들웨어)
- **Request**:
  ```typescript
  interface Request {
    action: "created",
    issue: {
      number: number,
      html_url: string,      // Issue URL (cycle 매칭용)
      title: string,
      body: string | null,
      created_at: string
    },
    comment: {
      id: number,            // 중복 방지용
      user: { login: string }, // GitHub username
      body: string,          // URL 추출 대상
      html_url: string,
      created_at: string
    },
    repository: {
      name: string,
      owner: { login: string }
    }
  }
  ```

- **Response**:
  ```typescript
  // 200 OK (제출 완료)
  interface SuccessResponse {
    message: "Submission recorded"
  }

  // 200 OK (이미 제출함)
  interface AlreadySubmittedResponse {
    message: "Already submitted"
  }

  // 400 Bad Request
  interface ErrorResponse {
    message: "No URL found in comment"
  }

  // 404 Not Found
  interface ErrorResponse {
    message: "No cycle found for this issue" | "Member not found"
  }
  ```

- **Errors**:
  - `400`: URL을 찾을 수 없음
  - `404`: 회차 또는 멤버를 찾을 수 없음
  - `500`: 데이터베이스 오류

### POST /webhook/github (issues)

- **Purpose**: GitHub Issue 생성 시 회차 자동 생성
- **Auth**: GitHub webhook signature 검증
- **Request**:
  ```typescript
  interface Request {
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

- **Response**:
  ```typescript
  // 201 Created (회차 생성됨)
  interface CreatedResponse {
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

  // 200 OK (무시됨)
  interface IgnoredResponse {
    message: "No week pattern found in title, ignoring" |
             "Cycle already exists for this week"
  }

  // 400 Bad Request
  interface ErrorResponse {
    message: "No active generation found"
  }
  ```

- **Errors**:
  - `400`: 활성 기수를 찾을 수 없음
  - `500`: 데이터베이스 오류

## 사용자 시나리오 (User Scenarios)

### 성공 시나리오: 제출 기록

1. 멤버가 GitHub Issue에 댓글을 작성하고 블로그 URL을 포함
2. GitHub가 `POST /webhook/github`로 이벤트 전송
3. 시스템이 댓글 본문에서 URL 추출
4. `cycles.githubIssueUrl`로 해당 회차 찾기
5. `members.github`로 멤버 찾기
6. `submissions` 테이블에 제출 저장 (중복 확인)
7. Discord에 "🎉 {memberName}님이 글을 제출했습니다!" 알림 전송
8. **최종 결과**: 멤버에게 즉시 피드백 제공, 운영자 개입 불필요

### 성공 시나리오: 회차 자동 생성

1. 운영자가 GitHub Issue 생성 (제목: `[2주차]`, 본문: `마감: 2025-01-15`)
2. GitHub가 `POST /webhook/github`로 이벤트 전송
3. 시스템이 제목에서 주차 번호(2) 추출
4. 시스템이 본문에서 마감일(2025-01-15) 추출
5. 활성 기수(`generations.isActive = true`) 찾기
6. `cycles` 테이블에 회차 생성
7. **최종 결과**: 수동으로 DB에 레코드 생성할 필요 없음

### 실패/예외 시나리오

1. **URL 없는 댓글**:
   - 멤버가 댓글에 URL을 포함하지 않음
   - 시스템이 `{ message: "No URL found in comment" }` 반환 (400)
   - 제출 기록되지 않음

2. **존재하지 않는 회차**:
   - 댓글이 등록되지 않은 Issue에 작성됨
   - 시스템이 `{ message: "No cycle found for this issue" }` 반환 (404)
   - 운영자가 먼저 회차를 생성해야 함

3. **등록되지 않은 멤버**:
   - GitHub username이 `members` 테이블에 없음
   - 시스템이 `{ message: "Member not found" }` 반환 (404)
   - 운영자가 멤버를 등록해야 함

4. **중복 제출**:
   - 동일한 댓글 ID로 재시도
   - 시스템이 `{ message: "Already submitted" }` 반환 (200 OK)
   - 데이터 중복 방지

## 제약사항 및 고려사항 (Constraints)

- **보안**:
  - GitHub webhook signature 검증 필요 (현재 구현 상태 미확인)
  - 검증 없으면 악의적 요청으로 DB 오염 위험
  - 환경변수 `GITHUB_WEBHOOK_SECRET` 필요

- **성능**:
  - 각 요청은 3개의 DB 쿼리 실행 (회차 조회, 멤버 조회, 제출 저장)
  - Discord webhook 호출은 비동기로 처리되지 않음 (응답 지연 가능)
  - 고빈도 웹훅 수신 시 DB 커넥션 풀 고갈 가능성

- **배포**:
  - GitHub webhook URL 설정 필요 (Repository Settings → Webhooks)
  - 이벤트 구독: "Issue comments" → "Comment created", "Issues" → "Opened"
  - PostgreSQL 마이그레이션 필요 (테이블 생성)

- **롤백**:
  - 웹훅 핸들러 롤백 시 GitHub webhook URL 재설정 필요
  - DB 스키마 변경 시 Drizzle 마이그레이션 롤백

- **호환성**:
  - GitHub webhook API v3 호환
  - PostgreSQL 12+ 호환 (Drizzle ORM 요구사항)

## 향후 확장 가능성 (Future Expansion)

- **다중 GitHub 레포지토리 지원**:
  - 현재: 단일 레포지토리 가정
  - 개선: `cycles.githubRepoUrl` 컬럼 추가로 여러 레포지토리 지원

- **Webhook 재시도 큐**:
  - 현재: 실패 시 재시도 없음
  - 개선: BullMQ 또는 AWS SQS로 재시도 큐 구현
  - 효과: 제출 누락률 0%에 근접

- **Webhook 디버깅 엔드포인트**:
  - 제안: `GET /webhook/github/delivery/{deliveryId}`
  - 용도: 이전 웹훅 전송 상태 조회

- **제출 실패 시 명확한 에러 메시지**:
  - 현재: `{ message: "No URL found in comment" }`
  - 개선: 한국어 에러 메시지 + 해결 가이드

- **회차 생성 파싱 실패 시 알림**:
  - 현재: 패턴 매칭 실패 시 조용히 종료
  - 개선: 운영자에게 Discord 알림 전송

## 추가로 필요 정보 (Needed Data/Decisions)

- TBD: GitHub webhook signature 검증 구현 여부
  - 질문: 현재 Hono 미들웨어로 signature 검증을 수행하는가?
  - 오너: 기술팀

- TBD: Discord webhook 실패 시 재시도 정책
  - 질문: Discord 알림 실패 시 재시도를 시도하는가?
  - 오너: 기술팀

- TBD: 중복 웹훅 발생 빈도
  - 질문: GitHub에서 중복 웹훅을 얼마나 자주 전송하는가?
  - 오너: 운영팀

- TBD: 파싱 실패율
  - 질문: 주차 패턴/마감일 패턴 매칭 실패 빈도는?
  - 오너: 운영팀

---

**문서 버전**: 1.0.0
**생성일**: 2026-01-05
**마지막 업데이트**: 2026-01-05
**Git Commit**: f324133
