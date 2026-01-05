# Presentation Layer - Discord Bot

---
metadata:
  layer: Presentation
  component: Discord Bot
  library: discord.js
  last_verified: "2026-01-05T10:00:00Z"
  git_commit: "ac29965"
---

## 개요

Discord Bot은 discord.js를 사용하여 Discord 서버 내에서 슬래시 명령어(/command)를 제공합니다. 현재 진행 중인 사이클 정보와 제출 현황을 조회할 수 있습니다.

## Bot 초기화

- **Location**: `src/presentation/discord/bot.ts` (L36-L60)
- **Purpose**: Discord Bot 클라이언트 생성

```typescript
export const createDiscordBot = (): Client => {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  client.once('ready', () => {
    console.log(`✅ Discord Bot logged in as ${client.user?.tag}`);
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'check-submission') {
      await handleCheckSubmission(interaction);
    } else if (commandName === 'current-cycle') {
      await handleCurrentCycle(interaction);
    }
  });

  return client;
};
```

## 슬래시 명령어

### 등록

- **Location**: `src/presentation/discord/bot.ts` (L63-L113)
- **Purpose**: Discord 서버에 슬래시 명령어 등록

```typescript
export const registerSlashCommands = async (): Promise<void> => {
  const commands = [
    new SlashCommandBuilder()
      .setName('check-submission')
      .setDescription('현재 활성화된 주차의 제출 현황을 확인합니다'),
    new SlashCommandBuilder()
      .setName('current-cycle')
      .setDescription('현재 진행 중인 주차 정보를 확인합니다'),
  ].map((command) => command.toJSON());

  // 길드 명령어 (즉시 반영) 또는 글로벌 명령어 (최대 1시간 소요)
  // ...
};
```

**환경변수**:
- `DISCORD_BOT_TOKEN` - Bot 토큰 (필수)
- `DISCORD_CLIENT_ID` - Client ID (필수)
- `DISCORD_GUILD_ID` - Guild ID (선택, 개발용 즉시 반영)

### 명령어 목록

| 명령어 | 설명 | Handler |
|--------|------|---------|
| `/check-submission` | 현재 활성화된 주차의 제출 현황을 확인합니다 | `handleCheckSubmission()` |
| `/current-cycle` | 현재 진행 중인 주차 정보를 확인합니다 | `handleCurrentCycle()` |

## Handlers

### /current-cycle

- **Location**: `src/presentation/discord/bot.ts` (L116-L144)
- **Purpose**: 현재 진행 중인 사이클 정보 조회

**실행 흐름**:
1. `GetCycleStatusQuery.getCurrentCycle()` 호출
2. 사이클 정보 포맷팅
3. Discord 응답 전송

**Response 예시**:
```
📅 **현재 주차 정보**

**기수**: 똥글똥글 1기
**주차**: 1주차
**마감일**: 2026年1月8日 (D-3)

이슈 링크: https://github.com/org/repo/issues/1
```

**에러 처리**:
- 현재 진행 중인 사이클 없음: "❌ 현재 진행 중인 주차가 없습니다."
- 서버 에러: "❌ 주차 정보 조회 중 오류가 발생했습니다."

### /check-submission

- **Location**: `src/presentation/discord/bot.ts` (L147-L192)
- **Purpose**: 현재 사이클 제출 현황 조회

**실행 흐름**:
1. `GetCycleStatusQuery.getCurrentCycle()` 호출
2. `GetCycleStatusQuery.getCycleParticipantNames()` 호출
3. `createStatusMessage()`로 Discord embed 생성
4. Discord 응답 전송

**Response 예시**:
```
Embed:
  Title: "똥글똥글 1기 - 1주차 제출 현황"
  Color: 파란색 (0x0099ff)
  Fields:
    - "✅ 제출 (2)": Alice, Bob
    - "❌ 미제출 (1)": Charlie
    - "⏰ 마감 시간": 3일 전
```

**에러 처리**:
- 현재 진행 중인 사이클 없음: "❌ 현재 진행 중인 주차가 없습니다."
- 조회 실패: "❌ 제출 현황 조회 중 오류가 발생했습니다."

## 서버 시작

- **Location**: `src/index.ts` (L108-L124)
- **Purpose**: Discord Bot 자동 시작

```typescript
const { env } = await import('./env');

if (env.DISCORD_BOT_TOKEN && env.DISCORD_CLIENT_ID) {
  try {
    // 슬래시 명령어 등록
    await registerSlashCommands();

    // Discord Bot 로그인
    const discordBot = createDiscordBot();
    await discordBot.login(env.DISCORD_BOT_TOKEN);
  } catch (error) {
    console.error('❌ Failed to start Discord Bot:', error);
  }
} else {
  console.log(
    '⚠️  Discord Bot not configured. Set DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID to enable.'
  );
}
```

## 환경변수

```env
DISCORD_BOT_TOKEN=MTEz...  # Bot 토큰 (필수)
DISCORD_CLIENT_ID=113...   # Client ID (필수)
DISCORD_GUILD_ID=123...    # Guild ID (선택, 개발용)
```

**환경변수 설정 방법**:
1. [Discord Developer Portal](https://discord.com/developers/applications)에서 앱 생성
2. Bot 토큰 생성: `Bot` → `Reset Token`
3. Client ID 복사: `General Information` → `Application ID`
4. Guild ID 복사: Discord 서버 설정 → `Widget` → `Server ID`
5. OAuth2 URL 생성하여 Bot 초대: `URL Generator` → `bot` → `applications.commands` 스코프

## 의존성

```typescript
import { GetCycleStatusQuery } from '@/application/queries';
import { DrizzleCycleRepository } from '@/infrastructure/persistence/drizzle/cycle.repository.impl';
import { DrizzleGenerationRepository } from '@/infrastructure/persistence/drizzle/generation.repository.impl';
import { DrizzleSubmissionRepository } from '@/infrastructure/persistence/drizzle/submission.repository.impl';
import { DrizzleMemberRepository } from '@/infrastructure/persistence/drizzle/member.repository.impl';
import { createStatusMessage } from '@/infrastructure/external/discord';
```

## 사용 예시

### Discord 서버에서

```
User: /current-cycle
Bot: 📅 **현재 주차 정보**
     **기수**: 똥글똥글 1기
     **주차**: 1주차
     **마감일**: 2026年1月8日 (D-3)
     이슈 링크: https://github.com/org/repo/issues/1

User: /check-submission
Bot: [Embed]
     Title: "똥글똥글 1기 - 1주차 제출 현황"
     Fields:
       ✅ 제출 (2): Alice, Bob
       ❌ 미제출 (1): Charlie
       ⏰ 마감 시간: 3일 전
```

## 향후 확장

1. **추가 명령어**:
   - `/submit {url}` - 댓글 없이 제출 (권한 확인 필요)
   - `/generation` - 현재 기수 정보
   - `/help` - 도움말

2. **상호작용 개선**:
   - 버튼으로 제출 현홱 갱신
   - Select menu로 특정 주차 선택

3. **권한 관리**:
   - 관리자 전용 명령어
   - 역할별 권한 설정

4. **DM 지원**:
   - DM으로 개인 제출 현황 조회
