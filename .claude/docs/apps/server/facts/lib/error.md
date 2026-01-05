# Error Schemas

- **Scope**: OpenAPI 에러 스키마 정의
- **Source of Truth**: `src/lib/error.ts`
- **Last Verified**: 2026-01-05
- **Repo Ref**: df3a0ab

---
metadata:
  version: "1.0.0"
  created_at: "2026-01-05T12:00:00Z"
  last_verified: "2026-01-05T12:00:00Z"
  git_commit: "df3a0ab"
  source_files:
    src/lib/error.ts:
      git_hash: "df3a0ab"
      source_exists: true
---

## 개요

이 모듈은 OpenAPI 스펙을 위한 표준 에러 응답 스키마를 Zod로 정의합니다. 모든 라우트에서 일관된 에러 응답 형식을 보장합니다.

## 스키마 정의

### 기본 에러 스키마

모든 에러 스키마의 기본 형식:

```typescript
export const ErrorSchema = z.object({
  error: z.string().optional(),
  message: z.string().optional(),
});
```

### HTTP 상태 코드별 스키마

각 상태 코드에 맞는 에러 스키마:

```typescript
export const BadRequestErrorSchema = ErrorSchema;          // 400
export const NotFoundErrorSchema = ErrorSchema;             // 404
export const UnauthorizedErrorSchema = ErrorSchema;         // 401
export const ForbiddenErrorSchema = ErrorSchema;            // 403
export const InternalServerErrorSchema = ErrorSchema;       // 500
export const ConflictErrorSchema = ErrorSchema;             // 409
```

## 사용 예제

### 라우트 정의

```typescript
// src/routes/status/status.routes.ts
import { InternalServerErrorSchema, NotFoundErrorSchema } from '@/lib/error';
import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

export const getStatus = createRoute({
  path: '/api/status/{cycleId}',
  method: 'get',
  tags: ['Status'],
  request: {
    params: z.object({
      cycleId: z.string().regex(/^\d+$/, 'Cycle ID must be a number'),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(StatusResponseSchema, 'Status retrieved successfully'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      NotFoundErrorSchema,
      'Cycle not found'
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      InternalServerErrorSchema,
      'Failed to get status'
    ),
  },
});
```

### 핸들러 구현

```typescript
// src/routes/status/status.handlers.ts
export const getStatus = async (c: AppContext) => {
  const cycleId = parseInt(c.req.param('cycleId'));

  const cycleList = await db
    .select()
    .from(cycles)
    .where(eq(cycles.id, cycleId));

  if (cycleList.length === 0) {
    return c.json(
      { error: 'Cycle not found' },
      HttpStatusCodes.NOT_FOUND
    );
  }

  // ... 성공 응답 반환
};
```

### 실제 에러 응답

**404 Not Found**:
```json
{
  "error": "Cycle not found"
}
```

**400 Bad Request**:
```json
{
  "error": "No URL found in comment"
}
```

**500 Internal Server Error**:
```json
{
  "error": "DISCORD_WEBHOOK_URL not configured"
}
```

## 설계 이유

1. **일관성**: 모든 API가 동일한 에러 형식 사용
2. **타입 안전성**: Zod 스키마로 런타임 및 컴파일 타임 검증
3. **OpenAPI 통합**: 자동으로 API 문서화에 에러 응답 포함
4. **재사용성**: 중앙 집중식 정의로 유지보수 용이

## 확장 가능성

추후 다음과 같은 확장이 가능:

```typescript
// 예: 상세한 에러 정보
export const DetailedErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string(),           // 에러 코드
  details: z.array(z.object({ // 상세 검증 에러
    field: z.string(),
    message: z.string(),
  })).optional(),
  stack: z.string().optional(), // 개발 환경에서만
});

// 예: 레이트 리미팅
export const RateLimitErrorSchema = z.object({
  error: z.string(),
  retryAfter: z.number(),      // 초 단위
});
```

## 관련 파일

- `src/lib/router.ts`: 라우터 생성 및 타입 정의
- `src/routes/*/*.routes.ts`: 에러 스키마 사용 예제

## 참고

- **Zod**: TypeScript-first 스키마 검증 라이브러리
- **@hono/zod-openapi**: OpenAPI 스펙 자동 생성
- **stoker**: Hono용 OpenAPI 헬퍼 라이브러리
