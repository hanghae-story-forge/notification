# Discord Notifications

- **Status**: As-Is (현재 구현)
- **Scope**: Discord webhook 메시지 생성 및 전송
- **Based on**:
  - Facts: [../facts/services/discord.md](../facts/services/discord.md)
  - Insights: [../insights/operations/discord-notifications.md](../insights/operations/discord-notifications.md)
- **Last Verified**: 2026-01-05

## 개요 (Overview)

- **목적**: 시스템의 주요 이벤트(제출, 리마인더, 현황 조회)를 Discord webhook으로 멤버들에게 실시간 알림
- **범위**:
  - In-Scope:
    - 제출 알림 메시지 생성 및 전송
    - 마감 리마인더 메시지 생성 및 전송
    - 제출 현황 리포트 메시지 생성
    - Discord 임베드(embeds) 형식 지원
  - Out-of-Scope:
    - 개인별 DM 발송 (현재는 채널 공개 메시지만)
    - Discord 버튼/컴포넌트 활용
    - 다국어 지원 (현재는 한국어만)
- **비즈니스 가치**: 제출 후 **1초 이내 실시간 피드백** 제공으로 멤버 참여도 향상, 운영자 알림 수동 발송 시간 **회차당 5-10분 절감**

## 핵심 기능 (Core Features)

### 1. 제출 알림 메시지 생성

- **설명**: 멤버가 블로그 글을 제출하면 Discord에 축하 메시지 전송
- **주요 규칙**:
  - 초록색 (0x00ff00) 임베드
  - 이모지: 🎉
  - 제출자 이름, 회차 이름, 블로그 URL 포함
  - 타임스탬프: ISO 8601

### 2. 마감 리마인더 메시지 생성

- **설명**: 마감 임박한 회차에 대해 미제출자 목록과 남은 시간 알림
- **주요 규칙**:
  - 주황색 (0xffaa00) 임베드
  - 이모지: ⏰
  - 남은 시간 자연어 변환 (>= 24시간: "N일 M시간", < 24시간: "N시간")
  - 미제출자 목록 쉼표로 구분
  - Discord 전체 날짜 포맷 타임스탬프 (`<t{unix}:F>`)

### 3. 제출 현황 리포트 메시지 생성

- **설명**: 특정 회차의 제출 현황을 구조화된 임베드로 표현
- **주요 규칙**:
  - 파란색 (0x0099ff) 임베드
  - 이모지: ✅ (제출), ❌ (미제출), ⏰ (마감 시간)
  - 3개 필드 (제출, 미제출, 마감 시간)
  - Discord 상대적 시간 포맷 타임스탬프 (`<t{unix}:R>`)
  - 빈 배열이면 "없음" 표시

### 4. Discord Webhook 전송

- **설명**: 생성된 메시지 페이로드를 Discord webhook URL로 HTTP POST 전송
- **주요 규칙**:
  - `Content-Type: application/json` 헤더
  - 응답이 2xx가 아니면 예외 발생
  - 재시도 메커니즘 없음
  - 실패 시 알림 없음

## 기술 사양 (Technical Specifications)

- **아키텍처 개요**:
  - 순수 함수로 메시지 생성 로직 캡슐화
  - HTTP fetch API로 Discord webhook 전송
  - GitHub webhook, Reminder, Status API에서 호출

- **의존성**:
  - Services:
    - None (순수 함수)
  - Packages:
    - None (표준 fetch API만 사용)
  - Libraries:
    - None
  - Env Vars:
    - `DISCORD_WEBHOOK_URL` - Discord webhook URL (선택, 미설정 시 알림 조용히 실패)

- **구현 접근**:
  - `createSubmissionMessage()`: 제출 알림 페이로드 생성
  - `createReminderMessage()`: 리마인더 페이로드 생성 (시간 계산 포함)
  - `createStatusMessage()`: 현황 리포트 페이로드 생성
  - `sendDiscordWebhook()`: webhook 전송

- **관측/운영**:
  - 전송 성공/실패 로깅 미구현
  - 실패 모니터링 미구현

- **실패 모드/대응**:
  - **Webhook URL 만료**: 예외 발생, 호출자에서 처리 필요
  - **Discord 서버 오류**: 예외 발생, 재시도 없음
  - **네트워크 오류**: 예외 발생, 재시도 없음

## 데이터 구조 (Data Structure)

- **모델/스키마**:
  - 외부 의존성 없음 (순수 함수)

- **데이터 흐름**:
  ```
  이벤트 발생 (제출/리마인더/현황 조회)
    ↓
  메시지 생성 함수 호출
    ↓
  DiscordWebhookPayload 생성
    ↓
  sendDiscordWebhook() 호출
    ↓
  HTTP POST to Discord API
    ↓
  성공: 2xx 응답
  실패: 예외 발생
  ```

- **검증/제약**:
  - `DiscordWebhookPayload` 타입으로 TypeScript 타입 안전성 보장
  - 필수 필드: `embeds[0].title`, `embeds[0].color`

## API 명세 (API Specifications)

### createSubmissionMessage()

- **Purpose**: 제출 알림 메시지 생성
- **Signature**:
  ```typescript
  function createSubmissionMessage(
    memberName: string,    // 제출자 이름
    blogUrl: string,       // 블로그 글 URL
    cycleName: string      // 회차 이름 (예: "2주차")
  ): DiscordWebhookPayload
  ```

- **Returns**:
  ```typescript
  interface DiscordWebhookPayload {
    content: string,  // "🎉 {memberName}님이 글을 제출했습니다!"
    embeds: Array<{
      title: string,  // "{cycleName} 제출 완료"
      description: string,  // "[글 보러가기]({blogUrl})"
      color: number,  // 0x00ff00 (초록색)
      timestamp: string  // ISO 8601
    }>
  }
  ```

### createReminderMessage()

- **Purpose**: 마감 리마인더 메시지 생성
- **Signature**:
  ```typescript
  function createReminderMessage(
    cycleName: string,      // 회차 이름 (예: "똥글똥글 1기 - 2주차")
    deadline: Date,         // 마감일시
    notSubmitted: string[]  // 미제출자 이름 목록
  ): DiscordWebhookPayload
  ```

- **Returns**:
  ```typescript
  interface DiscordWebhookPayload {
    content: string,  // "⏰ {cycleName} 마감까지 {timeLeft} 남았습니다!"
    embeds: Array<{
      title: string,  // "미제출자 목록"
      description: string,  // 쉼표로 구분된 이름
      color: number,  // 0xffaa00 (주황색)
      fields: Array<{
        name: string,  // "마감 시간"
        value: string,  // "<t{unix}:F>" (전체 날짜)
        inline: boolean
      }>,
      timestamp: string
    }>
  }
  ```

### createStatusMessage()

- **Purpose**: 제출 현황 리포트 메시지 생성
- **Signature**:
  ```typescript
  function createStatusMessage(
    cycleName: string,      // 회차 이름 (예: "똥글똥글 1기 - 2주차")
    submitted: string[],     // 제출자 이름 목록
    notSubmitted: string[],  // 미제출자 이름 목록
    deadline: Date           // 마감일시
  ): DiscordWebhookPayload
  ```

- **Returns**:
  ```typescript
  interface DiscordWebhookPayload {
    embeds: Array<{
      title: string,  // "{cycleName} 제출 현황"
      color: number,  // 0x0099ff (파란색)
      fields: Array<{
        name: string,  // "✅ 제출 ({count})", "❌ 미제출 ({count})", "⏰ 마감 시간"
        value: string,  // 쉼표로 구분된 이름 또는 "없음"
        inline: boolean
      }>,
      timestamp: string
    }>
  }
  ```

### sendDiscordWebhook()

- **Purpose**: Discord webhook URL로 메시지 전송
- **Signature**:
  ```typescript
  async function sendDiscordWebhook(
    webhookUrl: string,               // Discord webhook URL
    payload: DiscordWebhookPayload    // 전송할 메시지
  ): Promise<void>
  ```

- **Errors**:
  - `Error("Discord webhook failed: {statusText}")`: HTTP 응답이 2xx가 아님

## 사용자 시나리오 (User Scenarios)

### 성공 시나리오: 제출 알림

1. 멤버가 GitHub Issue에 댓글로 블로그 URL 제출
2. GitHub webhook 핸들러가 제출 저장
3. `createSubmissionMessage()` 호출로 메시지 생성
4. `sendDiscordWebhook()` 호출로 Discord에 전송
5. Discord 채널에 "🎉 {memberName}님이 글을 제출했습니다!" 임베드 표시
6. **최종 결과**: 멤버가 즉시 피드백 받음, 다른 멤버들도 제출 사실 확인

### 성공 시나리오: 마감 리마인더

1. n8n cron job이 리마인더 API 호출
2. API가 미제출자 목록 조회
3. `createReminderMessage()` 호출로 메시지 생성
4. 남은 시간 자동 계산 (예: "2일 3시간")
5. `sendDiscordWebhook()` 호출로 Discord에 전송
6. Discord 채널에 "⏰ 똥글똥글 1기 - 2주차 마감까지 2일 3시간 남았습니다!" 임베드 표시
7. **최종 결과**: 미제출자들이 마감을 인지하고 제출 동기 부여

### 성공 시나리오: 제출 현황 조회

1. 멤버가 Discord 봇으로 `/status 42` 명령어 입력
2. 봇이 상태 API 호출
3. API가 `createStatusMessage()` 호출로 메시지 생성
4. 봇이 반환된 페이로드를 Discord에 전송
5. Discord 채널에 "똥글똥글 1기 - 2주차 제출 현황" 임베드 표시
6. **최종 결과**: 팀 전체가 제출 현황 실시간 확인

### 실패/예외 시나리오

1. **Webhook URL 만료**:
   - `DISCORD_WEBHOOK_URL`이 만료됨
   - `sendDiscordWebhook()`이 예외 발생
   - 호출자에서 예외 처리 필요 (현재 미구현)

2. **Discord 서버 오류**:
   - Discord 일시적 오류 (500 등)
   - `sendDiscordWebhook()`이 예외 발생
   - 재시도 없음, 알림 누락

3. **환경변수 미설정**:
   - `DISCORD_WEBHOOK_URL`이 설정되지 않음
   - 호출자에서 `undefined` 체크 후 전송 스킵
   - 알림 조용히 실패 (운영자 인지 어려움)

## 제약사항 및 고려사항 (Constraints)

- **보안**:
  - Webhook URL 노출 주의 (환경변수로 관리 중)
  - URL이 유출되면 스팸 메시지 전송 가능성

- **성능**:
  - 동기식 호출 (응답을 기다림)
  - Discord webhook 지연 시 전체 요청 지연
  - 재시도 없음으로 일시적 오류에 취약

- **배포**:
  - Discord webhook URL 설정 필요
  - Discord 서버에서 webhook 채널 설정 필요

- **롤백**:
  - Discord webhook URL 재설정 필요

- **호환성**:
  - Discord Webhook API v10 호환
  - Discord embeds 형식 호환

## 향후 확장 가능성 (Future Expansion)

- **Webhook 실패 시 재시도 및 알림** (높은 우선순위):
  - 현재: 실패 시 예외만 발생
  - 개선: 지수 백오프로 3회 재시도, 최종 실패 시 운영자 알림
  - 효과: 일시적 오류로 인한 알림 누락 90% 이상 감소

- **Webhook 헬스체크 엔드포인트**:
  - 제안: `GET /health/discord-webhook`
  - 동작: 테스트 메시지 전송으로 webhook 유효성 확인
  - 효과: Webhook URL 만료 등 사전 감지

- **메시지 템플릿 다국어 지원**:
  - 현재: 하드코딩된 한국어
  - 개선: i18n 템플릿 (영어, 일본어 등)
  - 효과: 다국어 멤버 지원

- **알림 피로 방지 Throttling**:
  - 현재: 무제한 발송 가능
  - 개선: 단일 회차에서 N회 이상 리마인더 방지
  - 효과: 알림 피로 방지

- **Discord 버튼/컴포넌트 활용**:
  - 제안: "제출 현황 보기" 버튼 추가
  - 효과: Discord 내에서 바로 GitHub Issue로 이동

- **다중 채널 알림**:
  - 현재: Discord만 지원
  - 개선: Slack, Telegram 등 확장
  - 효과: 멤버별 선호 채널 선택

- **알림 개인화**:
  - 현재: 전체 공개 메시지
  - 개선: 멤버별 알림 빈도 설정, 마감 N시간 전만 리마인더
  - 효과: 알림 효과성 향상

- **알림 분석**:
  - 제안: 메시지 열람률 추적, 리마인더 후 제출률 상관관계 분석
  - 효과: 최적 알림 타이밍 도출

## 추가로 필요 정보 (Needed Data/Decisions)

- TBD: Discord webhook 성공률
  - 질문: 월간 Discord webhook 성공/실패 비율은?
  - 오너: 운영팀

- TBD: 알림 효과성
  - 질문: 리마인더 수신 후 제출률 변화는?
  - 오너: 운영팀

- TBD: 알림 빈도 최적화
  - 질문: 현재 회차당 리마인더 발송 횟수는?
  - 오너: 운영팀

- TBD: 재시도 정책
  - 질문: Discord webhook 실패 시 재시도를 시도하는가?
  - 오너: 기술팀

---

**문서 버전**: 1.0.0
**생성일**: 2026-01-05
**마지막 업데이트**: 2026-01-05
**Git Commit**: f324133
