import { Hono } from 'hono';

import {
  DISCORD_INTERACTION_TYPE,
  DISCORD_RESPONSE_TYPE,
  DiscordInteraction,
  WorkerEnv,
  createDiscordCommandScaffoldResponse,
  jsonResponse,
  verifyDiscordRequest,
} from './discord';

const app = new Hono<{ Bindings: WorkerEnv }>();

app.get('/', (c) =>
  c.json({
    status: 'ok',
    service: 'donguel-donguel-notification-worker',
    runtime: 'cloudflare-workers',
  })
);

app.get('/health', (c) =>
  c.json({
    status: 'healthy',
    runtime: 'cloudflare-workers',
    timestamp: new Date().toISOString(),
  })
);

app.post('/discord/interactions', async (c) => {
  const body = await c.req.text();
  const isValid = await verifyDiscordRequest(c.req.raw, body, c.env);

  if (!isValid) {
    return jsonResponse({ error: 'invalid Discord request signature' }, { status: 401 });
  }

  let interaction: DiscordInteraction;
  try {
    interaction = JSON.parse(body) as DiscordInteraction;
  } catch {
    return jsonResponse({ error: 'invalid JSON body' }, { status: 400 });
  }

  if (interaction.type === DISCORD_INTERACTION_TYPE.PING) {
    return jsonResponse({ type: DISCORD_RESPONSE_TYPE.PONG });
  }

  if (interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND) {
    return jsonResponse(createDiscordCommandScaffoldResponse(interaction));
  }

  return jsonResponse(
    {
      type: DISCORD_RESPONSE_TYPE.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: 64,
        content: '지원하지 않는 Discord interaction 타입이에요.',
      },
    },
    { status: 200 }
  );
});

app.post('/webhook/github', async (c) => {
  const target = new URL('/webhook/github', c.env.API_BASE_URL);
  const response = await fetch(target, {
    method: 'POST',
    headers: c.req.raw.headers,
    body: c.req.raw.body,
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
});

export default app;
