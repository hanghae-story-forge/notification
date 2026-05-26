export function onRequestGet(context) {
  const url = new URL(context.request.url);
  const clientId = context.env.DISCORD_CLIENT_ID;
  const redirectUri = context.env.DISCORD_REDIRECT_URI ?? `${url.origin}/api/auth/discord/callback`;

  if (!clientId) {
    return new Response('DISCORD_CLIENT_ID is not configured', { status: 500 });
  }

  const state = crypto.randomUUID();
  const authorizeUrl = new URL('https://discord.com/oauth2/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', 'identify');
  authorizeUrl.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      location: authorizeUrl.toString(),
      'set-cookie': `discord_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}
