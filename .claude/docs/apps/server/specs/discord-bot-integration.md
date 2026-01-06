# Discord Bot 통합 (Discord Bot Integration)

- **Status**: As-Is (현재 구현)
- **App Scope**: apps/server
- **Scope**: Discord Bot Slash Commands 및 알림 시스템
- **Based on**:
  - Facts:
    - [.claude/docs/apps/server/facts/application/queries.md](../../facts/application/queries.md#getcyclestatusquery)
    - [.claude/docs/apps/server/facts/presentation/graphql.md](../../facts/presentation/graphql.md)
  - Insights:
    - [.claude/docs/apps/server/insights/impact/member-experience.md](../../insights/impact/member-experience.md)
- **Last Verified**: 2025-01-07
- **Repo Ref**: 82509c3

## 개요 (Overview)

- **目的**: Discord Bot을 통해 멤버가 손쉽게 제출 현황을 조회하고, 조직별로 분리된 알림을 수신
- **범위**:
  - **In-Scope**:
    - Discord Bot Slash Commands (/current-cycle, /check-submission)
    - 조직별 제출 현황 조회
    - 조직별 Discord 알림 분리
    - Discord 임베드 메시지 형식
  - **Out-of-Scope**:
    - Discord Bot 인증/인가 (현재 미구현)
    - 대화형 인터페이스 (Natural Language)
    - Discord Bot을 통한 조직 관리 (추후 추가 예정)
- **비즈니스 가치**:
  - **사용자 경험 개선**: Discord 내에서 모든 작업 완료 (별도 사이트 이동 불필요)
  - **조직별 프라이버시**: 조직별 Discord 웹훅 URL로 분리된 알림
  - **실시간 피드백**: 제출 후 1초 이내 Discord 알림 수신
  - **참여도 향상**: 투명한 제출 현황 공개로 사회적 압력 및 동기 부여
- **관련 앱**: apps/server (백엔드 API 서버)

## 핵심 기능 (Core Features)

### 1. /current-cycle Command

- **설명**: 현재 진행 중인 사이클 조회 (일수, 시간 남음)
- **주요 규칙**:
  - 현재 채널의 조직을 추론 (TBD - 현재는 'dongueldonguel' 하드코딩)
  - 활성화된 Generation의 진행 중인 Cycle 조회
  - Discord 임베드로 일수, 시간 남음 표시
  - 멤버가 속한 조직의 사이클만 조회 가능 (TBD - 권한 검증 미구현)

### 2. /check-submission Command

- **설명**: 특정 사이클의 제출 현황 조회
- **주요 규칙**:
  - 사이클 ID를 인자로 받음
  - 제출자, 미제출자 목록 표시
  - Discord 임베드로 정리된 형식 표시
  - 멤버가 속한 조직의 사이클만 조회 가능 (TBD - 권한 검증 미구현)

### 3. 조직별 Discord 알림 분리

- **설명**: 조직별 Discord 웹훅 URL로 분리된 알림 전송
- **주요 규칙:
  - 제출 알림: 🎉 초록색 (성공) - 조직별 Discord 웹훅으로 분리
  - 마감 리마인더: ⏰ 주황색 (경고) - 조직별 멤버만 대상
  - 제출 현황: 파란색 (정보) - 조직별 제출자/미제출자 목록
  - Discord 웹훅 URL은 organizations 테이블에서 조회

### 4. Discord 임베드 메시지 형식

- **설명**: Discord Embed Object로 포맷된 메시지 전송
- **주요 규칙**:
  - 제목, 색상, 필드, 푸터 등 Discord Embed 스펙 준수
  - 각 알림 유형별로 다른 색상 사용
  - 시간 정보는 ISO 8601 형식 또는 상대적 시간 (예: "2일 남음")

## 기술 사양 (Technical Specifications)

### 아키텍처 개요

**Discord Bot 통신 흐름**:
```
Discord User
  ↓ (Slash Command)
Discord Bot (별도 서버)
  ↓ (HTTP Request to apps/server)
apps/server (GraphQL API)
  ↓ (Query)
PostgreSQL
  ↓ (Response)
Discord Bot
  ↓ (Embed Message)
Discord Channel
```

**알림 흐름**:
```
GitHub Webhook
  ↓ (POST /webhook/github)
apps/server (RecordSubmissionCommand)
  ↓ (Domain Event)
Discord Service (createSubmissionMessage)
  ↓ (HTTP POST)
Discord Webhook (organizations 테이블의 discord_webhook_url)
  ↓
Discord Channel (조직별 채널)
```

### 의존성

**Apps**:
- 없음 (단일 앱 구조)
- **Note**: Discord Bot은 별도 서버로 구동 (코드 베이스에 없음)

**Packages**:
- 없음

**Libraries**:
- `discord.js` (Discord Bot 서버에서 사용)
- `pylon` - GraphQL framework

**Env Vars**:
- `DISCORD_WEBHOOK_URL` - Discord webhook URL (조직별로 DB에 저장)
- `DISCORD_BOT_TOKEN` - Discord Bot token (Discord Bot 서버)

### 구현 접근

**Slash Commands**:
- Discord Bot이 Slash Command를 수신
- Discord Bot이 apps/server GraphQL API로 HTTP 요청
- GetCycleStatusQuery.getCurrentCycle(organizationSlug) 실행
- Discord Bot이 응답을 Discord Embed로 변환
- Discord Bot이 Discord Channel로 응답

**Notifications**:
- RecordSubmissionCommand 실행 후 SubmissionCreatedEvent 발행
- Discord Service가 이벤트를 수신
- createSubmissionMessage()로 Discord Embed 생성
- sendDiscordWebhook()으로 Discord Webhook URL로 전송

**Organization Context**:
- 현재: 'dongueldonguel' 하드코딩
- 추후: Discord Channel ID로 조직 식별 (TBD)

### 관측/운영

- **Logging**: Discord Webhook 전송 로그 (성공/실패)
- **Metrics**: TBD (Prometheus/Grafana integration 필요)
  - Discord Webhook 응답 시간
  - Discord Webhook 실패율
  - Slash Command 사용량
- **Tracing**: TBD (OpenTelemetry integration 필요)

### 실패 모드/대응

- **Discord Webhook 실패**: 에러 로깅하나 제출은 계속 진행 (idempotency 보장)
- **Slash Command 타임아웃**: 3초 이내 응답하거나 "Thinking..." 상태 후 15분 이내 후속 응답
- **조직 미존재**: "Organization not found" 에러 메시지 반환
- **사이클 미존재**: "No active cycle found" 메시지 반환

## 데이터 구조 (Data Structure)

### 모델/스키마

**organizations 테이블**:
- **discord_webhook_url**: Discord 웹훅 URL (조직별로 분리)

**members 테이블**:
- **discord_id**: Discord User ID (멤버 식별)

**cycles 테이블**:
- **start_date, end_date**: 사이클 기간 (시간 계산용)

**submissions 테이블**:
- **member_id, cycle_id**: 제출자/사이클 연결

### 데이터 흐름

**Slash Command 흐름**:
```
Discord User: /current-cycle
  ↓
Discord Bot: HTTP GET /api/status/current?organizationSlug=dongueldonguel
  ↓
apps/server: GetCycleStatusQuery.getCurrentCycle('dongueldonguel')
  ↓
Query Handler:
  1. OrganizationRepository.findBySlug('dongueldonguel')
  2. GenerationRepository.findActiveByOrganization(organizationId)
  3. CycleRepository.findActiveCyclesByGeneration(generationId)
  4. 현재 시간과 start_date/end_date 비교
  ↓
Response: { cycle, daysElapsed, daysRemaining, hoursRemaining }
  ↓
Discord Bot: Discord Embed 생성
  ↓
Discord Bot: Discord Channel로 응답
```

**알림 흐름**:
```
GitHub Webhook: POST /webhook/github
  ↓
apps/server: RecordSubmissionCommand.execute()
  ↓
Command Handler:
  1. Cycle으로 Generation 찾기
  2. Generation으로 Organization 찾기
  3. GitHub Username으로 Member 찾기
  4. 활성 멤버 확인
  5. Submission 생성 및 저장
  ↓
Discord Service: createSubmissionMessage(submission, memberName, cycleName, organizationSlug)
  ↓
Discord Service: sendDiscordWebhook(organization.discordWebhookUrl, embed)
  ↓
Discord Webhook: Discord Channel로 알림 전송
```

### 검증/제약

**Business Rules**:
- 활성 멤버(APPROVED)만 제출 권한
- 조직별 Discord 웹훅 URL로 분리된 알림
- Slash Command는 3초 이내 응답

**Validation**:
- Discord Webhook URL 유효성 검증 (`discord.com` 호스트네임)
- Slash Command 인자 유효성 검증 (사이클 ID 숫자)

## API 명세 (API Specifications)

### REST API (Discord Bot에서 호출)

#### GET /api/status/current

- **Purpose**: 현재 진행 중인 사이클 조회
- **Location**: `apps/server/src/routes/status.ts` (TBD - 현재 GraphQL만 구현)
- **Auth**: TBD (현재 미구현)
- **Request**:
  ```http
  GET /api/status/current?organizationSlug=dongueldonguel
  ```
- **Query Parameters**:
  - `organizationSlug: string` - 조직 식별자
- **Response**:
  ```typescript
  interface CurrentCycleResponse {
    cycle: {
      id: number;
      week: number;
      startDate: Date;
      endDate: Date;
      githubIssueUrl: string;
    };
    daysElapsed: number;
    daysRemaining: number;
    hoursRemaining: number;
    organizationSlug: string;
  } | null
  ```
- **Errors**:
  - `404`: No active cycle found
- **Evidence**: [GetCycleStatusQuery](../../facts/application/queries.md#getcyclestatusquery)

#### GET /api/status/:cycleId

- **Purpose**: 특정 사이클의 제출 현황 조회
- **Location**: `apps/server/src/routes/status.ts` (L1-L80)
- **Auth**: None (공개)
- **Request**:
  ```http
  GET /api/status/42?organizationSlug=dongueldonguel
  ```
- **Path Parameters**:
  - `cycleId: number` - 사이클 ID
- **Query Parameters**:
  - `organizationSlug: string` - 조직 식별자
- **Response**:
  ```typescript
  interface CycleStatusResponse {
    cycle: {
      id: number;
      week: number;
      startDate: Date;
      endDate: Date;
      githubIssueUrl: string;
    };
    summary: {
      totalMembers: number;
      submittedCount: number;
      notSubmittedCount: number;
      submissionRate: number; // 0-100
    };
    submitted: Array<{
      member: { name: string };
      url: string;
      submittedAt: Date;
    }>;
    notSubmitted: Array<{
      member: { name: string };
    }>;
  }
  ```
- **Errors**:
  - `404`: Cycle not found
- **Evidence**: [status.ts](../../CLAUDE.md#route-handlers)

#### GET /api/status/:cycleId/discord

- **Purpose**: 특정 사이클의 제출 현황을 Discord 웹훅 페이로드로 반환
- **Location**: `apps/server/src/routes/status.ts` (L82-L150)
- **Auth**: None (공개)
- **Request**:
  ```http
  GET /api/status/42/discord?organizationSlug=dongueldonguel
  ```
- **Path Parameters**:
  - `cycleId: number` - 사이클 ID
- **Query Parameters**:
  - `organizationSlug: string` - 조직 식별자
- **Response**:
  ```typescript
  // Discord Webhook Embed Object
  interface DiscordWebhookResponse {
    embeds: Array<{
      title: string;
      color: number; // Decimal color
      fields: Array<{
        name: string;
        value: string;
        inline?: boolean;
      }>;
      footer?: {
        text: string;
      };
      timestamp?: string; // ISO 8601
    }>;
  }
  ```
- **Errors**:
  - `404`: Cycle not found
- **Evidence**: [status.ts](../../CLAUDE.md#route-handlers)

### GraphQL API (Discord Bot에서 호출)

#### activeCycle Query

- **Purpose**: 현재 진행 중인 사이클 조회
- **Location**: `apps/server/src/presentation/graphql/pylon.service.ts` (L65-L70)
- **Auth**: TBD (현재 미구현)
- **Request**:
  ```graphql
  query GetActiveCycle {
    activeCycle {
      id
      week
      startDate
      endDate
      githubIssueUrl
    }
  }
  ```
- **Response**:
  ```typescript
  interface GetActiveCycleResponse {
    activeCycle: {
      id: number;
      week: number;
      startDate: Date;
      endDate: Date;
      githubIssueUrl: string;
    } | null;
  }
  ```
- **Note**: 현재 하드코딩된 조직 slug 사용 ('dongueldonguel')
- **Evidence**: [pylon.service.ts](../../facts/presentation/graphql.md#activecycle)

#### cycleStatus Query

- **Purpose**: 사이클별 제출 현황 조회
- **Location**: `apps/server/src/presentation/graphql/pylon.service.ts` (L72-L79)
- **Auth**: TBD (현재 미구현)
- **Request**:
  ```graphql
  query GetCycleStatus($cycleId: Int!, $organizationSlug: String!) {
    cycleStatus(cycleId: $cycleId, organizationSlug: $organizationSlug) {
      cycle {
        id
        week
        startDate
        endDate
      }
      summary {
        totalMembers
        submittedCount
        notSubmittedCount
        submissionRate
      }
      submitted {
        member { name }
        url
        submittedAt
      }
      notSubmitted {
        member { name }
      }
    }
  }
  ```
- **Response**:
  ```typescript
  interface GetCycleStatusResponse {
    cycleStatus: {
      cycle: {
        id: number;
        week: number;
        startDate: Date;
        endDate: Date;
      };
      summary: {
        totalMembers: number;
        submittedCount: number;
        notSubmittedCount: number;
        submissionRate: number;
      };
      submitted: Array<{
        member: { name: string };
        url: string;
        submittedAt: Date;
      }>;
      notSubmitted: Array<{
        member: { name: string };
      }>;
    };
  }
  ```
- **Evidence**: [pylon.service.ts](../../facts/presentation/graphql.md#cyclestatus)

### Discord Webhook API (apps/server에서 호출)

#### POST {DISCORD_WEBHOOK_URL}

- **Purpose**: Discord 알림 전송
- **Location**: `apps/server/src/services/discord.ts`
- **Auth**: Discord Webhook URL (organizations 테이블에서 조회)
- **Request**:
  ```http
  POST {discord_webhook_url}
  Content-Type: application/json

  {
    "embeds": [
      {
        "title": "🎉 홍길동님이 제출했습니다!",
        "color": 65280, // Green
        "fields": [
          {
            "name": "주차",
            "value": "1주차",
            "inline": true
          },
          {
            "name": "제출일",
            "value": "2025-01-07 14:30",
            "inline": true
          },
          {
            "name": "글 링크",
            "value": "[https://blog.example.com/my-post](https://blog.example.com/my-post)"
          }
        ],
        "footer": {
          "text": "똥글똥글"
        },
        "timestamp": "2025-01-07T14:30:00Z"
      }
    ]
  }
  ```
- **Response**:
  ```http
  HTTP/1.1 204 No Content
  ```
- **Errors**:
  - `400`: Invalid request body
  - `404`: Webhook not found
  - `500`: Discord server error

## 사용자 시나리오 (User Scenarios)

### 성공 시나리오

#### 1. 멤버가 현재 사이클 조회 (/current-cycle)

1. 멤버가 Discord 채널에서 `/current-cycle` 명령어 실행
2. Discord Bot이 Slash Command 수신
3. Discord Bot이 apps/server로 HTTP 요청
   ```
   GET /api/status/current?organizationSlug=dongueldonguel
   ```
4. GetCycleStatusQuery.getCurrentCycle('dongueldonguel') 실행
5. 시스템이 조직 존재 확인
6. 시스템이 활성화된 Generation 찾기
7. 시스템이 진행 중인 Cycle 찾기
8. 현재 시간과 start_date/end_date 비교하여 일수, 시간 계산
9. Discord Bot이 응답을 Discord Embed로 변환
   ```
   📊 현재 사이클 현황

   1주차 (진행 중)
   ⏰ 3일 12시간 남음
   📅 2025-01-04 ~ 2025-01-11
   ```
10. Discord Bot이 Discord Channel로 응답

#### 2. 멤버가 제출 현황 조회 (/check-submission)

1. 멤버가 Discord 채널에서 `/check-submission 42` 명령어 실행
2. Discord Bot이 Slash Command 수신
3. Discord Bot이 apps/server로 HTTP 요청
   ```
   GET /api/status/42?organizationSlug=dongueldonguel
   ```
4. GetCycleStatusQuery.getCycleStatus(42, 'dongueldonguel') 실행
5. 시스템이 사이클 존재 확인
6. 시스템이 조직의 활성 멤버 목록 조회
7. 시스템이 제출자 목록 조회 (submissions 테이블)
8. 시스템이 미제출자 목록 계산
9. Discord Bot이 응답을 Discord Embed로 변환
   ```
   📋 1주차 제출 현황

   ✅ 제출자 (5명)
   • 홍길동
   • 김철수
   • 이영희
   • 박민수
   • 최수진

   ⏳ 미제출자 (3명)
   • 강감찬
   • 유관순
   • 이순신
   ```
10. Discord Bot이 Discord Channel로 응답

#### 3. 멤버가 제출 후 Discord 알림 수신

1. 멤버가 GitHub Issue에 댓글로 블로그 URL 게시
2. GitHub Webhook이 POST /webhook/github로 전송
3. RecordSubmissionCommand 실행
4. 조직 확인 (dongueldonguel)
5. 활성 멤버 확인
6. Submission 생성 및 저장
7. Discord Service가 createSubmissionMessage() 호출
8. Discord Embed 생성
   ```
   🎉 홍길동님이 제출했습니다!

   **1주차** - 2025-01-07 14:30
   [https://blog.example.com/my-post](https://blog.example.com/my-post)
   ```
9. Discord Service가 sendDiscordWebhook() 호출
10. organizations 테이블에서 discord_webhook_url 조회
11. Discord Webhook URL로 HTTP POST
12. Discord Channel에 알림 전송
13. 멤버들이 알림 확인

### 실패/예외 시나리오

#### 1. 진행 중인 사이클 없음

1. 멤버가 `/current-cycle` 명령어 실행
2. Discord Bot이 apps/server로 HTTP 요청
3. GetCycleStatusQuery.getCurrentCycle('dongueldonguel') 실행
4. 진행 중인 사이클 없음 (활성화된 Generation 없거나, 진행 중인 Cycle 없음)
5. null 반환
6. Discord Bot이 "현재 진행 중인 사이클이 없습니다" 메시지 반환

#### 2. 존재하지 않는 사이클 조회

1. 멤버가 `/check-submission 9999` 명령어 실행
2. Discord Bot이 apps/server로 HTTP 요청
   ```
   GET /api/status/9999?organizationSlug=dongueldonguel
   ```
3. GetCycleStatusQuery.getCycleStatus(9999, 'dongueldonguel') 실행
4. 사이클 미존재 (404)
5. Discord Bot이 "사이클을 찾을 수 없습니다" 에러 메시지 반환

#### 3. Discord Webhook 실패

1. GitHub Webhook이 POST /webhook/github로 전송
2. RecordSubmissionCommand 실행
3. Submission 생성 및 저장
4. Discord Service가 sendDiscordWebhook() 호출
5. Discord Webhook URL로 HTTP POST 실패 (네트워크 에러, Discord 서버 다운 등)
6. 에러 로깅 (console.error)
7. 제출은 계속 진행 (idempotency 보장)
8. 멤버는 제출 성공하나 Discord 알림 미수신

## 제약사항 및 고려사항 (Constraints)

### 보안

- **Discord Webhook URL 보안**: DB에 암호화하여 저장 권장 (현재 평문 저장)
- **Slash Command 권한**: TBD (현재 누구나 호출 가능)
- **조직별 데이터 격리**: Slash Command에 organizationSlug 파라미터로 조직 식별 (권한 검증 미구현)

### 성능

- **Slash Command 타임아웃**: 3초 이내 응답해야 함 (Discord 제한)
- **Discord Webhook Rate Limit**: 글로벌 제한 없으나, 과도한 요청 시 차단 가능
- **캐싱**:
  - 현재 진행 중인 사이클 정보 캐싱 권장 (TTL: 1분)
  - 제출 현황 캐싱 권장 (TTL: 5분)

### 배포

- **Discord Bot 배포**: Discord Bot은 별도 서버로 구동 (코드 베이스에 없음)
- **Slash Commands 등록**: Discord Developer Portal에서 수동 등록 필요
- **Webhook URL 설정**: organizations 테이블에 discord_webhook_url 컬럼 업데이트

### 롤백

- **Slash Commands**: Discord Developer Portal에서 수동 삭제
- **Webhook URL**: organizations 테이블에서 NULL로 설정
- **Feature Flag**: Discord Bot 기능을 Feature Flag로 관리하여 긴급 시 비활성화 가능

### 호환성

- **Backward Compatibility**:
  - 기존 REST API (/api/status/:cycleId) 계속 지원
  - GraphQL API도 동일한 기능 제공
- **Breaking Changes**:
  - organizationSlug 파라미터 추가 (기본값: 'dongueldonguel')

### 앱 간 통신

- **Discord Bot ↔ apps/server**: HTTP (REST API 또는 GraphQL API)
- **GitHub Webhook → apps/server**: HTTP (POST /webhook/github)
- **apps/server → Discord Webhook**: HTTP (POST {discord_webhook_url})

## 향후 확장 가능성 (Future Expansion)

### 1. Discord Bot 인증/인가

- **현재**: Slash Commands 누구나 호출 가능
- **추후**: Discord OAuth 2.0으로 인증하여 멤버 식별
- **구현**:
  - Discord Bot이 Discord User ID를 헤더에 포함
  - apps/server에서 members 테이블로 discord_id 조회
  - 조직별 활성 멤버인지 확인

### 2. Discord Bot을 통한 조직 관리

- **현재**: 제출 현황 조회만 가능
- **추후**: 조직 가입, 멤버 승인 등 관리 기능
- **구현**:
  - `/join-org <slug>` - 조직 가입 요청
  - `/my-orgs` - 내가 속한 조직 목록
  - `/approve-member <username>` - 멤버 승인 (관리자 전용)
  - `/add-member <github>` - 멤버 추가 (관리자 전용)

### 3. 대화형 인터페이스 (Natural Language)

- **현재**: Slash Commands로 정형된 입력
- **추후**: 자연어 질문 이해
- **구현**:
  - "이번 주 제출 현황 알려줘" → 자동으로 현재 사이클 조회
  - "몇 명이나 제출했어?" → 제출자 수 반환
  - LLM 기반 자연어 처리 (OpenAI GPT-4 등)

### 4. 개인별 DM 알림

- **현재**: 조직별 채널에 공개 알림
- **추후**: 개인별 DM으로 맞춤 알림
- **구현**:
  - "당신의 제출이 기록되었습니다" (제출자에게만)
  - "아직 제출하지 않았습니다" (미제출자에게만)
  - Discord Bot API의 DM 기능 사용

### 5. 리마인더 타이밍 개인화

- **현재**: n8n에서 일괄 리마인더 (24시간 전, 6시간 전 등)
- **추후**: 멤버별 선호 시간 조사하여 개인화
- **구현**:
  - member_preferences 테이블 추가
  - reminder_hours_before 컬럼 (24, 6, 1 등)
  - n8n에서 멤버별로 필터링하여 리마인더 발송

### 6. Discord Bot 이모지 리액션

- **현재**: 텍스트 메시지만 전송
- **추후**: 제출한 글에 팀원이 리액션 (👍, 🔥)
- **구현**:
  - `/react <submissionId> 🔥` 명령어 추가
  - submission_reactions 테이블 추가
  - 리액션 수에 따라 뱃지 시스템 ("🔥 10개 리액션 받은 글")

## 추가로 필요 정보 (Needed Data/Decisions)

### TBD: Discord Bot 구현

- **질문**: Discord Bot을 어떻게 구현할 것인가?
- **오너**: Backend Team
- **옵션**:
  1. discord.js (Node.js) - 권장 (TypeScript生态系统 호환)
  2. discord.py (Python)
  3. Nostrum (Elixir)
- **결정 필요**: Discord Bot 언어/프레임워크

### TBD: Discord Bot 호스팅

- **질문**: Discord Bot을 어디에 호스팅할 것인가?
- **오너**: DevOps Team
- **옵션**:
  1. Railway (쉬운 배포)
  2. Fly.io (글로벌 배포)
  3. AWS ECS (확장성)
  4. Self-hosted (VPS)

### TBD: Slash Commands 등록 프로세스

- **질문**: Slash Commands를 어떻게 등록할 것인가?
- **오너**: Backend Team
- **옵션**:
  1. Discord Developer Portal에서 수동 등록
  2. Discord Bot 시작 시 자동 등록 (코드로 구현)
- **권장**: 2번 (자동화)

### TBD: Organization Context 추론

- **질문**: Discord Slash Command에서 조직을 어떻게 식별할 것인가?
- **오너**: Backend Team
- **옵션**:
  1. Discord Channel ID로 조직 식별 (organizations 테이블에 discord_channel_id 컬럼 추가)
  2. Slash Command 인자로 organizationSlug 전달 (현재 방식)
  3. Discord Bot이 Discord User ID로 소속 조직 조회 (다중 소속 시 문제)
- **권장**: 1번 (채널-조직 1:1 매핑)

### TBD: Discord Webhook 실패 처리

- **질문**: Discord Webhook 실패 시 어떻게 대처할 것인가?
- **오너**: Backend Team
- **옵션**:
  1. 재시도 로직 (Exponential Backoff)
  2. Dead Letter Queue (SQS 등)
  3. 에러 로깅만 하고 무시 (현재 방식)
- **권장**: 1번 (재시도 3회, 지수 백오프)

### TBD: Slash Commands 권한 검증

- **질문**: Slash Commands에 권한 검증을 어떻게 구현할 것인가?
- **오너**: Backend Team
- **제안**:
  - Discord Bot이 Discord User ID를 헤더에 포함 (X-Discord-User-ID)
  - apps/server에서 members 테이블로 discord_id 조회
  - 조직별 활성 멤버인지 확인 (organization_members 테이블)
  - 활성 멤버가 아니면 403 Forbidden 반환
