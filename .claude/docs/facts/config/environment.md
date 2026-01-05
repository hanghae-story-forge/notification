# Environment Configuration

- **Scope**: 환경변수 정의 및 검증
- **Source of Truth**: `src/env.ts`
- **Last Verified**: 2025-01-05
- **Repo Ref**: f32413325de67a3ad1bde6649d16474d236d164b

---
metadata:
  version: "1.0.0"
  created_at: "2025-01-05T10:00:00Z"
  last_verified: "2025-01-05T10:00:00Z"
  git_commit: "f32413325de67a3ad1bde6649d16474d236d164b"
  source_files:
    src/env.ts:
      git_hash: "ad277f4acec76529ab0d1d32d9858fd781c24e89"
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
// src/env.ts:32-36
runtimeEnvStrict: {
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
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

# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Server
PORT=3000
```

### Production (.env.production)

```env
DATABASE_URL=postgresql://prod-db-server:5432/dongueldonguel
NODE_ENV=production
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
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
