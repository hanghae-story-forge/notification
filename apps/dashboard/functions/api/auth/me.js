import { decodeSession, jsonResponse } from '../../_shared.js';

export function onRequestGet(context) {
  // Reads the discord_session cookie set by the Discord OAuth callback.
  const session = decodeSession(context.request);
  return jsonResponse({ authenticated: Boolean(session), user: session });
}
