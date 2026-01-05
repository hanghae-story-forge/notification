import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ApolloServer } from '@apollo/server';
import githubRouter from './routes/github/github.index';
import reminderRouter from './routes/reminder/reminder.index';
import statusRouter from './routes/status/status.index';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import {
  createDiscordBot,
  registerSlashCommands,
} from './services/discord-bot';

import './env';

const app = new Hono();

// CORS 허용
app.use('/*', cors());

// Health check
app.get('/', (c) => c.json({ status: 'ok', message: '똥글똥글 API' }));

// GitHub webhook
app.route('/', githubRouter);

// n8n용 API
app.route('/', reminderRouter);
app.route('/', statusRouter);

// Apollo Server 설정
const apollo = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true, // 개발용 스키마 탐색 허용
});

// GraphQL 엔드포인트
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

// HTTP 서버 시작
serve({
  fetch: app.fetch,
  port,
});

console.log(`✅ Server ready on http://localhost:${port}`);
console.log(`📊 GraphQL: http://localhost:${port}/graphql`);

// Discord Bot 시작 (토큰이 설정된 경우만)
const { env } = await import('./env');
if (env.DISCORD_BOT_TOKEN && env.DISCORD_CLIENT_ID) {
  try {
    // 슬래시 명령어 등록
    await registerSlashCommands();

    // Discord Bot 로그인
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
