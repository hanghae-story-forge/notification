import 'reflect-metadata';
import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ApolloServer } from '@apollo/server';
import { sql } from 'drizzle-orm';
import { createDIContainer } from './di/container';
import { createGitHubWebhookRoutes } from './presentation/http/routes/webhook/github-webhook.routes';
import { GitHubWebhookController } from './presentation/http/routes/webhook/github-webhook.controller';
import { createReminderRoutes } from './presentation/http/routes/reminder.routes';
import { ReminderController } from './presentation/http/controllers/reminder.controller';
import { createStatusRoutes } from './presentation/http/routes/status.routes';
import { StatusController } from './presentation/http/controllers/status.controller';
import { createResolvers } from './presentation/graphql/resolvers';
import { typeDefs } from './presentation/graphql/schema';
import {
  createDiscordBot,
  registerSlashCommands,
} from './infrastructure/external-services/discord/discord-bot.service';
import { db } from './lib/db';
import { env } from './env';
import type { Env } from './libs';

const app = new Hono<Env>();

// Create DI Container
const di = createDIContainer(env.DISCORD_WEBHOOK_URL);

// CORS
app.use('/*', cors());

// Health check for Docker
app.get('/health', async (c) => {
  try {
    await db.execute(sql`SELECT 1`);

    return c.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      503
    );
  }
});

// Root endpoint
app.get('/', (c) => c.json({ status: 'ok', message: '똥글똥글 API' }));

// GitHub webhook (new architecture)
const githubController = new GitHubWebhookController(di);
app.route('/', createGitHubWebhookRoutes(githubController));

// Reminder API (new architecture)
const reminderController = new ReminderController(di);
app.route('/', createReminderRoutes(reminderController));

// Status API (new architecture)
const statusController = new StatusController(di);
app.route('/', createStatusRoutes(statusController));

// Apollo Server setup with new resolvers
const apollo = new ApolloServer({
  typeDefs,
  resolvers: createResolvers(di),
  introspection: true,
});

// GraphQL endpoint
app.all('/graphql', async (c) => {
  const { method } = c.req;
  if (method !== 'GET' && method !== 'POST') {
    return c.text('Method Not Allowed', 405);
  }

  const query = c.req.query();
  const body = method === 'POST' ? await c.req.json() : null;

  const response = await apollo.executeOperation({
    query: body?.query || query.query,
    variables: body?.variables || query.variables,
    operationName: body?.operationName || query.operationName,
  });

  const headers: Record<string, string> = {};
  response.http.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const result =
    'body' in response
      ? (response.body as { singleResult: unknown })
      : response;

  return c.json(result, 200, headers);
});

const port = parseInt(process.env.PORT || '3000');

console.log(`🚀 Server starting on port ${port}`);

// Start HTTP server
serve({
  fetch: app.fetch,
  port,
});

console.log(`✅ Server ready on http://localhost:${port}`);
console.log(`📊 GraphQL: http://localhost:${port}/graphql`);

// Discord Bot startup
if (env.DISCORD_BOT_TOKEN && env.DISCORD_CLIENT_ID) {
  try {
    await registerSlashCommands();
    const discordBot = createDiscordBot();
    await discordBot.login(env.DISCORD_BOT_TOKEN);
  } catch (error) {
    console.error('❌ Failed to start Discord Bot:', error);
  }
} else {
  console.log(
    '⚠️  Discord Bot not configured. Set DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID to enable.'
  );
}
