export const UPSTREAM_ORIGIN = 'https://donguel-donguel-notification.onrender.com';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, accept, cookie',
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

export function jsonResponse(payload, init = {}) {
  const headers = new Headers(corsHeaders);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  for (const [key, value] of Object.entries(init.headers || {})) headers.set(key, value);
  return new Response(JSON.stringify(payload), { ...init, headers });
}
