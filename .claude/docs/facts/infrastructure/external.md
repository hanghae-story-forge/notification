# Infrastructure Layer - External (외부 연동)

---
metadata:
  layer: Infrastructure
  component: External
  last_verified: "2026-01-05T10:00:00Z"
  git_commit: "ac29965"
---

## 개요

External 계층은 외부 시스템과의 연동을 담당합니다. Discord 웹훅, GitHub 웹훅 등 외부 API와의 통신을 추상화합니다.

## Discord Integration

### Discord Webhook

- **Location**: `src/infrastructure/external/discord/discord.webhook.ts` (L16-L63)
- **Purpose**: Discord 웹훅 클라이언트 구현

#### IDiscordWebhookClient Interface

- **Location**: `src/infrastructure/external/discord/discord.interface.ts` (L5-L20)
- **Purpose**: Discord 웹훅 클라이언트 인터페이스

```typescript
interface IDiscordWebhookClient {
  sendMessage(webhookUrl: string, message: DiscordMessage): Promise<void>;
  sendSubmissionNotification(
    webhookUrl: string,
    memberName: string,
    cycleName: string,
    blogUrl: string
  ): Promise<void>;
  sendReminderNotification(
    webhookUrl: string,
    cycleName: string,
    endDate: Date,
    notSubmittedNames: string[]
  ): Promise<void>;
  sendStatusNotification(
    webhookUrl: string,
    cycleName: string,
    submittedNames: string[],
    notSubmittedNames: string[],
    endDate: Date
  ): Promise<void>;
}
```

#### DiscordWebhookClient

- **Location**: `src/infrastructure/external/discord/discord.webhook.ts` (L16-L63)
- **Purpose**: IDiscordWebhookClient 인터페이스 구현

##### Methods

| Method | Purpose |
|--------|---------|
| `sendMessage(webhookUrl, message)` | Discord 웹훅 전송 |
| `sendSubmissionNotification(...)` | 제출 알림 전송 |
| `sendReminderNotification(...)` | 리마인더 알림 전송 |
| `sendStatusNotification(...)` | 현황 알림 전송 |

### Discord Message Builders

- **Location**: `src/infrastructure/external/discord/discord.messages.ts` (L1-L115)
- **Purpose**: Discord 메시지 포맷 생성

#### createSubmissionMessage()

제출 알림 메시지 생성 (L8-L24)

```typescript
function createSubmissionMessage(
  memberName: string,
  blogUrl: string,
  cycleName: string
): DiscordMessage
```

**포맷**:
- Content: "🎉 {memberName}님이 글을 제출했습니다!"
- Embed: 초록색 (0x00ff00)
- Description: "[글 보러가기](blogUrl)"

#### createReminderMessage()

리마인더 알림 메시지 생성 (L29-L60)

```typescript
function createReminderMessage(
  cycleName: string,
  deadline: Date,
  notSubmitted: string[]
): DiscordMessage
```

**포맷**:
- Content: "⏰ {cycleName} 마감까지 {time} 남았습니다!"
- Embed: 주황색 (0xffaa00)
- Description: 미제출자 목록
- Field: 마감 시간 (Discord timestamp)

#### createStatusMessage()

제출 현황 메시지 생성 (L65-L97)

```typescript
function createStatusMessage(
  cycleName: string,
  submitted: string[],
  notSubmitted: string[],
  deadline: Date
): DiscordMessage
```

**포맷**:
- Embed: 파란색 (0x0099ff)
- Field 1: "✅ 제출 ({count})" - 제출자 목록
- Field 2: "❌ 미제출 ({count})" - 미제출자 목록
- Field 3: "⏰ 마감 시간" - Discord timestamp (relative)

#### sendDiscordWebhook()

Discord 웹훅 전송 내부 구현 (L102-L115)

```typescript
async function sendDiscordWebhook(
  webhookUrl: string,
  payload: DiscordMessage
): Promise<void>
```

**구현**:
- fetch API로 POST 요청
- Content-Type: application/json
- 실패 시 Error throw

### Discord Interface

#### DiscordMessage

- **Location**: `src/infrastructure/external/discord/discord.interface.ts` (L22-L33)
- **Purpose**: Discord 웹훅 메시지 타입

```typescript
interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
}

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  footer?: { text: string };
  timestamp?: string;
}

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}
```

## GitHub Integration

### GitHub Webhook

- **Location**: `src/presentation/http/github/github.handlers.ts`
- **Purpose**: GitHub 웹훅 이벤트 처리

#### 지원 이벤트

| 이벤트 | 목적 | Handler |
|--------|------|---------|
| `issue_comment` (created) | 제출 기록 | `handleIssueComment()` |
| `issues` (opened) | 사이클 생성 | `handleIssues()` |

#### parseWeekFromTitle()

이슈 제목에서 주차 번호 추출 (L51-L68)

```typescript
function parseWeekFromTitle(title: string): number | null
```

**지원 패턴**:
- `[1주차]`
- `1주차`
- `[week 1]`
- `week 1`
- `[1] 주`

#### parseDatesFromBody()

이슈 본문에서 날짜 추출 (L71-L94)

```typescript
function parseDatesFromBody(body: string | null): { start: Date; end: Date } | null
```

**지원 패턴**:
- `마감: 2025-01-15`
- `DEADLINE: 2025-01-15T23:59:59`

**기본값**:
- 종료일: 현재 + 7일
- 시작일: 종료일 - 7일

## Library Utilities

### Error Handler

- **Location**: `src/infrastructure/lib/error.ts`
- **Purpose**: OpenAPI 에러 스키마 정의

#### Error Schemas

```typescript
const InternalServerErrorSchema = z.object({
  message: z.string(),
});

const NotFoundErrorSchema = z.object({
  message: z.string(),
});

const ValidationErrorSchema = z.object({
  message: z.string(),
  field: z.string().optional(),
  value: z.any().optional(),
});
```

### Router

- **Location**: `src/infrastructure/lib/router.ts`
- **Purpose**: Hono 라우터 생성 헬퍼

```typescript
export const createRouter = () => {
  return new Hono<{
    Bindings: Env;
  }>();
};

export type AppContext = Context; // Hono Context 타입
```

### GitHub Library

- **Location**: `src/infrastructure/lib/github.ts`
- **Purpose**: GitHub 관련 유틸리티 (향후 확장용)

## 사용 예시

### Discord 웹훅 전송

```typescript
import { DiscordWebhookClient } from '@/infrastructure/external/discord';

const discordClient = new DiscordWebhookClient();

// 제출 알림
await discordClient.sendSubmissionNotification(
  webhookUrl,
  'John Doe',
  '똥글똥글 1기 - 1주차',
  'https://blog.example.com/post'
);

// 리마인더 알림
await discordClient.sendReminderNotification(
  webhookUrl,
  '똥글똥글 1기 - 1주차',
  new Date('2026-01-08'),
  ['Alice', 'Bob']
);

// 현황 알림
await discordClient.sendStatusNotification(
  webhookUrl,
  '똥글똥글 1기 - 1주차',
  ['Alice', 'Bob'],
  ['Charlie'],
  new Date('2026-01-08')
);
```

### GitHub Webhook 처리

```typescript
// Issue 댓글 → 제출 기록
const payload = await c.req.json();
const commentBody = payload.comment.body;
const urlMatch = commentBody.match(/(https?:\/\/[^\s]+)/);

if (urlMatch) {
  const blogUrl = urlMatch[1];
  await recordSubmissionCommand.execute({
    githubUsername: payload.comment.user.login,
    blogUrl,
    githubCommentId: String(payload.comment.id),
    githubIssueUrl: payload.issue.html_url
  });
}
```

## 환경변수

### Discord

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_BOT_TOKEN=...
DISCORD_CLIENT_ID=...
DISCORD_GUILD_ID=... (optional, for guild commands)
```

### GitHub

```env
GITHUB_APP_WEBHOOK_SECRET=... (optional)
```

## 향후 확장

1. **GitHub App**: PR, Issue 생성 기능 추가
2. **Email**: 이메일 알림 기능 추가
3. **Slack**: Slack 웹훅 지원
4. **Message Queue**: 비동기 메시지 전송 (RabbitMQ, Redis)
