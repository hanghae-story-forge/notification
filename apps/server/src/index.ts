import 'dotenv/config';
import { sql } from 'drizzle-orm';

import { app } from '@getcronit/pylon';
import { serve } from '@hono/node-server';

// ========================================
// DI Container Registration
// ========================================

import { registerDependencies } from './shared/di';

// Register all dependencies before importing handlers
registerDependencies();

// ========================================
// Global Error Handlers
// ========================================

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process immediately, log and continue
  // In production, you might want to exit after cleanup
});

import {
  createDiscordBot,
  registerSlashCommands,
} from './presentation/discord/bot';

import { env } from './env';
import { logger } from './infrastructure/lib/logger';

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
// Logging Middleware
// ========================================

app.use('*', async (c, next) => {
  const startTime = Date.now();
  const path = c.req.path;
  const method = c.req.method;

  // Health check은 로그에서 제외 (너무 많이 호출됨)
  if (path !== '/health') {
    logger.api.info('API request', { method, path });
  }

  await next();

  const duration = Date.now() - startTime;
  const statusCode = c.res.status;

  // Health check은 로그에서 제외
  if (path !== '/health') {
    logger.api.info('API response', {
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
    });
  }
});

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

// Only start Discord Bot in production
if (env.APP_ENV === 'production') {
  void (async () => {
    try {
      logger.discord.info('Starting Discord Bot...');

      const { createCommands } =
        await import('./presentation/discord/commands');
      const commands = createCommands();

      if (env.DISCORD_COMMAND_SYNC_POLICY === 'on') {
        logger.discord.info('Registering slash commands...', {
          count: commands.length,
        });
        void registerSlashCommands(commands).catch((error) => {
          logger.discord.error('Failed to register slash commands', error, {
            commandCount: commands.length,
          });
        });
      } else {
        logger.discord.info('Skipping slash command registration', {
          policy: env.DISCORD_COMMAND_SYNC_POLICY,
          count: commands.length,
        });
      }

      const discordBot = createDiscordBot();
      logger.discord.info('Logging in to Discord...');
      await discordBot.login(env.DISCORD_BOT_TOKEN);
      logger.discord.info('Discord Bot started successfully');
    } catch (error) {
      logger.discord.error('Failed to start Discord Bot', error);
    }
  })();
}

serve(app, (info) => {
  console.log(`🚀 Server started on http://localhost:${info.port}`);
});

// Export default app for Pylon
export default app;
