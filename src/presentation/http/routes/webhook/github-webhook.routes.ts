import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, AppContext } from '../../../../libs';
import { GitHubWebhookController } from './github-webhook.controller';

const IssueCommentWebhookPayloadSchema = z.object({
  action: z.enum(['created', 'edited', 'deleted']),
  comment: z.object({
    id: z.number(),
    user: z.object({
      login: z.string(),
    }),
    body: z.string(),
  }),
  issue: z.object({
    html_url: z.string(),
  }),
});

const IssuesWebhookPayloadSchema = z.object({
  action: z.enum(['opened', 'edited', 'deleted', 'closed', 'reopened']),
  issue: z.object({
    title: z.string(),
    body: z.string().nullable(),
    html_url: z.string(),
  }),
});

export const createGitHubWebhookRoutes = (controller: GitHubWebhookController) => {
  const app = new Hono<Env>();

  app.post(
    '/webhook/github',
    async (c, next) => {
      const githubEvent = c.req.header('x-github-event');

      if (githubEvent === 'issue_comment') {
        const payload = await c.req.json();
        const validated = await IssueCommentWebhookPayloadSchema.safeParseAsync(payload);

        if (!validated.success) {
          return c.json({ message: 'Invalid payload' }, 400);
        }

        if (validated.data.action === 'created') {
          return controller.handleIssueComment(c);
        }
      }

      if (githubEvent === 'issues') {
        const payload = await c.req.json();
        const validated = await IssuesWebhookPayloadSchema.safeParseAsync(payload);

        if (!validated.success) {
          return c.json({ message: 'Invalid payload' }, 400);
        }

        if (validated.data.action === 'opened') {
          return controller.handleIssueCreated(c);
        }
      }

      return controller.handleUnknownEvent(c);
    }
  );

  return app;
};
