# External Services Infrastructure

---
metadata:
  version: "2.0.0"
  created_at: "2026-01-11T00:00:00Z"
  last_verified: "2026-01-11T00:00:00Z"
  git_commit: "cdbdf2d"
  scope: "apps/server/src/infrastructure/external"
  source_files:
    apps/server/src/infrastructure/external/discord/discord.webhook.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/infrastructure/external/discord/discord.messages.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/infrastructure/external/discord/discord.interface.ts:
      git_hash: "cdbdf2d"
      source_exists: true
    apps/server/src/infrastructure/lib/github.ts:
      git_hash: "cdbdf2d"
      source_exists: true
---

## Discord Webhook Service

### DiscordWebhookClient

- **Location**: `apps/server/src/infrastructure/external/discord/discord.webhook.ts` (L16-L63)
- **Purpose**: Discord 웹훅 클라이언트 구현
- **Implements**: `IDiscordWebhookClient`

#### Methods

- `sendMessage(webhookUrl: string, message: DiscordMessage): Promise<void>` - 기본 메시지 전송
- `sendSubmissionNotification(webhookUrl, memberName, cycleName, blogUrl): Promise<void>` - 제출 알림 전송
- `sendReminderNotification(webhookUrl, cycleName, endDate, notSubmittedNames): Promise<void>` - 리마인더 알림 전송
- `sendStatusNotification(webhookUrl, cycleName, submittedNames, notSubmittedNames, endDate): Promise<void>` - 상태 알림 전송

### Discord Message Factory

- **Location**: `apps/server/src/infrastructure/external/discord/discord.messages.ts`
- **Purpose**: Discord 메시지 포맷 생성

#### Functions

- `createSubmissionMessage(memberName, blogUrl, cycleName)` - 제출 알림 메시지 생성
- `createReminderMessage(cycleName, endDate, notSubmittedNames)` - 리마인더 메시지 생성 (마감까지 남은 시간 포함)
- `createStatusMessage(cycleName, submittedNames, notSubmittedNames, endDate)` - 상태 메시지 생성

### Discord Interface

- **Location**: `apps/server/src/infrastructure/external/discord/discord.interface.ts`
- **Purpose**: Discord 웹훅 인터페이스 정의

#### Types

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
  timestamp?: string;
}
```

#### Interface

```typescript
interface IDiscordWebhookClient {
  sendMessage(webhookUrl: string, message: DiscordMessage): Promise<void>;
  sendSubmissionNotification(...): Promise<void>;
  sendReminderNotification(...): Promise<void>;
  sendStatusNotification(...): Promise<void>;
}
```

## GitHub Integration

- **Location**: `apps/server/src/infrastructure/lib/github.ts`
- **Purpose**: GitHub API 유틸리티

### Utilities

- **GitHub Comment URL Parsing**: Issue 댓글에서 URL 추출
- **GitHub Issue URL Validation**: 유효한 GitHub Issue URL 형식 검사
- **Week Pattern Parsing**: Issue 제목에서 주차 번호 추출 (예: "[1주차]", "week 1")

## Evidence

```typescript
// DiscordWebhookClient implementation (L16-L63)
export class DiscordWebhookClient implements IDiscordWebhookClient {
  async sendSubmissionNotification(
    webhookUrl: string,
    memberName: string,
    cycleName: string,
    blogUrl: string
  ): Promise<void> {
    const message = createSubmissionMessage(memberName, blogUrl, cycleName);
    await this.sendMessage(webhookUrl, message);
  }
}
```
