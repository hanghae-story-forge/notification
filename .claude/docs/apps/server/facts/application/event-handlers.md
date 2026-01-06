# Event Handlers

- **Scope**: apps/server
- **Layer**: application
- **Source of Truth**: apps/server/src/application/event-handlers/
- **Last Verified**: 2025-01-07
- **Repo Ref**: 82509c3

## SubmissionEventHandler

- **Location**: `apps/server/src/application/event-handlers/submission-event.handler.ts`
- **Purpose**: 제출 관련 도메인 이벤트 처리 (Discord 알림 등)
- **Handled Events**:
  - `SubmissionRecordedEvent` - 제출 기록 시 Discord 알림 전송
- **Methods**:
  - `handle(submissionRecordedEvent)` - Discord 웹훅으로 알림 전송
- **Dependencies**:
  - `DiscordWebhookClient` - Discord 알림 전송
- **Evidence**:
  ```typescript
  async handle(event: SubmissionRecordedEvent): Promise<void> {
    await this.discordClient.sendSubmissionNotification(
      webhookUrl,
      memberName,
      cycleName,
      blogUrl
    );
  }
  ```
