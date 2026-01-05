# Router Utility

- **Scope**: 라우터 생성 헬퍼 및 타입 정의
- **Source of Truth**: `src/lib/router.ts`
- **Last Verified**: 2026-01-05
- **Repo Ref**: df3a0ab

---
metadata:
  version: "1.0.0"
  created_at: "2026-01-05T12:00:00Z"
  last_verified: "2026-01-05T12:00:00Z"
  git_commit: "df3a0ab"
  source_files:
    src/lib/router.ts:
      git_hash: "df3a0ab"
      source_exists: true
---

## 개요

이 모듈은 Hono의 OpenAPIHono를 위한 타입 안전한 라우터 생성 헬퍼와 공통 타입을 제공합니다.

## 타입 정의

### Bindings

환경 변수 바인딩 (Hono의 타입 안전성 제공):

```typescript
export type Bindings = {
  DISCORD_WEBHOOK_URL?: string;
  GITHUB_WEBHOOK_SECRET?: string;
};
```

### Variables

Hono 컨텍스트 변수 (현재 비어있음):

```typescript
export type Variables = Record<string, never>;
```

### AppOpenAPIHono

OpenAPIHono의 타입화된 버전:

```typescript
export type AppOpenAPIHono = OpenAPIHono<{
  Bindings: Bindings;
  Variables: Variables;
}>;
```

### AppContext

Hono 컨텍스트의 타입화된 버전:

```typescript
export type AppContext = Context<{
  Bindings: Bindings;
  Variables: Variables;
}>;
```

## 함수

### createRouter()

새로운 OpenAPIHono 인스턴스를 생성합니다.

**Signature**:
```typescript
export function createRouter() {
  return new OpenAPIHono<{
    Bindings: Bindings;
    Variables: Variables;
  }>();
}
```

**Use Case**:
- 각 라우트 모듈(github, reminder, status)에서 라우터 생성
- 일관된 타입 안전성 보장
- OpenAPI 스펙 자동 생성

## 사용 예제

### 라우터 생성

```typescript
// src/routes/github/github.index.ts
import { createRouter } from '@/lib/router';
import * as routes from './github.routes';
import * as handlers from './github.handlers';

const router = createRouter()
  .openapi(routes.handleIssueComment, handlers.handleIssueComment)
  .openapi(routes.handleIssues, handlers.handleIssues)
  .openapi(routes.handleUnknownEvent, handlers.handleUnknownEvent);

export default router;
```

### 핸들러에서 타입 사용

```typescript
// src/routes/github/github.handlers.ts
import type { AppContext } from '@/lib/router';

export const handleIssueComment = async (c: AppContext) => {
  // c.env.DISCORD_WEBHOOK_URL에 타입 안전한 접근
  const discordWebhookUrl = c.env.DISCORD_WEBHOOK_URL ?? process.env.DISCORD_WEBHOOK_URL;

  // ... 핸들러 로직
};
```

## 재내보내기 (Re-exports)

다음 패키지의 항목들을 재내보내기하여 편리한 임포트를 제공:

```typescript
export { createRoute, z } from '@hono/zod-openapi';
```

이를 통해 다음과 같이 임포트 가능:

```typescript
import { createRouter, createRoute, z } from '@/lib/router';
```

## 설계 이유

1. **타입 안전성**: Bindings를 통해 환경 변수에 대한 컴파일 타임 검증
2. **일관성**: 모든 라우터에서 동일한 타입 사용
3. **편의성**: 자주 사용하는 패키지를 한 곳에서 임포트
4. **확장성**: 추후 Variables나 Bindings 확장이 용이

## 이전 구조와의 차이점

**이전** (`src/libs/index.ts`):
- `libs` (복수형) 디렉토리 사용
- 단일 파일에 모든 유틸리티 포함

**현재** (`src/lib/router.ts`):
- `lib` (단수형) 디렉토리 사용
- 라우터 관련 기능만 분리
- 에러 스키마는 `lib/error.ts`로 분리

## 관련 파일

- `src/lib/error.ts`: OpenAPI 에러 스키마 정의
- `src/routes/*/github.index.ts`: 라우터 사용 예제
