const UPSTREAM_ORIGIN = 'https://donguel-donguel-notification.onrender.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, accept',
};

function normalizePath(pathParam) {
  if (!pathParam) {
    return '';
  }

  if (Array.isArray(pathParam)) {
    return pathParam.join('/');
  }

  return pathParam;
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function onRequestGet(context) {
  const path = normalizePath(context.params.path);
  const sourceUrl = new URL(context.request.url);
  const upstreamUrl = new URL(`/api/status/${path}`, UPSTREAM_ORIGIN);
  upstreamUrl.search = sourceUrl.search;

  const upstreamResponse = await fetch(upstreamUrl.toString(), {
    headers: {
      accept: 'application/json',
      'user-agent': 'donguel-donguel-dashboard-pages',
    },
  });

  const responseHeaders = new Headers(corsHeaders);
  responseHeaders.set(
    'content-type',
    upstreamResponse.headers.get('content-type') ?? 'application/json; charset=utf-8',
  );
  responseHeaders.set('cache-control', 'no-store');

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}
