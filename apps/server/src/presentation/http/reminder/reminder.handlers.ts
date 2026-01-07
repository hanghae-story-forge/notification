import type { AppContext } from '@/presentation/shared';
import * as HttpStatusCodes from 'stoker/http-status-codes';

// DI Container imports
import {
  container,
  GET_REMINDER_TARGETS_QUERY_TOKEN,
  DISCORD_WEBHOOK_CLIENT_TOKEN,
} from '@/shared/di';

// DDD Layer imports
import { NotFoundError } from '@/domain/common/errors';
import type { GetReminderTargetsQuery } from '@/application/queries/get-reminder-targets.query';
import type { IDiscordWebhookClient } from '@/infrastructure/external/discord';

// ========================================
// Resolve Dependencies from Container
// ========================================

const getReminderTargetsQuery = container.resolve<GetReminderTargetsQuery>(
  GET_REMINDER_TARGETS_QUERY_TOKEN
);
const discordClient = container.resolve<IDiscordWebhookClient>(
  DISCORD_WEBHOOK_CLIENT_TOKEN
);

// ========================================
// Handlers
// ========================================

// n8n용 리마인더 대상 목록 조회
export const getReminderCycles = async (c: AppContext) => {
  const hoursBefore = parseInt(c.req.query('hoursBefore') ?? '24');
  const organizationSlug = c.req.query('organizationSlug');

  if (!organizationSlug) {
    return c.json(
      { error: 'organizationSlug query parameter is required' },
      HttpStatusCodes.BAD_REQUEST
    );
  }

  try {
    const cycles = await getReminderTargetsQuery.getCyclesWithDeadlineIn(
      organizationSlug,
      hoursBefore
    );
    return c.json({ cycles }, HttpStatusCodes.OK);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, HttpStatusCodes.NOT_FOUND);
    }
    console.error('Unexpected error in getReminderCycles:', error);
    return c.json(
      { error: 'Internal server error' },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

// 특정 사이클의 미제출자 목록 조회
export const getNotSubmittedMembers = async (c: AppContext) => {
  const cycleId = parseInt(c.req.param('cycleId'));
  const organizationSlug = c.req.query('organizationSlug');

  if (!organizationSlug) {
    return c.json(
      { error: 'organizationSlug query parameter is required' },
      HttpStatusCodes.BAD_REQUEST
    );
  }

  try {
    const result = await getReminderTargetsQuery.getNotSubmittedMembers(
      cycleId,
      organizationSlug
    );
    return c.json(result, HttpStatusCodes.OK);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, HttpStatusCodes.NOT_FOUND);
    }
    console.error('Unexpected error in getNotSubmittedMembers:', error);
    return c.json(
      { error: 'Internal server error' },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

// 리마인더 알림 발송 (GitHub Actions용)
export const sendReminderNotifications = async (c: AppContext) => {
  const hoursBefore = parseInt(c.req.query('hoursBefore') ?? '24');
  const organizationSlug = c.req.query('organizationSlug');

  if (!organizationSlug) {
    return c.json(
      { error: 'organizationSlug query parameter is required' },
      HttpStatusCodes.BAD_REQUEST
    );
  }

  const discordWebhookUrl =
    c.env.DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;

  if (!discordWebhookUrl) {
    return c.json(
      { error: 'DISCORD_WEBHOOK_URL not configured' },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  try {
    const cycles = await getReminderTargetsQuery.getCyclesWithDeadlineIn(
      organizationSlug,
      hoursBefore
    );

    const sentCycles: Array<{ cycleId: number; cycleName: string }> = [];

    for (const cycleInfo of cycles) {
      // 미제출자 목록 조회
      const result = await getReminderTargetsQuery.getNotSubmittedMembers(
        cycleInfo.cycleId,
        organizationSlug
      );

      if (result.notSubmitted.length === 0) {
        continue; // 모두 제출했으면 알림 스킵
      }

      const notSubmittedNames = result.notSubmitted.map((m) => m.name);
      const endDate = new Date(result.endDate);

      // Discord 알림 전송
      await discordClient.sendReminderNotification(
        discordWebhookUrl,
        cycleInfo.cycleName,
        endDate,
        notSubmittedNames
      );

      sentCycles.push({
        cycleId: cycleInfo.cycleId,
        cycleName: cycleInfo.cycleName,
      });
    }

    return c.json(
      {
        sent: sentCycles.length,
        cycles: sentCycles,
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, HttpStatusCodes.NOT_FOUND);
    }
    console.error('Unexpected error in sendReminderNotifications:', error);
    return c.json(
      { error: 'Internal server error' },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};
