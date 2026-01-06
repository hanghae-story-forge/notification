# Discord Presentation Layer

- **Scope**: apps/server
- **Layer**: presentation
- **Source of Truth**: apps/server/src/presentation/discord/
- **Last Verified**: 2025-01-07
- **Repo Ref**: 82509c3

## Discord Bot

- **Location**: `apps/server/src/presentation/discord/bot.ts`
- **Purpose**: Discord Bot Slash Command 핸들러
- **Slash Commands**:
  - `/check-submission` - 현재 활성화된 주차의 제출 현황 확인
  - `/current-cycle` - 현재 진행 중인 주차 정보 확인

### /check-submission Command

- **Location**: `apps/server/src/presentation/discord/bot.ts` (L176-L223)
- **Purpose**: 제출 현황 조회
- **Business Logic**:
  1. 현재 진행 중인 사이클 조회 (`GetCycleStatusQuery.getCurrentCycle`)
  2. 제출 현황 조회 (`GetCycleStatusQuery.getCycleParticipantNames`)
  3. Discord 메시지 생성 (`createStatusMessage`)
  4. 응답 전송
- **Evidence**:
  ```typescript
  // L184-L198: 제출 현황 조회
  const currentCycle = await getCycleStatusQuery.getCurrentCycle('dongueldonguel');
  const participantNames = await getCycleStatusQuery.getCycleParticipantNames(
    currentCycle.id,
    'dongueldonguel'
  );
  const discordMessage = createStatusMessage(
    participantNames.cycleName,
    participantNames.submittedNames,
    participantNames.notSubmittedNames,
    participantNames.endDate
  );
  ```

### /current-cycle Command

- **Location**: `apps/server/src/presentation/discord/bot.ts` (L126-L173)
- **Purpose**: 현재 주차 정보 조회
- **Response Format**:
  ```
  📅 **현재 주차 정보**

  **기수**: 똥글똥글 1기
  **주차**: 1주차
  **마감일**: 2025-01-15 (D-3)

  이슈 링크: https://github.com/...
  ```
- **Evidence**:
  ```typescript
  // L158-L161: 응답 메시지 생성
  await interaction.editReply({
    content: `📅 **현재 주차 정보**\n\n**기수**: ${currentCycle.generationName}\n**주차**: ${currentCycle.week}주차\n**마감일**: ${new Date(currentCycle.endDate).toLocaleDateString('ko-KR')} (${
      daysUntilDeadline > 0 ? `D-${daysUntilDeadline}` : '오늘 마감'
    })\n\n이슈 링크: ${currentCycle.githubIssueUrl}`,
  });
  ```

### Slash Command Registration

- **Location**: `apps/server/src/presentation/discord/bot.ts` (L73-L123)
- **Purpose**: Discord Slash Commands 등록
- **Methods**:
  - `registerSlashCommands()` - 길드 또는 글로벌 명령어 등록
- **Environment Variables**:
  - `DISCORD_BOT_TOKEN` - Bot Token
  - `DISCORD_CLIENT_ID` - Application Client ID
  - `DISCORD_GUILD_ID` - Guild ID (선택, 있으면 길드 명령어로 등록)
