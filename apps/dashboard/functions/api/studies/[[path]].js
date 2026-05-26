import { corsHeaders, decodeSession, normalizePath, UPSTREAM_ORIGIN } from '../../_shared.js';

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestGet(context) {
  const path = normalizePath(context.params.path);
  const sourceUrl = new URL(context.request.url);
  const upstreamPath = path ? `/api/studies/${path}` : '/api/studies';
  const upstreamUrl = new URL(upstreamPath, UPSTREAM_ORIGIN);
  upstreamUrl.search = sourceUrl.search;

  const headers = new Headers({
    accept: 'application/json',
    'user-agent': 'donguel-donguel-dashboard-pages',
  });
  const session = decodeSession(context.request);
  if (session?.id) headers.set('x-discord-user-id', session.id);

  const upstreamResponse = await fetch(upstreamUrl.toString(), { headers });
  const responseHeaders = new Headers(corsHeaders);
  responseHeaders.set('content-type', upstreamResponse.headers.get('content-type') ?? 'application/json; charset=utf-8');
  responseHeaders.set('cache-control', 'no-store');

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}
