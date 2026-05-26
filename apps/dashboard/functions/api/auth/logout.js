export function onRequestGet() {
  return new Response(null, {
    status: 302,
    headers: {
      location: '/',
      'set-cookie': 'discord_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    },
  });
}
