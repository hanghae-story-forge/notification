# Environment Configuration

- **Scope**: 환경변수 정의 및 검증
- **Source of Truth**: `src/env.ts`
- **Last Verified**: 2026-01-05
- **Repo Ref**: df3a0ab

---
metadata:
  version: "1.1.0"
  created_at: "2025-01-05T10:00:00Z"
  last_verified: "2026-01-05T12:00:00Z"
  git_commit: "df3a0ab"
  source_files:
    src/env.ts:
      git_hash: "df3a0ab"
      source_exists: true
---

## Overview

똥글똥글 API는 `@t3-oss/env-core`와 `zod`를 사용하여 타입 안전한 환경변수 관리를 수행합니다. 앱 시작 시 환경변수를 검증하고, 유효하지 않은 경우 에러를 발생시킵니다.

### Validation Strategy

- **Runtime Validation**: 앱 시작 시 Zod 스키마로 검증
- **Type Safety**: TypeScript 타입 자동 추론
- **Fail Fast**: 유효하지 않은 환경변수 시 즉시 에러

---

## Server Environment Variables

### DATABASE_URL

- **Location**: `src/env.ts` (L9)
- **Type**: `string` (URL format)
- **Required**: YES
- **Description**: PostgreSQL 연결 문자열
- **Default**: None (must be provided)
- **Validation**: Zod URL 검증 (`.url()`)

**Format**:
```
postgresql://[user]:[password]@[host]:[port]/[database]
```

**Example**:
```
DATABASE_URL=postgresql://dongueldonguel:password@localhost:5432/dongueldonguel
```

**Usage**:
```typescript
// src/lib/db.ts
const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, { schema });
```

**Evidence**:
```typescript
// src/env.ts:9
DATABASE_URL: z.string().url({ message: 'Invalid DATABASE_URL format' }),
```

---

### NODE_ENV

- **Location**: `src/env.ts` (L10-12)
- **Type**: `'development' | 'production' | 'test'`
- **Required**: NO
- **Default**: `'development'`
- **Description**: 앱 실행 환경 모드

**Values**:
- `development`: 개발 환경 (상세 로그, 핫 리로드)
- `production`: 프로덕션 환경 (최적화됨)
- `test`: 테스트 환경

**Example**:
```
NODE_ENV=production
```

**Evidence**:
```typescript
// src/env.ts:10-12
NODE_ENV: z
  .enum(['development', 'production', 'test'])
  .default('development'),
```

---

### DISCORD_WEBHOOK_URL

- **Location**: `src/env.ts` (L13)
- **Type**: `string` (URL format) | `undefined`
- **Required**: NO
- **Description**: Discord webhook URL (알림 전송용)

**Format**:
```
https://discord.com/api/webhooks/{guild_id}/{token}
```

**Example**:
```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1234567890/abc123def456
```

**Usage**:
```typescript
// src/routes/github/github.handlers.ts:112-113
const discordWebhookUrl = c.env.DISCORD_WEBHOOK_URL ?? process.env.DISCORD_WEBHOOK_URL;
if (discordWebhookUrl) {
  await sendDiscordWebhook(discordWebhookUrl, createSubmissionMessage(...));
}
```

**Optional Behavior**:
- 설정되지 않은 경우 Discord 알림을 건너뜀
- 런타임에 `undefined` 체크 후 전송

**Evidence**:
```typescript
// src/env.ts:13
DISCORD_WEBHOOK_URL: z.string().url({ message: 'Invalid DISCORD_WEBHOOK_URL format' }).optional(),
```

---

### DISCORD_BOT_TOKEN

- **Location**: `src/env.ts` (L15-18)
- **Type**: `string` | `undefined`
- **Required**: NO (Discord Bot 사용 시 필요)
- **Description**: Discord Bot 토큰 (슬래시 명령어용)

**Format**:
```
Bot [token] 또는 [token]
```

**Example**:
```
DISCORD_BOT_TOKEN=MTIzNDU2Nzg5MA.GhIjKl.MnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUv
```

**Usage**:
```typescript
// src/index.ts:110-117
if (env.DISCORD_BOT_TOKEN && env.DISCORD_CLIENT_ID) {
  await registerSlashCommands();
  const discordBot = createDiscordBot();
  await discordBot.login(env.DISCORD_BOT_TOKEN);
}
```

**Optional Behavior**:
- 설정되지 않은 경우 Discord Bot 시작하지 않음
- 콘솔에 경고 메시지 출력

**Evidence**:
```typescript
// src/env.ts:15-18
DISCORD_BOT_TOKEN: z
  .string()
  .min(1, { message: 'DISCORD_BOT_TOKEN is required' })
  .optional(),
```

---

### DISCORD_CLIENT_ID

- **Location**: `src/env.ts` (L19-22)
- **Type**: `string` | `undefined`
- **Required**: NO (Discord Bot 사용 시 필요)
- **Description**: Discord 애플리케이션 클라이언트 ID

**Format**:
```
18자리 숫자 (Snowflake ID)
```

**Example**:
```
DISCORD_CLIENT_ID=123456789012345678
```

**Usage**:
```typescript
// src/services/discord-bot.ts
const rest = new REST().setToken(env.DISCORD_BOT_TOKEN);
await rest.put(
  Routes.applicationCommands(env.DISCORD_CLIENT_ID),
  { body: commands }
);
```

**Purpose**:
- 슬래시 명령어 등록 (Global 또는 Guild)
- Discord API 요청 시 애플리케이션 식별

**Evidence**:
```typescript
// src/env.ts:19-22
DISCORD_CLIENT_ID: z
  .string()
  .min(1, { message: 'DISCORD_CLIENT_ID is required' })
  .optional(),
```

---

### DISCORD_GUILD_ID

- **Location**: `src/env.ts` (L23-26)
- **Type**: `string` | `undefined`
- **Required**: NO
- **Description**: Discord 길드 ID (즉시 슬래시 명령어 등록용)

**Format**:
```
18자리 숫자 (Snowflake ID)
```

**Example**:
```
DISCORD_GUILD_ID=987654321098765432
```

**Purpose**:
- 개발 환경에서 즉시 슬래시 명령어 등록
- 글로벌 등록은 최대 1시간 소요, 길드 등록은 즉시 반영
- 프로덕션에서는 생략 가능 (글로벌 등록 사용)

**Usage**:
```typescript
// src/services/discord-bot.ts
const commands = [
  {
    name: 'check-submission',
    description: '현재 활성화된 주차의 제출 현황을 확인합니다',
  },
];

// 길드 ID가 있으면 길드 명령어로 등록 (즉시 반영)
const endpoint = env.DISCORD_GUILD_ID
  ? Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID)
  : Routes.applicationCommands(env.DISCORD_CLIENT_ID);

await rest.put(endpoint, { body: commands });
```

**Development vs Production**:
- **Development**: `DISCORD_GUILD_ID` 설정 → 즉시 명령어 등록
- **Production**: 생략 → 글로벌 명령어 등록 (최대 1시간 소요)

**Evidence**:
```typescript
// src/env.ts:23-26
DISCORD_GUILD_ID: z
  .string()
  .min(1, { message: 'DISCORD_GUILD_ID is required' })
  .optional(),
```

---

## Validation Behavior

### On Validation Success

환경변수가 유효하면 `env` 객체를 내보냅니다:

```typescript
import { env } from './env';

// 타입 안전한 접근
const dbUrl = env.DATABASE_URL;        // string
const nodeEnv = env.NODE_ENV;          // 'development' | 'production' | 'test'
const webhookUrl = env.DISCORD_WEBHOOK_URL;  // string | undefined
```

### On Validation Failure

- **Callback**: `onValidationError` 함수 실행
- **Action**: 콘솔에 에러 로그 출력 후 예외 발생
- **Message**: "❌ Invalid environment variables:" + Zod 에러 상세

**Evidence**:
```typescript
// src/env.ts:47-51
onValidationError: (error) => {
  console.error('❌ Invalid environment variables:');
  console.error(error);
  throw new Error('Invalid environment variables');
},
```

---

## Skip Validation

### SKIP_ENV_VALIDATION

- **Location**: `src/env.ts` (L42)
- **Type**: boolean (환경변수 존재 여부로 판단)
- **Purpose**: CI/CD 또는 Docker 빌드 시 검증 스킵
- **Default**: `false`

**Usage**:
```bash
# 검증 스킵
SKIP_ENV_VALIDATION=1 pnpm build
```

**When to Use**:
- Docker 이미지 빌드 시 (런타임에 환경변수 주입)
- CI에서 타입 체크만 수행할 때

**Evidence**:
```typescript
// src/env.ts:42
skipValidation: !!process.env.SKIP_ENV_VALIDATION,
```

---

## Runtime Environment Mapping

환경변수는 `process.env`에서 읽습니다:

**Evidence**:
```typescript
// src/env.ts:32-38
runtimeEnvStrict: {
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID,
},
```

---

## Environment Variable Access

### Method 1: Import from env module (Recommended)

```typescript
import { env } from '@/env';

const dbUrl = env.DATABASE_URL;
```

### Method 2: Direct process.env (Legacy)

```typescript
const dbUrl = process.env.DATABASE_URL;
```

**Note**: Method 1이 타입 안전성을 보장하므로 권장됩니다.

---

## .env File

### Development (.env)

```env
# Database
DATABASE_URL=postgresql://localhost:5432/dongueldonguel

# Environment
NODE_ENV=development

# Discord Webhook (Notifications)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Discord Bot (Slash Commands)
DISCORD_BOT_TOKEN=MTIzNDU2Nzg5MA.GhIjKl.MnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUv
DISCORD_CLIENT_ID=123456789012345678
DISCORD_GUILD_ID=987654321098765432  # Optional: For instant command registration

# Server
PORT=3000
```

### Production (.env.production)

```env
DATABASE_URL=postgresql://prod-db-server:5432/dongueldonguel
NODE_ENV=production
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_BOT_TOKEN=MTIzNDU2Nzg5MA.GhIjKl.MnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUv
DISCORD_CLIENT_ID=123456789012345678
# DISCORD_GUILD_ID omitted in production (uses global commands)
PORT=3000
```

---

## Database Configuration

### DB Instance Creation

- **Location**: `src/lib/db.ts` (L1-7)
- **ORM**: Drizzle ORM
- **Client**: postgres.js (NOT node-postgres)

**Evidence**:
```typescript
// src/lib/db.ts:1-7
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema';
import { env } from '../env';

const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, { schema });
```

---

## Server Port Configuration

### PORT

- **Location**: `src/index.ts` (L62)
- **Type**: `number` (parsed from string)
- **Default**: `3000`
- **Description**: HTTP 서버 포트

**Usage**:
```typescript
const port = parseInt(process.env.PORT || '3000');
```

**Evidence**:
```typescript
// src/index.ts:62
const port = parseInt(process.env.PORT || '3000');
```

---

## GraphQL Configuration

GraphQL endpoint는 별도의 환경변수 없이 설정됩니다:

- **Endpoint**: `/graphql`
- **Introspection**: `true` (개발용)
- **Location**: `src/index.ts` (L29-34)

**Evidence**:
```typescript
// src/index.ts:29-34
const apollo = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true, // 개발용 스키마 탐색 허용
});
```

---

## Security Notes

1. **Never commit `.env` files**: `.gitignore`에 포함
2. **Use `.env.example`**: 필요한 환경변수 템플릿 제공
3. **Secrets Management**: 프로덕션에서는 AWS Secrets Manager, HashiCorp Vault 등 사용
4. **Webhook URL**: Discord webhook URL은 비밀로 유지 (서버에서만 사용)

---

## Troubleshooting

### Error: "Invalid DATABASE_URL format"

**Cause**: URL 형식이 올바르지 않음
**Solution**: `postgresql://` 프로토콜로 시작하는지 확인

### Error: "Invalid environment variables"

**Cause**: 필수 환경변수 누락 또는 형식 오류
**Solution**: 콘솔 로그 확인 후 해당 변수 수정

### Discord notifications not working

**Cause**: `DISCORD_WEBHOOK_URL` 설정 누락
**Solution**: `.env` 파일에 webhook URL 추가

---

## Type Export

환경변수 타입을 내보내지 않습니다. `env` 객체를 직접 import 하여 사용하세요.
