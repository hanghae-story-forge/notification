import { describe, expect, it } from 'vitest';

import {
  DISCORD_INTERACTION_TYPE,
  DISCORD_RESPONSE_TYPE,
  createDiscordCommandScaffoldResponse,
  verifyDiscordRequest,
} from '../src/discord';

describe('Cloudflare Discord interaction scaffold', () => {
  it('creates an ephemeral scaffold response with the command name', () => {
    const response = createDiscordCommandScaffoldResponse({
      type: DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND,
      data: { name: 'me' },
    });

    expect(response.type).toBe(DISCORD_RESPONSE_TYPE.CHANNEL_MESSAGE_WITH_SOURCE);
    expect(response.data.flags).toBe(64);
    expect(response.data.content).toContain('/me');
    expect(response.data.content).toContain('Cloudflare Workers 이전 환경');
  });

  it('rejects Discord requests when the public key is not configured', async () => {
    const request = new Request('https://worker.test/discord/interactions', {
      method: 'POST',
      headers: {
        'x-signature-ed25519': '00',
        'x-signature-timestamp': '1',
      },
    });

    await expect(verifyDiscordRequest(request, '{}', {})).resolves.toBe(false);
  });

  it('rejects Discord requests with missing signature headers', async () => {
    const request = new Request('https://worker.test/discord/interactions', {
      method: 'POST',
    });

    await expect(
      verifyDiscordRequest(request, '{}', { DISCORD_PUBLIC_KEY: '00'.repeat(32) })
    ).resolves.toBe(false);
  });
});
