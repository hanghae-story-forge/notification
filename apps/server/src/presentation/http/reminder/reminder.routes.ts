import {
  InternalServerErrorSchema,
  NotFoundErrorSchema,
} from '@/infrastructure/lib/error';
import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

const tags = ['Reminder'];

// Schemas
const CycleInfoSchema = z.object({
  cycleId: z.number(),
  cycleName: z.string(),
  endDate: z.string().datetime(),
  githubIssueUrl: z.string().nullable(),
});

const ReminderListResponseSchema = z.object({
  cycles: z.array(CycleInfoSchema),
});

const MemberInfoSchema = z.object({
  github: z.string(),
  name: z.string(),
  discordId: z.string().nullable(),
});

const NotSubmittedResponseSchema = z.object({
  cycleId: z.number(),
  week: z.number(),
  endDate: z.string().datetime(),
  notSubmitted: z.array(MemberInfoSchema),
  submittedCount: z.number(),
  totalMembers: z.number(),
});

export const getReminderCycles = createRoute({
  path: '/api/reminder',
  method: 'get',
  tags,
  request: {
    query: z.object({
      hoursBefore: z.string().default('24').optional(),
      organizationSlug: z.string().min(1, 'organizationSlug is required'),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      ReminderListResponseSchema,
      'Reminder cycles retrieved'
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ error: z.string() }),
      'Bad request - missing organizationSlug'
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      NotFoundErrorSchema,
      'Generation not found'
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      InternalServerErrorSchema,
      'Failed to get reminder cycles'
    ),
  },
});

export const getNotSubmittedMembers = createRoute({
  path: '/api/reminder/{cycleId}/not-submitted',
  method: 'get',
  tags,
  request: {
    params: z.object({
      cycleId: z.string().regex(/^\d+$/, 'Cycle ID must be a number'),
    }),
    query: z.object({
      organizationSlug: z.string().min(1, 'organizationSlug is required'),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      NotSubmittedResponseSchema,
      'Not submitted members retrieved'
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ error: z.string() }),
      'Bad request - missing organizationSlug'
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      NotFoundErrorSchema,
      'Cycle not found'
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      InternalServerErrorSchema,
      'Failed to get not submitted members'
    ),
  },
});

export const sendReminderNotifications = createRoute({
  path: '/api/reminder/send-reminders',
  method: 'post',
  tags,
  request: {
    query: z.object({
      hoursBefore: z.string().default('24').optional(),
      organizationSlug: z.string().min(1, 'organizationSlug is required'),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        sent: z.number(),
        cycles: z.array(
          z.object({ cycleId: z.number(), cycleName: z.string() })
        ),
      }),
      'Reminder notifications sent'
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ error: z.string() }),
      'Bad request - missing organizationSlug'
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      NotFoundErrorSchema,
      'Generation not found'
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      InternalServerErrorSchema,
      'Failed to send reminder notifications'
    ),
  },
});
