# Discord Service

- **Scope**: Discord webhook 메시지 생성 및 전송
- **Source of Truth**: `src/services/discord.ts`
- **Last Verified**: 2025-01-05
- **Repo Ref**: f32413325de67a3ad1bde6649d16474d236d164b

---
metadata:
  version: "1.0.0"
  created_at: "2025-01-05T10:00:00Z"
  last_verified: "2025-01-05T10:00:00Z"
  git_commit: "f32413325de67a3ad1bde6649d16474d236d164b"
  source_files:
    src/services/discord.ts:
      git_hash: "cd4b43fd78f95e4fe13164ea2a8fa72d7b373f79"
      source_exists: true
---

## Overview

Discord 서비스는 똥글똥글 시스템의 모든 Discord 알림을 처리합니다. 메시지 생성 (포맷팅)과 전송 두 가지 책임을 가집니다.

**Supported Message Types**:
1. 제출 알림 (Submission Notification)
2. 마감 리마인더 (Deadline Reminder)
3. 제출 현황 (Status Report)

---

## Type Definitions

### DiscordWebhookPayload

- **Location**: `src/services/discord.ts` (L1-10)
- **Purpose**: Discord webhook API 요청 본문 형식

```typescript
interface DiscordWebhookPayload {
  content?: string;                    // 일반 텍스트 메시지
  embeds?: Array<{
    title?: string;                    // 임베드 제목
    description?: string;              // 임베드 설명
    color?: number;                    // 임베드 색상 (헥사 decimal)
    fields?: Array<{                   // 임베드 필드 목록
      name: string;                    // 필드 이름
      value: string;                   // 필드 값
      inline?: boolean;                // 인라인 표시 여부
    }>;
    timestamp?: string;                // ISO 8601 타임스탬프
  }>;
}
```

### Evidence

```typescript
// src/services/discord.ts:1-10
interface DiscordWebhookPayload {
  content?: string;
  embeds?: Array<{
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    timestamp?: string;
  }>;
}
```

---

## createSubmissionMessage()

- **Location**: `src/services/discord.ts` (L13-29)
- **Purpose**: 새 제출 알림 메시지 생성
- **Called By**: GitHub webhook 핸들러 (`handleIssueComment`)

### Parameters

```typescript
function createSubmissionMessage(
  memberName: string,    // 제출자 이름
  blogUrl: string,       // 블로그 글 URL
  cycleName: string      // 회차 이름 (예: "2주차")
): DiscordWebhookPayload
```

### Return Value

```typescript
{
  content: "🎉 {memberName}님이 글을 제출했습니다!",
  embeds: [
    {
      title: "{cycleName} 제출 완료",
      description: "[글 보러가기]({blogUrl})",
      color: 0x00ff00,        // 초록색 (성공)
      timestamp: string        // ISO 8601
    }
  ]
}
```

### Message Style

- **이모지**: 🎉 (축하)
- **색상**: 초록색 (0x00ff00) - 성공/완료
- **링크**: description에 Markdown 링크 형식

### Evidence

```typescript
// src/services/discord.ts:13-29
export function createSubmissionMessage(
  memberName: string,
  blogUrl: string,
  cycleName: string
): DiscordWebhookPayload {
  return {
    content: `🎉 ${memberName}님이 글을 제출했습니다!`,
    embeds: [
      {
        title: `${cycleName} 제출 완료`,
        description: `[글 보러가기](${blogUrl})`,
        color: 0x00ff00,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
```

---

## createReminderMessage()

- **Location**: `src/services/discord.ts` (L32-56)
- **Purpose**: 마감 리마인더 알림 메시지 생성
- **Called By**: 리마인더 핸들러 (`sendReminderNotifications`)

### Parameters

```typescript
function createReminderMessage(
  cycleName: string,      // 회차 이름 (예: "똥글똥글 1기 - 2주차")
  deadline: Date,         // 마감일시
  notSubmitted: string[]  // 미제출자 이름 목록
): DiscordWebhookPayload
```

### Return Value

```typescript
{
  content: "⏰ {cycleName} 마감까지 {timeLeft} 남았습니다!",
  embeds: [
    {
      title: "미제출자 목록",
      description: "name1, name2, name3",
      color: 0xffaa00,        // 주황색 (경고)
      fields: [
        {
          name: "마감 시간",
          value: "<t{unix_timestamp}:F>",  // Discord 전체 날짜 포맷
          inline: false
        }
      ],
      timestamp: string        // ISO 8601
    }
  ]
}
```

### Time Formatting

남은 시간을 자연어로 변환:
- **>= 24시간**: "{N}일 {M}시간" (예: "2일 3시간")
- **< 24시간**: "{N}시간" (예: "12시간")

### Discord Timestamp

메시지에 Discord 동적 타임스탬프 사용:
- **Format**: `<t{unix}:F>` (Full date: "January 5, 2025 11:59 PM")
- **Example**: `<t1736132799:F>`

### Message Style

- **이모지**: ⏰ (시간 경고)
- **색상**: 주황색 (0xffaa00) - 경고/주의
- **필드**: 마감 시간 (전체 날짜 포맷)

### Evidence

```typescript
// src/services/discord.ts:32-56
export function createReminderMessage(
  cycleName: string,
  deadline: Date,
  notSubmitted: string[]
): DiscordWebhookPayload {
  const hoursLeft = Math.floor((deadline.getTime() - Date.now()) / (1000 * 60 * 60));
  const timeText = hoursLeft >= 24
    ? `${Math.floor(hoursLeft / 24)}일 ${hoursLeft % 24}시간`
    : `${hoursLeft}시간`;

  return {
    content: `⏰ ${cycleName} 마감까지 ${timeText} 남았습니다!`,
    embeds: [
      {
        title: '미제출자 목록',
        description: notSubmitted.join(', '),
        color: 0xffaa00,
        fields: [
          { name: '마감 시간', value: `<t:${Math.floor(deadline.getTime() / 1000)}:F>`, inline: false },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
```

---

## createStatusMessage()

- **Location**: `src/services/discord.ts` (L59-91)
- **Purpose**: 제출 현황 리포트 메시지 생성
- **Called By**: 상태 핸들러 (`getStatusDiscord`)

### Parameters

```typescript
function createStatusMessage(
  cycleName: string,      // 회차 이름 (예: "똥글똥글 1기 - 2주차")
  submitted: string[],     // 제출자 이름 목록
  notSubmitted: string[],  // 미제출자 이름 목록
  deadline: Date           // 마감일시
): DiscordWebhookPayload
```

### Return Value

```typescript
{
  embeds: [
    {
      title: "{cycleName} 제출 현황",
      color: 0x0099ff,        // 파란색 (정보)
      fields: [
        {
          name: "✅ 제출 ({count})",
          value: "name1, name2, ...",
          inline: false
        },
        {
          name: "❌ 미제출 ({count})",
          value: "name1, name2, ...",
          inline: false
        },
        {
          name: "⏰ 마감 시간",
          value: "<t{unix}:R>",  // Discord 상대적 시간 포맷
          inline: false
        }
      ],
      timestamp: string        // ISO 8601
    }
  ]
}
```

### Discord Timestamp

메시지에 Discord 상대적 타임스탬프 사용:
- **Format**: `<t{unix}:R>` (Relative: "2 hours ago", "in 3 days")
- **Example**: `<t1736132799:R>`

### Message Style

- **색상**: 파란색 (0x0099ff) - 정보성
- **이모지**: ✅ (제출), ❌ (미제출), ⏰ (마감)
- **필드**: 3개 필드, 모두 인라인 아님 (전체 너비)
- **값 처리**: 빈 배열이면 "없음" 표시

### Evidence

```typescript
// src/services/discord.ts:59-91
export function createStatusMessage(
  cycleName: string,
  submitted: string[],
  notSubmitted: string[],
  deadline: Date
): DiscordWebhookPayload {
  return {
    embeds: [
      {
        title: `${cycleName} 제출 현황`,
        color: 0x0099ff,
        fields: [
          {
            name: `✅ 제출 (${submitted.length})`,
            value: submitted.length > 0 ? submitted.join(', ') : '없음',
            inline: false,
          },
          {
            name: `❌ 미제출 (${notSubmitted.length})`,
            value: notSubmitted.length > 0 ? notSubmitted.join(', ') : '없음',
            inline: false,
          },
          {
            name: '⏰ 마감 시간',
            value: `<t:${Math.floor(deadline.getTime() / 1000)}:R>`,
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
```

---

## sendDiscordWebhook()

- **Location**: `src/services/discord.ts` (L94-107)
- **Purpose**: Discord webhook URL로 메시지 전송
- **Called By**: 모든 메시지 생성 함수 후에 호출

### Parameters

```typescript
async function sendDiscordWebhook(
  webhookUrl: string,               // Discord webhook URL
  payload: DiscordWebhookPayload    // 전송할 메시지
): Promise<void>
```

### Behavior

1. **HTTP POST**: `fetch` API로 webhook URL에 POST 요청
2. **Headers**: `Content-Type: application/json`
3. **Body**: JSON 직렬화된 페이로드
4. **Error Handling**: 응답이 2xx가 아니면 예외 발생

### Error

```typescript
Error("Discord webhook failed: {statusText}")
```

### Evidence

```typescript
// src/services/discord.ts:94-107
export async function sendDiscordWebhook(
  webhookUrl: string,
  payload: DiscordWebhookPayload
): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook failed: ${response.statusText}`);
  }
}
```

---

## Color Reference

| Message Type | Color | Hex | Usage |
|--------------|-------|-----|-------|
| Submission | Green | `0x00ff00` | 성공, 완료 |
| Reminder | Orange | `0xffaa00` | 경고, 주의 |
| Status | Blue | `0x0099ff` | 정보성 |

---

## Discord Timestamp Formats

| Format | Code | Example Output |
|--------|------|----------------|
| Full Date | `<t{unix}:F>` | "January 5, 2025 11:59 PM" |
| Relative | `<t{unix}:R>` | "2 hours ago", "in 3 days" |

**Unix Timestamp**: seconds since epoch (JavaScript `Date.getTime() / 1000`)

---

## Usage Examples

### GitHub Webhook (Submission)

```typescript
// src/routes/github/github.handlers.ts:114-118
await sendDiscordWebhook(
  discordWebhookUrl,
  createSubmissionMessage(member.name, blogUrl, cycleName)
);
```

### Reminder Workflow

```typescript
// src/routes/reminder/reminder.handlers.ts:128-131
await sendDiscordWebhook(
  discordWebhookUrl,
  createReminderMessage(cycleName, cycle.endDate, notSubmitted)
);
```

### Status Query

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
