import { InternalServerErrorSchema, NotFoundErrorSchema } from '@/libs/error';
import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';

const tags = ['GitHub Webhook'];

// Webhook schemas
const GitHubUserSchema = z.object({
  login: z.string(),
});

const IssueCommentSchema = z.object({
  id: z.number(),
  user: GitHubUserSchema,
  body: z.string(),
  html_url: z.string(),
  created_at: z.string(),
});

const IssueSchema = z.object({
  number: z.number(),
  html_url: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  created_at: z.string(),
});

const RepositorySchema = z.object({
  name: z.string(),
  owner: GitHubUserSchema,
});

const IssueCommentWebhookPayloadSchema = z.object({
  action: z.literal('created'),
  issue: IssueSchema,
  comment: IssueCommentSchema,
  repository: RepositorySchema,
});

const IssuesWebhookPayloadSchema = z.object({
  action: z.literal('opened'),
  issue: IssueSchema,
  repository: RepositorySchema,
});

// Response schemas
const WebhookSuccessResponseSchema = z.object({
  message: z.string(),
});

const CycleCreatedResponseSchema = z.object({
  message: z.string(),
  cycle: z.object({
    id: z.number(),
    generationId: z.number(),
    week: z.number(),
    startDate: z.union([z.string(), z.date()]),
    endDate: z.union([z.string(), z.date()]),
    githubIssueUrl: z.union([z.string(), z.null()]),
    createdAt: z.union([z.string(), z.date()]),
  }),
});

const ErrorResponseSchema = z.object({
  message: z.string(),
});

// Export schemas for handler use
export { IssueCommentWebhookPayloadSchema, IssuesWebhookPayloadSchema };

export const handleIssueComment = createRoute({
  path: '/webhook/github',
  method: 'post',
  tags,
  request: {
    headers: z.object({
      'x-github-event': z.literal('issue_comment'),
    }),
    body: jsonContentRequired(
      IssueCommentWebhookPayloadSchema,
      'GitHub issue comment webhook payload'
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      WebhookSuccessResponseSchema,
      'Webhook processed successfully'
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      ErrorResponseSchema,
      'Bad request'
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      NotFoundErrorSchema,
      'Cycle or member not found'
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      InternalServerErrorSchema,
      'Internal server error'
    ),
  },
});

export const handleIssues = createRoute({
  path: '/webhook/github',
  method: 'post',
  tags,
  request: {
    headers: z.object({
      'x-github-event': z.literal('issues'),
    }),
    body: jsonContentRequired(
      IssuesWebhookPayloadSchema,
      'GitHub issues webhook payload'
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      CycleCreatedResponseSchema,
      'Cycle created successfully'
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      ErrorResponseSchema,
      'Bad request'
    ),
    [HttpStatusCodes.OK]: jsonContent(
      WebhookSuccessResponseSchema,
      'Webhook processed but ignored'
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      InternalServerErrorSchema,
      'Internal server error'
    ),
  },
});

export const handleUnknownEvent = createRoute({
  path: '/webhook/github',
  method: 'post',
  tags,
  request: {
    headers: z.object({
      'x-github-event': z.string(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      WebhookSuccessResponseSchema,
      'Event acknowledged but ignored'
    ),
  },
});
