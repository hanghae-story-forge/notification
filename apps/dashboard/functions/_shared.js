export const UPSTREAM_ORIGIN =
  'https://donguel-donguel-notification.onrender.com';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, accept, cookie',
};

const STATUS_CODES = {
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

export function normalizePath(pathParam) {
  if (!pathParam) return '';
  if (Array.isArray(pathParam)) return pathParam.join('/');
  return pathParam;
}

export function getCookie(request, name) {
  const cookie = request.headers.get('cookie') || '';
  return cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function decodeSession(request) {
  const raw = getCookie(request, 'discord_session');
  if (!raw) return null;
  try {
    const json = atob(decodeURIComponent(raw));
    const session = JSON.parse(json);
    if (!session?.id) return null;
    return session;
  } catch {
    return null;
  }
}

function createMeta() {
  return {
    requestId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

function errorCodeForStatus(status) {
  return (
    STATUS_CODES[status] ??
    (status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_FAILED')
  );
}

export function apiSuccess(data) {
  return {
    success: true,
    data,
    error: null,
    meta: createMeta(),
  };
}

export function apiFailure(message, status = 500, details) {
  return {
    success: false,
    data: null,
    error: {
      code: errorCodeForStatus(status),
      message,
      ...(details === undefined ? {} : { details }),
    },
    meta: createMeta(),
  };
}

export function isApiEnvelope(payload) {
  return Boolean(
    payload &&
    typeof payload === 'object' &&
    'success' in payload &&
    'data' in payload &&
    'error' in payload &&
    'meta' in payload,
  );
}

export function jsonResponse(payload, init = {}) {
  const status = init.status ?? 200;
  const headers = new Headers(corsHeaders);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  for (const [key, value] of Object.entries(init.headers || {}))
    headers.set(key, value);

  const enveloped = isApiEnvelope(payload)
    ? payload
    : status >= 400
      ? apiFailure(
          payload?.message ?? payload?.error ?? `HTTP ${status}`,
          status,
          payload?.details,
        )
      : apiSuccess(payload);

  return new Response(JSON.stringify(enveloped), { ...init, headers });
}
