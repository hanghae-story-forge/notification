# External Services

- **Scope**: apps/server
- **Layer**: infrastructure
- **Source of Truth**: apps/server/src/infrastructure/external/
- **Last Verified**: 2025-01-07
- **Repo Ref**: 82509c3

## Discord Webhook Client

- **Location**: `apps/server/src/infrastructure/external/discord/discord.webhook.ts`
- **Purpose**: Discord Webhook API 클라이언트
- **Methods**:
  - `sendSubmissionNotification(webhookUrl, memberName, cycleName, blogUrl)` - 제출 알림 전송
  - `sendReminderNotification(webhookUrl, cycleName, hoursRemaining, notSubmittedNames)` - 마감 알림 전송
  - `sendStatusNotification(webhookUrl, cycleName, submittedNames, notSubmittedNames, endDate)` - 현황 알림 전송

## Discord Messages

- **Location**: `apps/server/src/infrastructure/external/discord/discord.messages.ts`
- **Purpose**: Discord 메시지 포맷팅 유틸리티
- **Functions**:
  - `createSubmissionMessage(memberName, cycleName, blogUrl)` - 제출 알림 메시지 생성
  - `createReminderMessage(cycleName, hoursRemaining, notSubmittedNames)` - 마감 알림 메시지 생성
  - `createStatusMessage(cycleName, submittedNames, notSubmittedNames, endDate)` - 현황 메시지 생성

## GitHub Client

- **Location**: `apps/server/src/infrastructure/lib/github.ts`
- **Purpose**: GitHub API 클라이언트 (향후 확장용)
- **Note**: 현재는 Webhook만 사용 중
