import type { AppContext } from '@/lib/router';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { sendDiscordWebhook, createReminderMessage } from '@/services/discord';

// DDD Layer imports
import { GetReminderTargetsQuery } from '@/application/queries';
import { DrizzleCycleRepository } from '@/infrastructure/persistence/drizzle/cycle.repository.impl';
import { DrizzleGenerationRepository } from '@/infrastructure/persistence/drizzle/generation.repository.impl';
import { DrizzleSubmissionRepository } from '@/infrastructure/persistence/drizzle/submission.repository.impl';
import { DrizzleMemberRepository } from '@/infrastructure/persistence/drizzle/member.repository.impl';
import { NotFoundError } from '@/domain/common/errors';

// ========================================
// Repository & Query Instances
// ========================================

const cycleRepo = new DrizzleCycleRepository();
const generationRepo = new DrizzleGenerationRepository();
const submissionRepo = new DrizzleSubmissionRepository();
const memberRepo = new DrizzleMemberRepository();

const getReminderTargetsQuery = new GetReminderTargetsQuery(
  cycleRepo,
  generationRepo,
  submissionRepo,
  memberRepo
);

// ========================================
// Handlers
// ========================================

// n8n용 리마인더 대상 목록 조회
export const getReminderCycles = async (c: AppContext) => {
  const hoursBefore = parseInt(c.req.query('hoursBefore') ?? '24');

  try {
    const cycles =
      await getReminderTargetsQuery.getCyclesWithDeadlineIn(hoursBefore);
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

  try {
    const result =
      await getReminderTargetsQuery.getNotSubmittedMembers(cycleId);
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

  const discordWebhookUrl =
    c.env.DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;

  if (!discordWebhookUrl) {
    return c.json(
      { error: 'DISCORD_WEBHOOK_URL not configured' },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  try {
    const cycles =
      await getReminderTargetsQuery.getCyclesWithDeadlineIn(hoursBefore);

    const sentCycles: Array<{ cycleId: number; cycleName: string }> = [];

    for (const cycleInfo of cycles) {
      // 미제출자 목록 조회
      const result = await getReminderTargetsQuery.getNotSubmittedMembers(
        cycleInfo.cycleId
      );

      if (result.notSubmitted.length === 0) {
        continue; // 모두 제출했으면 알림 스킵
      }

      const notSubmittedNames = result.notSubmitted.map((m) => m.name);
      const endDate = new Date(result.endDate);

      // Discord 알림 전송
      await sendDiscordWebhook(
        discordWebhookUrl,
        createReminderMessage(cycleInfo.cycleName, endDate, notSubmittedNames)
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
