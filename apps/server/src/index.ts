import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sql } from 'drizzle-orm';
import githubRouter from './presentation/http/github/github.index';
import reminderRouter from './presentation/http/reminder/reminder.index';
import statusRouter from './presentation/http/status/status.index';
import pylonApp from './presentation/graphql';
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

// Pylon GraphQL 엔드포인트
// Pylon은 Hono 앱으로 직접 라우팅할 수 있습니다
app.route('/', pylonApp);

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
    const { createCommands } = await import('./presentation/discord/commands');
    const commands = createCommands();
    await registerSlashCommands(commands);

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
