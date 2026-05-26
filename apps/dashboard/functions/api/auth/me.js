import { decodeSession, jsonResponse } from '../../_shared.js';

export function onRequestGet(context) {
  // Reads the discord_session cookie set by the Discord OAuth callback.
  const session = decodeSession(context.request);
  const oauthConfigured = Boolean(context.env.DISCORD_CLIENT_ID && context.env.DISCORD_CLIENT_SECRET);
  return jsonResponse({ authenticated: Boolean(session), user: session, oauthConfigured });
}
