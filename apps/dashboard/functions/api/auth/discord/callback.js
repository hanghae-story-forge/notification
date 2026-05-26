import { getCookie } from '../../../_shared.js';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = getCookie(context.request, 'discord_oauth_state');

  if (!code || !state || state !== expectedState) {
    return new Response('Invalid Discord OAuth callback', { status: 400 });
  }

  const clientId = context.env.DISCORD_CLIENT_ID;
  const clientSecret = context.env.DISCORD_CLIENT_SECRET;
  const redirectUri = context.env.DISCORD_REDIRECT_URI ?? `${url.origin}/api/auth/discord/callback`;

  if (!clientId || !clientSecret) {
    return new Response('Discord OAuth is not configured', { status: 500 });
  }

  const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    return new Response('Failed to exchange Discord OAuth code', { status: 502 });
  }

  const token = await tokenResponse.json();
  const userResponse = await fetch('https://discord.com/api/users/@me', {
    headers: { authorization: `Bearer ${token.access_token}` },
  });

  if (!userResponse.ok) {
    return new Response('Failed to read Discord user', { status: 502 });
  }

  const user = await userResponse.json();
  const session = encodeURIComponent(btoa(JSON.stringify({
    id: user.id,
    username: user.username,
    globalName: user.global_name,
    avatar: user.avatar,
  })));

  return new Response(null, {
    status: 302,
    headers: {
      location: '/',
      'set-cookie': [
        `discord_session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`,
        'discord_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
      ].join(', '),
    },
  });
}
