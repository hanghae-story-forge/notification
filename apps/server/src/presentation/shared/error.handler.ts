// Shared Error Handler for Presentation Layer

import type { Context } from 'hono';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
} from '@/domain/common/errors';
import { logger } from '@/infrastructure/lib/logger';

export type AppContext = Context;

/**
 * 도메인 에러를 HTTP 상태 코드로 매핑
 */
function getStatusCodeForError(error: Error): number {
  if (error instanceof NotFoundError) {
    return HttpStatusCodes.NOT_FOUND;
  }
  if (error instanceof ValidationError) {
    return HttpStatusCodes.BAD_REQUEST;
  }
  if (error instanceof ConflictError) {
    return HttpStatusCodes.CONFLICT;
  }
  if (error instanceof UnauthorizedError) {
    return HttpStatusCodes.UNAUTHORIZED;
  }
  return HttpStatusCodes.INTERNAL_SERVER_ERROR;
}

/**
 * 에러 응답 본문 생성
 */
function getErrorResponse(error: Error): { error: string } {
  // 프로덕션 환경에서는 내부 구현이 노출되지 않도록 메시지를 제한할 수 있습니다
  return {
    error: error.message || 'An unexpected error occurred',
  };
}

/**
 * 비동기 핸들러 래퍼 - 도메인 에러를 HTTP 응답으로 변환
 *
 * 사용 예시:
 * ```ts
 * export const getMember = asyncHandler(async (c) => {
 *   const member = await getMemberQuery.execute(id);
 *   return c.json(member, HttpStatusCodes.OK);
 * });
 * ```
 */
export const asyncHandler = (handler: (c: AppContext) => Promise<Response>) => {
  return async (c: AppContext): Promise<Response> => {
    const startTime = Date.now();
    const path = c.req.path;
    const method = c.req.method;

    try {
      return await handler(c);
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof Error) {
        const statusCode = getStatusCodeForError(error);

        logger.apiError(method, path, statusCode, error);

        // 204 No Content는 body를 가질 수 없으므로 제외
        // Hono의 c.json은 ContentfulStatusCode만 허용
        return c.json(
          getErrorResponse(error),
          statusCode as
            | typeof HttpStatusCodes.OK
            | typeof HttpStatusCodes.BAD_REQUEST
            | typeof HttpStatusCodes.NOT_FOUND
            | typeof HttpStatusCodes.CONFLICT
            | typeof HttpStatusCodes.UNAUTHORIZED
            | typeof HttpStatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      // 알 수 없는 에러 타입
      logger.api.error('Unknown API error', error, {
        method,
        path,
        duration: `${duration}ms`,
      });
      return c.json(
        { error: 'Internal server error' },
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  };
};
