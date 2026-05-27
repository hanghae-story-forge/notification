import type { Context, MiddlewareHandler } from 'hono';

export type ApiSuccess<T> = {
  success: true;
  data: T;
  error: null;
  meta: ApiMeta;
};

export type ApiFailure = {
  success: false;
  data: null;
  error: ApiError;
  meta: ApiMeta;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type ApiMeta = {
  requestId: string;
  timestamp: string;
};

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

const STATUS_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
};

function createMeta(requestId?: string): ApiMeta {
  return {
    requestId: requestId ?? crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

function getStatusCodeName(status: number) {
  return (
    STATUS_CODES[status] ??
    (status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_FAILED')
  );
}

export function isApiEnvelope(value: unknown): value is ApiResponse<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    'data' in value &&
    'error' in value &&
    'meta' in value
  );
}

export function normalizeError(payload: unknown, status: number): ApiError {
  if (payload && typeof payload === 'object') {
    const candidate = payload as {
      error?: unknown;
      message?: unknown;
      details?: unknown;
      code?: unknown;
    };
    const message =
      typeof candidate.error === 'string'
        ? candidate.error
        : typeof candidate.message === 'string'
          ? candidate.message
          : `HTTP ${status}`;

    return {
      code:
        typeof candidate.code === 'string'
          ? candidate.code
          : getStatusCodeName(status),
      message,
      ...(candidate.details === undefined
        ? {}
        : { details: candidate.details }),
    };
  }

  return {
    code: getStatusCodeName(status),
    message: typeof payload === 'string' ? payload : `HTTP ${status}`,
  };
}

export function createApiEnvelope<T>(
  payload: T,
  status: number,
  requestId?: string
): ApiResponse<T> {
  if (isApiEnvelope(payload)) {
    return payload as ApiResponse<T>;
  }

  const meta = createMeta(requestId);

  if (status >= 400) {
    return {
      success: false,
      data: null,
      error: normalizeError(payload, status),
      meta,
    };
  }

  return {
    success: true,
    data: payload,
    error: null,
    meta,
  };
}

function getRequestId(c: Context) {
  return c.req.header('x-request-id') ?? crypto.randomUUID();
}

export const apiEnvelopeMiddleware: MiddlewareHandler = async (c, next) => {
  const requestId = getRequestId(c);
  c.header('x-request-id', requestId);

  await next();

  const response = c.res;
  if (!response || response.status === 204 || response.status === 304) {
    return;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return;
  }

  const payload = await response
    .clone()
    .json()
    .catch(() => undefined);
  if (payload === undefined) {
    return;
  }

  const headers = new Headers(response.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('x-request-id', requestId);

  c.res = new Response(
    JSON.stringify(createApiEnvelope(payload, response.status, requestId)),
    {
      status: response.status,
      headers,
    }
  );
};
