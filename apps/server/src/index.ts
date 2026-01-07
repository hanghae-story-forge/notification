import 'dotenv/config';
import { sql } from 'drizzle-orm';

import { app } from '@getcronit/pylon';
import { serve } from '@hono/node-server';

import {
  createDiscordBot,
  registerSlashCommands,
} from './presentation/discord/bot';

import { env } from './env';

// Import GraphQL configuration
import { graphql } from './presentation/graphql/pylon.service';

// GitHub Webhook Handlers
import {
  handleIssueComment,
  handleIssues,
  handleUnknownEvent,
} from './presentation/http/github/github.handlers';

// Reminder Handlers
import {
  getReminderCycles,
  getNotSubmittedMembers,
  sendReminderNotifications,
} from './presentation/http/reminder/reminder.handlers';

// Status Handlers
import {
  getCurrentCycle,
  getCurrentCycleDiscord,
  getStatus,
  getStatusDiscord,
} from './presentation/http/status/status.handlers';

// ========================================
// REST Endpoints
// ========================================

// Health check for Docker
app.get('/health', async (c) => {
  try {
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

// GitHub webhook - Issue comment
app.post('/webhook/github', async (c) => {
  const githubEvent = c.req.header('x-github-event');
  if (githubEvent === 'issue_comment') {
    return handleIssueComment(c);
  }
  if (githubEvent === 'issues') {
    return handleIssues(c);
  }
  return handleUnknownEvent(c);
});

// Reminder API
app.get('/api/reminder', getReminderCycles);
app.get('/api/reminder/:cycleId/not-submitted', getNotSubmittedMembers);
app.post('/api/reminder/send-reminders', sendReminderNotifications);

// Status API
app.get('/api/status/current', getCurrentCycle);
app.get('/api/status/current/discord', getCurrentCycleDiscord);
app.get('/api/status/:cycleId', getStatus);
app.get('/api/status/:cycleId/discord', getStatusDiscord);

// ========================================
// GraphQL API
// ========================================

export { graphql };

// ========================================
// Discord Bot Integration
// ========================================

if (env.DISCORD_BOT_TOKEN && env.DISCORD_CLIENT_ID) {
  void (async () => {
    try {
      const { createCommands } =
        await import('./presentation/discord/commands');
      const commands = createCommands();
      await registerSlashCommands(commands);

      const discordBot = createDiscordBot();
      await discordBot.login(env.DISCORD_BOT_TOKEN);
    } catch (error) {
      console.error('❌ Failed to start Discord Bot:', error);
    }
  })();
} else {
  console.log(
    '⚠️  Discord Bot not configured. Set DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID to enable.'
  );
}

serve(app, (info) => {
  console.log(`🚀 Server started on http://localhost:${info.port}`);
});

// Export default app for Pylon
export default app;
