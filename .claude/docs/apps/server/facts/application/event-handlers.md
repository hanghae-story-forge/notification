# Event Handlers

---
metadata:
  version: "2.0.0"
  created_at: "2026-01-11T00:00:00Z"
  last_verified: "2026-01-11T00:00:00Z"
  git_commit: "cdbdf2d"
  scope: "apps/server/src/application/event-handlers"
  source_files:
    apps/server/src/application/event-handlers/submission-event.handler.ts:
      git_hash: "cdbdf2d"
      source_exists: true
---

## SubmissionEventHandler

- **Location**: `apps/server/src/application/event-handlers/submission-event.handler.ts` (L12-L32)
- **Purpose**: 제출 관련 도메인 이벤트를 수신하고 외부 알림 전송

### Methods

#### `handleSubmissionRecorded(event, webhookUrl, memberName, cycleName, blogUrl)`

- **Purpose**: 제출 기록 이벤트 처리
- **Location**: L18-L31
- **Input**:
  - `event: SubmissionRecordedEvent` - 도메인 이벤트
  - `webhookUrl: string` - Discord 웹훅 URL
  - `memberName: string` - 회원 이름
  - `cycleName: string` - 사이클 이름
  - `blogUrl: string` - 블로그 URL
- **Output**: `Promise<void>`
- **Business Logic**: Discord 웹훅으로 제출 알림 전송

### Dependencies

- `IDiscordWebhookClient` - Discord 웹훅 클라이언트

### Evidence

```typescript
async handleSubmissionRecorded(
  event: SubmissionRecordedEvent,
  webhookUrl: string,
  memberName: string,
  cycleName: string,
  blogUrl: string
): Promise<void> {
  await this.discordClient.sendSubmissionNotification(
    webhookUrl,
    memberName,
    cycleName,
    blogUrl
  );
}
```
