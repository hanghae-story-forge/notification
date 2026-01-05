# Status Tracking

- **Status**: As-Is (현재 구현)
- **Scope**: 제출 현황 조회 및 Discord 포맷팅
- **Based on**:
  - Facts: [../facts/routes/status.md](../facts/routes/status.md)
  - Insights: [../insights/operations/status-tracking.md](../insights/operations/status-tracking.md)
- **Last Verified**: 2026-01-05

## 개요 (Overview)

- **목적**: 특정 회차의 제출 현황을 조회하여 JSON과 Discord webhook 페이로드 두 가지 형식으로 제공
- **범위**:
  - In-Scope:
    - 회차별 제출 현황 JSON 조회
    - Discord webhook 포맷 변환
    - 요약 통계 (전체, 제출, 미제출)
    - 제출자 상세 목록
  - Out-of-Scope:
    - 멤버별 제출 히스토리 조회
    - 기수 전체 통계
    - 페이징 (현재 전체 목록 반환)
- **비즈니스 가치**: 운영자가 제출 현황을 수동으로 집계하는 시간을 **회차당 5-10분 절감**

## 핵심 기능 (Core Features)

### 1. 제출 현황 JSON 조회

- **설명**: 특정 회차의 제출 현황을 구조화된 JSON 형식으로 반환
- **주요 규칙**:
  - 사이클 정보 (ID, 주차, 날짜, 기수 이름)
  - 요약 통계 (전체 멤버 수, 제출자 수, 미제출자 수)
  - 제출자 상세 (이름, GitHub username, URL, 제출일시)
  - 미제출자 목록 (이름, GitHub username)
  - **[KNOWN ISSUE]**: 전체 멤버를 대상으로 통계 계산

### 2. Discord 포맷 변환

- **설명**: 제출 현황을 Discord webhook embed 페이로드 형식으로 변환
- **주요 규칙**:
  - 파란색 (0x0099ff) 임베드
  - 3개 필드 (제출, 미제출, 마감 시간)
  - Discord 상대적 타임스탬프 (`<t{unix}:R>`)
  - 빈 배열이면 "없음" 표시

### 3. 실시간 통계 계산

- **설명**: DB 조회 시점을 기준으로 실시간 통계 생성
- **주요 규칙**:
  - 요약 통계: 전체 멤버 수, 제출자 수, 미제출자 수
  - 제출자 목록: 제출일시 순서
  - 미제출자 목록: 이름 순서

## 기술 사양 (Technical Specifications)

- **아키텍처 개요**:
  - Hono 라우터로 2개의 엔드포인트 제공
  - Discord 봇에서 주로 호출
  - Drizzle ORM으로 DB 조회
  - Discord Service로 메시지 포맷팅

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

- **구현 접근**:
  - 사이클 조회 (cycles + generations JOIN)
  - 제출 목록 조회 (submissions + members JOIN)
  - 전체 멤버 조회 (members 테이블)
  - 제출자/미제출자 분리 (Set 자료구조 사용)
  - Discord 포맷은 별도 엔드포인트로 분리

- **관측/운영**:
  - 캐싱 미구현 (매번 DB 조회)
  - 조회 빈도 추적 미구현

- **실패 모드/대응**:
  - **회차를 찾지 못함**: 404 Not Found 반환
  - **DB 연결 실패**: 500 Internal Server Error 반환

## 데이터 구조 (Data Structure)

- **모델/스키마**:
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
  GET /api/status/42
    ↓
  cycles.id = 42 조회 (generations JOIN)
    ↓
  submissions.cycleId = 42 조회 (members JOIN)
    ↓
  members 테이블 전체 조회
    ↓
  submittedIds Set 생성
    ↓
  제출자/미제출자 분리
    ↓
  요약 통계 계산
  ```

- **검증/제약**:
  - `cycleId` 파라미터는 숫자 문자열이어야 함 (예: "42")

## API 명세 (API Specifications)

### GET /api/status/{cycleId}

- **Purpose**: 특정 회차의 제출 현황 조회 (JSON 형식)
- **Auth**: 없음 (공개 엔드포인트, Discord 봇에서 호출)
- **Request**:
  ```typescript
  interface PathParams {
    cycleId: string  // 숫자 문자열 (예: "42")
  }
  ```

- **Response**:
  ```typescript
  interface Response {
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
    submitted: Array<{
      name: string,           // 실명
      github: string,         // GitHub username
      url: string,            // 블로그 글 URL
      submittedAt: string     // ISO 8601 datetime
    }>,
    notSubmitted: Array<{
      name: string,           // 실명
      github: string          // GitHub username
    }>
  }
  ```

- **Errors**:
  - `404`: 회차를 찾을 수 없음

### GET /api/status/{cycleId}/discord

- **Purpose**: 제출 현황을 Discord webhook 페이로드 형식으로 반환
- **Auth**: 없음 (공개 엔드포인트, Discord 봇에서 호출)
- **Request**:
  ```typescript
  interface PathParams {
    cycleId: string  // 숫자 문자열 (예: "42")
  }
  ```

- **Response**:
  ```typescript
  interface DiscordWebhookPayload {
    embeds: Array<{
      title: string,          // "{generation.name} - {week}주차 제출 현황"
      color: number,          // 0x0099ff (파란색)
      fields: Array<{
        name: string,         // "✅ 제출 ({count})", "❌ 미제출 ({count})", "⏰ 마감 시간"
        value: string,        // 쉼표로 구분된 이름 또는 "없음"
        inline: boolean       // false
      }>,
      timestamp: string       // ISO 8601 datetime
    }>
  }
  ```

- **Errors**:
  - `404`: 회차를 찾을 수 없음

## 사용자 시나리오 (User Scenarios)

### 성공 시나리오: Discord 봇 명령어

1. 멤버가 Discord에서 `/status 42` 명령어 입력
2. Discord 봇이 `GET /api/status/42/discord` 호출
3. 시스템이 회차 42의 제출 현황 조회
4. Discord webhook 페이로드로 변환
5. Discord 봇이 embed 메시지로 전송
6. **최종 결과**: 채널에 제출 현황 임베드 표시

### 성공 시나리오: 운영자 대시보드

1. 운영자가 웹 대시보드에서 `GET /api/status/42` 호출
2. 시스템이 JSON 형식의 제출 현황 반환
3. 대시보드가 데이터를 시각화
4. **최종 결과**: 운영자가 팀 전체 상황 한눈에 파악

### 실패/예외 시나리오

1. **존재하지 않는 회차**:
   - 사용자가 `/status 999` 명령어 입력
   - 시스템이 404 에러 반환
   - Discord 봇이 "회차를 찾을 수 없습니다" 메시지 전송

2. **제출자 0명**:
   - 아무도 제출하지 않은 회차 조회
   - `submitted` 배열이 비어 있음
   - Discord 메시지에 "✅ 제출 (0) 없음" 표시

3. **모두 제출 완료**:
   - 모든 멤버가 제출 완료
   - `notSubmitted` 배열이 비어 있음
   - Discord 메시지에 "❌ 미제출 (0) 없음" 표시

## 제약사항 및 고려사항 (Constraints)

- **보안**:
  - 인증 메커니즘 없음 (공개 엔드포인트)
  - Discord 봇에서만 호출하도록 네트워크 제한 필요
  - 민감한 정보(실명)가 포함되어 있어 주의 필요

- **성능**:
  - 매번 3개의 DB 쿼리 실행 (사이클, 제출, 전체 멤버)
  - 캐싱 미구현 (반복 조회 시 비효율)
  - 멤버 수가 100명 이상이면 Discord 메시지 길이 제한(2000자) 초과 가능

- **배포**:
  - Discord 봇 배포 필요
  - 봇 코드에 엔드포인트 URL 설정 필요

- **롤백**:
  - API 롤백 시 Discord 봇 엔드포인트 URL 업데이트 필요

- **호환성**:
  - Discord Webhook API 호환
  - Discord bot API 호환

## 향후 확장 가능성 (Future Expansion)

- **`generation_members` 테이블 활성화** (최우선순위):
  - 현재: 전체 멤버 대상으로 통계 계산
  - 개선: 해당 기수의 멤버만 필터링
  - 효과: 기수별 참여율 정확도 100% 향상

- **캐싱 레이어 추가** (높은 우선순위):
  - 현재: 매번 DB 조회
  - 개선: Redis 또는 메모리 캐시 (TTL 5분)
  - 캐시 무효화: 제출 시 `redis.del('status:{cycleId}')`
  - 효과: DB 쿼리 90% 감소, 응답 시간 10배 개선

- **페이징 지원**:
  - 현재: 전체 목록 반환
  - 개선: `GET /api/status/{cycleId}?page=1&limit=20`
  - 효과: 대규모 멤버(100명 이상) 시 Discord 메시지 길이 제한 회피

- **단일 엔드포인트 + 쿼리 파라미터**:
  - 현재: 2개 엔드포인트 (JSON, Discord)
  - 개선: `GET /api/status/{cycleId}?format=json|discord|slack`
  - 효과: 유지관리 부담 감소

- **멤버별 제출 히스토리 조회**:
  - 제안: `GET /api/status/members/{memberId}?generationId=1`
  - 효과: 멤버 개인별 참여도 추적, 동기 부여 강화

- **상태 구독 (웹훅)**:
  - 제안: `POST /api/status/{cycleId}/subscribe`
  - 웹훅 URL 등록하여 제출 시 실시간 알림
  - 효과: 폴링(polling) 대신 웹훅으로 불필요한 API 호출 감소

- **데이터 시각화 대시보드**:
  - 현재: JSON API만 제공
  - 개선: 웹 대시보드로 제출 현황 시각화
  - 효과: 운영자가 트렌드 직관적 파악

- **Gamification**:
  - 제안: 제출 스트릭(연속 제출 횟수), 뱃지 시스템
  - 효과: 참여 동기 부여 강화

## 추가로 필요 정보 (Needed Data/Decisions)

- TBD: `generation_members` 테이블 활성화 계획
  - 질문: 기수-멤버 연결 테이블을 언제 활성화할 것인가?
  - 오너: 운영팀

- TBD: 캐싱 전략
  - 질문: Redis를 도입할 것인가? 메모리 캐시로 충분한가?
  - 오너: 기술팀

- TBD: 상태 조회 패턴
  - 질문: 일일 조회 횟수는? 주로 조회되는 시간대는?
  - 오너: 운영팀

- TBD: Discord 메시지 길이 제한 문제
  - 질문: 현재 멤버 수는? 2000자 제한에 걸린 적이 있는가?
  - 오너: 운영팀

---

**문서 버전**: 1.0.0
**생성일**: 2026-01-05
**마지막 업데이트**: 2026-01-05
**Git Commit**: f324133
