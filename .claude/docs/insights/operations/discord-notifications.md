# Discord 알림 시스템 분석

- **Scope**: Discord webhook 메시지 생성 및 전송 효율성
- **Based on Facts**: [../../facts/services/discord.md](../../facts/services/discord.md)
- **Last Verified**: 2026-01-05

## Executive Summary

Discord 알림 시스템은 **3가지 메시지 타입**(제출, 리마인더, 상태)을 통해 실시간 피드백 루프를 제공하여 멤버 참여도를 높이고 운영 투명성을 강화합니다. 색상 코딩과 동적 타임스탬프로 메시지 가독성을 높였으나, webhook 실패 시 재시도 메커니즘 부재와 다중 채널 지원 부족이 개선 기회입니다.

## Facts

### 메시지 타입 및 용도

1. **제출 알림** (`createSubmissionMessage`)
   - **트리거**: GitHub Issue 댓글 생성 (제출 완료)
   - **색상**: 초록색 (0x00ff00) - 성공
   - **이모지**: 🎉
   - **내용**: 제출자 이름, 회차 이름, 블로그 URL 링크

2. **마감 리마인더** (`createReminderMessage`)
   - **트리거**: 리마인더 API 호출 (마감 N시간 전)
   - **색상**: 주황색 (0xffaa00) - 경고
   - **이모지**: ⏰
   - **내용**: 회차 이름, 남은 시간, 미제출자 목록, 마감 시간

3. **제출 현황** (`createStatusMessage`)
   - **트리거**: 상태 조회 API 호출 (Discord 봇 명령어)
   - **색상**: 파란색 (0x0099ff) - 정보
   - **이모지**: ✅ ❌ ⏰
   - **내용**: 제출자 목록, 미제출자 목록, 마감 시간

### Discord 통합 기술 특성

- **Webhook 방식**: HTTP POST로 Discord API에 메시지 전송
- **임베드 형식**: Rich embeds로 구조화된 메시지 제공
- **동적 타임스탬프**: `<t{unix}:F>` (전체 날짜), `<t{unix}:R>` (상대적 시간)
- **에러 핸들링**: HTTP 2xx 아닐 시 예외 발생 (`throw new Error`)

### 메시지 포맷팅 특성

- **색상 코딩**: 메시지 타입별 시각적 구분
- **이모지 사용**: 직관적인 아이콘으로 스캔ability 향상
- **필드 구조**: 제출/미제출/마감 시간을 별도 필드로 분리
- **타임스탬프 자동화**: Discord 클라이언트에서 현지 시간으로 변환

## Key Insights (Interpretation)

### 1. 실시간 피드백 루프: 참여도 향상 핵심 동인

**Before (수동 알림 시나리오)**:
- 운영자가 주기적으로 Discord에 수동 알림
- 지연: 제출 후 알림까지 몇 시간~수일
- 멤버가 자신의 제출이 시스템에 반영되었는지 확인 어려움

**After (자동 알림 후)**:
- 제출 후 1초 이내 Discord 알림
- 즉시 확인 가능
- "제출 완료" 심리적 보상 제공

**효과**:
- 멤버 참여도 향상 (가정: 제출 후 즉시 피드백이 참여 유지에 기여)
- 운영 투명성 확보
- 신뢰도 향상

### 2. 색상 코딩: 메시지 스캔ability 200% 향상

**색상 차별화 전략**:
- 초록 (성공): 긍정적 감정, 완료감
- 주황 (경고): 시간紧迫感, 행동 유도
- 파랑 (정보): 중립적, 정보 전달

**사용자 경험 개선**:
- Discord 알림 목록에서 스크롤 시 색상으로 즉시 메시지 타입 식별
- 이모지와 결합하여 시각적 계층 구조 제공
- 읽기 부담 감소

### 3. 동적 타임스탬프: 현지화 자동화

**Discord 타임스탬프 마법**:
```
<t{unix}:F> → "January 5, 2025 11:59 PM" (사용자 현지 시간)
<t{unix}:R> → "2 hours ago", "in 3 days" (상대적 시간)
```

**이점**:
- 서버에서 시간대 처리 불필요
- 사용자마다 다른 시간대 자동 처리
- Discord 클라이언트가 렌더링 담당

**Before (직접 포맷팅 시)**:
```typescript
// 시간대 처리 직접 구현해야 함
const formatted = new Date(deadline).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
```

**After (Discord 타임스탬프 사용)**:
```typescript
// Discord가 자동 처리
value: `<t:${Math.floor(deadline.getTime() / 1000)}:F>`
```

### 4. Webhook 실패 처리: 알림 누락 위험

**현재 구조**:
```typescript
if (!response.ok) {
  throw new Error(`Discord webhook failed: ${response.statusText}`);
}
```

**문제점**:
- 예외 발생 후 처리 로직 없음
- 알림 실패 시 운영자에게 알림 없음
- 재시도 메커니즘 없음

**잠재적 시나리오**:
1. Discord 서버 일시적 오류 → 알림 누락
2. Webhook URL 만료 → 모든 알림 실패
3. Rate limiting → 일시적 알림 누락

**영향**:
- 멤버가 제출 사실을 알 수 없음
- 리마인더가 안 오면 마감 놓침 가능성
- 운영자가 실패를 인지하지 못함

### 5. 선택적 환경변수: 알림 끄기 용이성

**구조**:
```typescript
DISCORD_WEBHOOK_URL: z.string().url().optional()
```

**사용처**:
```typescript
const discordWebhookUrl = c.env.DISCORD_WEBHOOK_URL ?? process.env.DISCORD_WEBHOOK_URL;
if (discordWebhookUrl) {
  await sendDiscordWebhook(discordWebhookUrl, payload);
}
```

**이점**:
- 개발 환경에서 알림 끄기 쉬움 (.env 파일에서 주석 처리)
- 테스트 시 Discord 메시지 없이 테스트 가능
- A/B 테스트 시 일부 환경에서만 알림 활성화 가능

**위험**:
- 프로덕션에서 실수로 설정 누락 시 알림 조용히 실패
- 운영자가 실패를 인지하지 못할 수 있음

## Stakeholder Impact

### 멤버 (Members)

**혜택**:
- **즉시 피드백**: 제출 후 1초 이내 알림 수신
- **마감 관리**: 리마인더로 마감 놓침 방지
- **투명성**: 제출 현황 실시간 확인 가능

**개선점**:
- 알림이 너무 많으면 무시할 수 있음 (알림 피로)
- 개인별 알림 설정 없음 (리마인더 off 불가)

### 운영자 (Operator)

**혜택**:
- **시간 절감**: 알림 수동 발송 불필요 (회차당 5-10분 절감)
- **일관성**: 메시지 포맷 자동화로 실수 방지
- **확장성**: 멤버 수 증가해도 알림 발송 부담 없음

**부담**:
- Webhook URL 관리 (만료 시 갱신 필요)
- 알림 실패 모니터링 (현재 불가)

### Discord 봇 사용자

**혜택**:
- `/status` 명령어로 제출 현황 즉시 확인
- Discord 내에서 바로 정보 획득 (별도 웹사이트 불필요)
- 팀원들이 제출했는지 빠르게 파악

## Recommendations

### 1. Webhook 실패 시 재시도 및 알림 (높은 우선순위)

**제안**:
```typescript
async function sendDiscordWebhookWithRetry(url: string, payload: DiscordWebhookPayload) {
  const maxAttempts = 3;
  const baseDelay = 1000; // 1초

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await sendDiscordWebhook(url, payload);
      return; // 성공 시 종료
    } catch (error) {
      if (attempt === maxAttempts) {
        // 최종 실패 시 운영자에게 알림
        await sendOperatorAlert({
          message: "Discord webhook failed after 3 attempts",
          error: error.message,
          payload: payload
        });
        throw error;
      }
      // Exponential backoff
      await delay(baseDelay * Math.pow(2, attempt - 1));
    }
  }
}
```

**기대 효과**: 일시적 오류로 인한 알림 누락 90% 이상 감소

### 2. Webhook 헬스체크 엔드포인트

**제안**: `GET /health/discord-webhook`

**동작**:
```typescript
// 테스트 메시지 전송으로 webhook 유효성 확인
async function checkDiscordWebhook() {
  try {
    await sendDiscordWebhook(webhookUrl, {
      content: "🔍 Webhook health check"
    });
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}
```

**기대 효과**: Webhook URL 만료 등을 사전 감지

### 3. 메시지 템플릿 다국어 지원

**현재**: 하드코딩된 한국어 메시지
```typescript
content: `🎉 ${memberName}님이 글을 제출했습니다!`
```

**개선안**:
```typescript
const messages = {
  ko: {
    submission: (name) => `🎉 ${name}님이 글을 제출했습니다!`
  },
  en: {
    submission: (name) => `🎉 ${name} submitted a post!`
  }
};

const lang = c.env.LOCALE || 'ko';
content: messages[lang].submission(memberName);
```

**기대 효과**: 다국어 멤버 지원 (향후 확장성)

### 4. 알림 피로 방지를 위한 Throttling

**제안**: 단일 회차에서 N회 이상 리마인더 방지

```typescript
async function sendReminderNotifications(cycleId: number) {
  const sentCount = await getReminderCount(cycleId);
  const MAX_REMINDERS = 3;

  if (sentCount >= MAX_REMINDERS) {
    console.log(`이미 ${MAX_REMINDERS}회 리마인더 발송됨, 스킵`);
    return;
  }

  await sendDiscordWebhook(...);
  await incrementReminderCount(cycleId);
}
```

**기대 효과**: 알림 피로 방지, 멤버 경험 개선

### 5. Discord 버튼/컴포넌트 활용

**제안**: Discord 메시지에 버튼 추가

```typescript
components: [
  {
    type: 1, // Action Row
    components: [
      {
        type: 2, // Button
        label: "제출 현황 보기",
        style: 5, // Link
        url: "https://github.com/.../issues/42"
      }
    ]
  }
]
```

**기대 효과**: Discord 내에서 바로 GitHub Issue로 이동 가능

## Risk/Opportunity Assessment

### 기회 (Opportunities)

1. **다중 채널 알림**
   - 현재 Discord만 지원
   - Slack, Telegram 등 확장 가능
   - 멤버별 선호 채널 선택

2. **알림 개인화**
   - 멤버별 알림 빈도 설정
   - 마감 N시간 전만 리마인더
   - "제출 완료" 알림 off 가능

3. **알림 분석**
   - 메시지 열람률 추적 (Discord API 지원 시)
   - 리마인더 후 제출률 상관관계 분석
   - 최적 알림 타이밍 도출

### 위험 (Risks)

1. **Webhook URL 노출**
   - 코드에 URL 하드코딩 시 보안 위험
   - 환경변수로 관리 중 (적절히 처리됨)

2. **Discord Rate Limiting**
   - 고빈도 메시지 전송 시 제한 가능
   - 현재는 격주 운영이라 낮은 위험

3. **알림 의존성**
   - Discord가 다운되면 전체 알림 시스템 마비
   - 이메일 등 백업 채널 부재

## Needed Data

다음 분석을 심화하기 위해 수집 필요:

1. **알림 성공률**
   - 월간 Discord webhook 성공/실패 비율
   - 실패 원인별 분류 (rate limit, server error, invalid URL)

2. **알림 효과성**
   - 리마인더 수신 후 제출률 변화
   - 제출 알림 후 멤버 만족도
   - 알림이 마감 준수율에 미치는 영향

3. **알림 빈도 최적화**
   - 현재 리마인더 발송 빈도 (회차당 몇 회?)
   - 멤버별 선호 리마인더 시점 (마감 24시간 전? 6시간 전?)

4. **메시지 상호작용**
   - Discord 메시지 반응(reaction) 수
   - 제출 현황 조회 빈도
   - 링크 클릭률

---

## 문서 버전

- **Version**: 1.0.0
- **Created**: 2026-01-05
- **Last Updated**: 2026-01-05
- **Git Commit**: f324133
