# Reminder System

- **Status**: As-Is (현재 구현)
- **Scope**: 마감 리마인더 조회 및 발송 자동화
- **Based on**:
  - Facts: [../facts/routes/reminder.md](../facts/routes/reminder.md)
  - Insights: [../insights/operations/reminder-system.md](../insights/operations/reminder-system.md)
- **Last Verified**: 2026-01-05

## 개요 (Overview)

- **목적**: 마감 임박한 회차를 조회하고 미제출자에게 Discord 리마인더 알림을 자동 발송
- **범위**:
  - In-Scope:
    - 마감 N시간 이내인 활성 회차 목록 조회
    - 특정 회차의 미제출자 목록 조회
    - Discord 리마인더 메시지 발송
  - Out-of-Scope:
    - 개인별 DM 발송 (현재는 채널 공개 메시지만)
    - 리마인더 발송 스케줄링 (n8n에 위임)
    - 발송 기록 저장 (중복 발송 방지 미구현)
- **비즈니스 가치**: 운영자가 수동으로 미제출자를 추적하는 시간을 **회차당 5-10분 절감**

## 핵심 기능 (Core Features)

### 1. 마감 임박 회차 조회

- **설명**: 현재 시간으로부터 N시간 이내에 마감되는 활성 회차 목록을 반환
- **주요 규칙**:
  - `generations.isActive = true`인 기수의 회차만 조회
  - `now < cycles.endDate < (now + hoursBefore)` 조건으로 필터링
  - 기본값: 24시간 이내

### 2. 미제출자 목록 조회

- **설명**: 특정 회차에 제출하지 않은 멤버 목록을 반환
- **주요 규칙**:
  - 전체 `members` 테이블에서 제출된 `memberIds`를 제외
  - **[KNOWN ISSUE]**: 현재 전체 멤버를 대상으로 계산하여 기수별 참여율이 부정확할 수 있음
  - `generation_members` 테이블 활성화 시 기수별 멤버만 필터링 필요

### 3. 리마인더 발송

- **설명**: 마감 임박 회차에 대해 Discord webhook으로 리마인더 메시지 발송
- **주요 규칙**:
  - 미제출자가 없으면 발송 스킵
  - 회차별로 개별 메시지 발송
  - 중복 발송 방지 미구현 (API 재호출 시 중복 발송됨)

## 기술 사양 (Technical Specifications)

- **아키텍처 개요**:
  - Hono 라우터로 3개의 엔드포인트 제공
  - n8n 워크플로우에서 주기적으로 호출 (스케줄링 외부 위임)
  - Drizzle ORM으로 DB 조회
  - Discord Service로 메시지 생성 및 전송

- **의존성**:
  - Services:
    - Database Service ([`src/lib/db.ts`](../facts/database/schema.md))
    - Discord Service ([`src/services/discord.ts`](../facts/services/discord.md))
  - Packages:
    - `hono` - Web framework
    - `drizzle-orm` - ORM
  - Libraries:
    - Zod (via Hono) - Request validation
  - Env Vars:
    - `DATABASE_URL` - PostgreSQL 연결 (필수)
    - `DISCORD_WEBHOOK_URL` - Discord webhook URL (필수, `POST /send-reminders`에서만)

- **구현 접근**:
  - 시간 윈도우 쿼리로 마감 임박 회차 필터링
  - 전체 멤버 조회 후 제출자 ID 집합으로 차집합 계산
  - Discord webhook 호출은 동기식 (응답을 기다림)

- **관측/운영**:
  - 리마인더 발송 기록 저장 미구현
  - 발송 성공/실패 메트릭 수집 미구현

- **실패 모드/대응**:
  - **활성 회차 없음**: 빈 배열 반환
  - **미제출자 없음**: 빈 배열 반환 (발송 스킵)
  - **Discord webhook 실패**: 500 Internal Server Error 반환
  - **환경변수 미설정**: `{ error: "DISCORD_WEBHOOK_URL not configured" }` 반환

## 데이터 구조 (Data Structure)

- **모델/스키마**:
  - **Table**: `generations`
    - Columns: `id`, `name`, `startedAt`, `isActive`, `createdAt`
    - Filter: `isActive = true`
  - **Table**: `cycles`
    - Columns: `id`, `generationId`, `week`, `startDate`, `endDate`, `githubIssueUrl`, `createdAt`
    - Relationships: N:1 to `generations`
  - **Table**: `submissions`
    - Columns: `id`, `cycleId`, `memberId`, `url`, `submittedAt`, `githubCommentId`
    - Relationships: N:1 to `cycles`, N:1 to `members`
  - **Table**: `members`
    - Columns: `id`, `github`, `discordId`, `name`, `createdAt`

- **데이터 흐름**:
  ```
  GET /api/reminder?hoursBefore=24
    ↓
  현재 시간 계산
    ↓
  WHERE: generations.isActive = true
    AND cycles.endDate < (now + 24h)
    AND cycles.endDate > now
    ↓
  활성 회차 목록 반환
  ```

- **검증/제약**:
  - `hoursBefore` 파라미터는 숫자 문자열이어야 함 (예: "24")
  - `cycleId` 파라미터는 숫자 문자열이어야 함 (예: "42")

## API 명세 (API Specifications)

### GET /api/reminder

- **Purpose**: 마감 N시간 이내인 활성 회차 목록 조회
- **Auth**: 없음 (공개 엔드포인트, n8n에서 호출)
- **Request**:
  ```typescript
  interface QueryParams {
    hoursBefore?: string  // 기본값: "24" (단위: 시간)
  }
  ```

- **Response**:
  ```typescript
  interface Response {
    cycles: Array<{
      cycleId: number,
      cycleName: string,        // "{generation.name} - {week}주차"
      endDate: string,          // ISO 8601 datetime
      githubIssueUrl?: string
    }>
  }
  ```

- **Errors**: 없음 (빈 배열 반환 가능)

### GET /api/reminder/{cycleId}/not-submitted

- **Purpose**: 특정 회차의 미제출자 목록 조회
- **Auth**: 없음 (공개 엔드포인트, n8n에서 호출)
- **Request**:
  ```typescript
  interface PathParams {
    cycleId: string  // 숫자 문자열 (예: "42")
  }
  ```

- **Response**:
  ```typescript
  interface Response {
    cycleId: number,
    week: number,
    endDate: string,          // ISO 8601 datetime
    notSubmitted: Array<{
      github: string,       // GitHub username
      name: string,         // 실명
      discordId: string | null
    }>,
    submittedCount: number,
    totalMembers: number
  }
  ```

- **Errors**:
  - `404`: 회차를 찾을 수 없음

### POST /api/reminder/send-reminders

- **Purpose**: 마감 임박 회차에 대해 Discord 리마인더 알림 발송
- **Auth**: 없음 (공개 엔드포인트, GitHub Actions cron 또는 n8n에서 호출)
- **Request**:
  ```typescript
  interface QueryParams {
    hoursBefore?: string  // 기본값: "24" (단위: 시간)
  }
  ```

- **Response**:
  ```typescript
  interface SuccessResponse {
    sent: number,        // 발송된 알림 수
    cycles: Array<{
      cycleId: number,
      cycleName: string
    }>
  }
  ```

- **Errors**:
  - `500`: `DISCORD_WEBHOOK_URL` not configured

## 사용자 시나리오 (User Scenarios)

### 성공 시나리오: n8n 자동 리마인더

1. n8n cron job이 매일 09:00에 `POST /api/reminder/send-reminders?hoursBefore=24` 호출
2. 시스템이 마감 24시간 이내인 활성 회차 조회
3. 각 회차마다 미제출자 목록 생성
4. 미제출자가 없으면 스킵
5. Discord에 "⏰ {cycleName} 마감까지 {timeLeft} 남았습니다!" 메시지 발송
6. **최종 결과**: 운영자 개입 없이 자동 리마인der 발송

### 성공 시나리오: 운영자 수동 조회

1. 운영자가 `GET /api/reminder/42/not-submitted` 호출
2. 시스템이 회차 42의 제출자 목록 조회
3. 전체 멤버에서 제출자 제외
4. 미제출자 목록 반환
5. **최종 결과**: 운영자가 미제출자에게 개별적으로 연락 가능

### 실패/예외 시나리오

1. **활성 회차 없음**:
   - 조회 시간에 마감 임박한 회차가 없음
   - 시스템이 빈 배열 반환
   - 리마인더 발송 없음

2. **모두 제출 완료**:
   - 회차의 모든 멤버가 제출 완료
   - 미제출자 배열이 비어 있음
   - 리마인더 발송 스킵

3. **Discord webhook 실패**:
   - `DISCORD_WEBHOOK_URL`이 설정되지 않았거나 만료됨
   - 시스템이 500 에러 반환
   - n8n에서 에러 로그 확인 필요

## 제약사항 및 고려사항 (Constraints)

- **보안**:
  - 인증 메커니즘 없음 (공개 엔드포인트)
  - n8n/GitHub Actions에서만 호출하도록 네트워크 제한 필요
  - 환경변수 `DISCORD_WEBHOOK_URL` 노출 주의

- **성능**:
  - 전체 멤버 조회 쿼리는 멤버 수가 증가하면 비효율적
  - `generation_members` 조인으로 최적화 필요
  - Discord webhook 호출은 동기식 (여러 회차면 순차 호출)

- **배포**:
  - n8n 워크플로우 설정 필요
  - GitHub Actions cron job 설정 필요 (대안)

- **롤백**:
  - API 롤백 시 n8n 워크플로우 엔드포인트 URL 업데이트 필요

- **호환성**:
  - n8n webhook node 호환
  - GitHub Actions cron 표현식 호환

## 향후 확장 가능성 (Future Expansion)

- **`generation_members` 테이블 활성화** (최우선순위):
  - 현재: 전체 멤버 대상으로 미제출자 계산
  - 개선: 해당 기수의 멤버만 필터링
  - 효과: 미제출자 정확도 100% 향상

- **리마인더 발송 기록 테이블**:
  - 현재: 중복 발송 방지 불가
  - 개선: `reminder_logs` 테이블 추가
  - 스키마: `id`, `cycleId`, `sentAt`, `hoursBefore`
  - 효과: 알림 피로 방지

- **시간 윈도우 여유 추가**:
  - 현재: `hoursBefore=24`면 정확히 24시간 윈도우
  - 개선: 1시간(10%) 여 추가
  - 효과: cron 실행 타이밍에 따른 누락 방지

- **리마인더 템플릿 커스터마이징**:
  - 제안: 쿼리 파라미터로 메시지 커스텀
  - 예: `?includeSubmitted=false&tag=@here`
  - 효과: 긴급한 회차에는 @here 멘션

- **리마인더 예약 스케줄링**:
  - 현재: n8n에 스케줄링 위임
  - 개선: `reminder_schedules` 테이블로 DB에 일정 저장
  - 효과: API가 직접 스케줄링 관리, n8n 의존도 감소

- **개인별 리마인더 DM**:
  - 현재: 채널 공개 메시지
  - 개선: 미제출자 각각에게 Discord DM 발송
  - 효과: 프라이버시 강화, 알림 효과성 향상

## 추가로 필요 정보 (Needed Data/Decisions)

- TBD: `generation_members` 테이블 활성화 계획
  - 질문: 기수-멤버 연결 테이블을 언제 활성화할 것인가?
  - 오너: 운영팀

- TBD: 리마인더 발송 빈도 정책
  - 질문: 회차당 리마인더를 몇 회 발송하는가? (24시간 전, 6시간 전?)
  - 오너: 운영팀

- TBD: 중복 리마인더 발송 빈도
  - 질문: 실제 운영에서 중복 리마인더가 얼마나 자주 발생하는가?
  - 오너: 운영팀

- TBD: 시간대 설정
  - 질문: 서버는 UTC인가? 한국 시간(KST)인가?
  - 오너: 기술팀

---

**문서 버전**: 1.0.0
**생성일**: 2026-01-05
**마지막 업데이트**: 2026-01-05
**Git Commit**: f324133
