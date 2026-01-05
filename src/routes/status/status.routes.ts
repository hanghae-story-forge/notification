import { InternalServerErrorSchema, NotFoundErrorSchema } from '@/lib/error';
import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

const tags = ['Status'];

// Schemas
const CycleDetailSchema = z.object({
  id: z.number(),
  week: z.number(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  generationName: z.string(),
});

const SummarySchema = z.object({
  total: z.number(),
  submitted: z.number(),
  notSubmitted: z.number(),
});

const SubmittedMemberSchema = z.object({
  name: z.string(),
  github: z.string(),
  url: z.string().url(),
  submittedAt: z.string().datetime(),
});

const NotSubmittedMemberSchema = z.object({
  name: z.string(),
  github: z.string(),
});

const StatusResponseSchema = z.object({
  cycle: CycleDetailSchema,
  summary: SummarySchema,
  submitted: z.array(SubmittedMemberSchema),
  notSubmitted: z.array(NotSubmittedMemberSchema),
});

// Discord webhook schemas
const DiscordEmbedSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  color: z.number().optional(),
  fields: z
    .array(
      z.object({
        name: z.string(),
        value: z.string(),
        inline: z.boolean().optional(),
      })
    )
    .optional(),
  footer: z
    .object({
      text: z.string(),
    })
    .optional(),
  timestamp: z.string().optional(),
});

const DiscordWebhookResponseSchema = z.object({
  embeds: z.array(DiscordEmbedSchema).optional(),
});

const CurrentCycleSchema = z.object({
  id: z.number(),
  week: z.number(),
  generationName: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  githubIssueUrl: z.string().url().nullable(),
  daysLeft: z.number(),
  hoursLeft: z.number(),
});

export const getCurrentCycle = createRoute({
  path: '/api/status/current',
  method: 'get',
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(CurrentCycleSchema, 'Current cycle info'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      NotFoundErrorSchema,
      'No active cycle found'
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      InternalServerErrorSchema,
      'Failed to get current cycle'
    ),
  },
});

export const getCurrentCycleDiscord = createRoute({
  path: '/api/status/current/discord',
  method: 'get',
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      DiscordWebhookResponseSchema,
      'Discord webhook payload for current cycle'
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      NotFoundErrorSchema,
      'No active cycle found'
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      InternalServerErrorSchema,
      'Failed to get current discord status'
    ),
  },
});

export const getStatus = createRoute({
  path: '/api/status/{cycleId}',
  method: 'get',
  tags,
  request: {
    params: z.object({
      cycleId: z.string().regex(/^\d+$/, 'Cycle ID must be a number'),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      StatusResponseSchema,
      'Status retrieved successfully'
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      NotFoundErrorSchema,
      'Cycle not found'
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      InternalServerErrorSchema,
      'Failed to get status'
    ),
  },
});

export const getStatusDiscord = createRoute({
  path: '/api/status/{cycleId}/discord',
  method: 'get',
  tags,
  request: {
    params: z.object({
      cycleId: z.string().regex(/^\d+$/, 'Cycle ID must be a number'),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      DiscordWebhookResponseSchema,
      'Discord webhook payload'
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      NotFoundErrorSchema,
      'Cycle not found'
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      InternalServerErrorSchema,
      'Failed to get discord status'
    ),
  },
});
