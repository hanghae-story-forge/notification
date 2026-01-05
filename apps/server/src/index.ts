import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ApolloServer } from '@apollo/server';
import { sql } from 'drizzle-orm';
import githubRouter from './presentation/http/github/github.index';
import reminderRouter from './presentation/http/reminder/reminder.index';
import statusRouter from './presentation/http/status/status.index';
import { typeDefs, resolvers } from './presentation/graphql';
import {
  createDiscordBot,
  registerSlashCommands,
} from './presentation/discord/bot';

import './env';

const app = new Hono();

// CORS 허용
app.use('/*', cors());

// Health check for Docker
app.get('/health', async (c) => {
  try {
    // DB 연결 확인
    const { db } = await import('./infrastructure/lib/db');
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

  // 표준 GraphQL 응답 형식으로 변환
  const result =
    'body' in response
      ? (response.body as { singleResult: { data: unknown; errors?: unknown } })
          .singleResult
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
