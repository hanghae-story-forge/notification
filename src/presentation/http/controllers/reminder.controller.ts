import { Container } from 'inversify';
import type { AppContext } from '@/libs';
import { TYPES } from '@/di/tokens';
import {
  FindUpcomingDeadlinesUseCase,
  SendReminderNotificationUseCase,
  FindSubmissionStatusUseCase,
} from '@core/application/use-cases';
import * as HttpStatusCodes from 'stoker/http-status-codes';

export class ReminderController {
  constructor(private readonly di: Container) {}

  async getReminderCycles(c: AppContext): Promise<Response> {
    const hoursBefore = parseInt(c.req.query('hoursBefore') ?? '24');

    const useCase = this.di.get<FindUpcomingDeadlinesUseCase>(
      TYPES.FindUpcomingDeadlinesUseCase
    );
    const cycles = await useCase.execute(hoursBefore);

    return c.json({ cycles }, HttpStatusCodes.OK);
  }

  async getNotSubmittedMembers(c: AppContext): Promise<Response> {
    const cycleId = parseInt(c.req.param('cycleId'));

    const useCase = this.di.get<FindSubmissionStatusUseCase>(
      TYPES.FindSubmissionStatusUseCase
    );

    try {
      const status = await useCase.execute(cycleId);

      return c.json(
        {
          cycleId: status.cycleId,
          week: parseInt(status.cycleName.split('-')[1]?.trim() || '0'),
          endDate: status.deadline.toISOString(),
          notSubmitted: status.notSubmitted,
          submittedCount: status.summary.submitted,
          totalMembers: status.summary.total,
        },
        HttpStatusCodes.OK
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return c.json({ error: 'Cycle not found' }, HttpStatusCodes.NOT_FOUND);
      }
      throw error;
    }
  }

  async sendReminderNotifications(c: AppContext): Promise<Response> {
    const hoursBefore = parseInt(c.req.query('hoursBefore') ?? '24');

    const findDeadlinesUseCase = this.di.get<FindUpcomingDeadlinesUseCase>(
      TYPES.FindUpcomingDeadlinesUseCase
    );
    const sendNotificationUseCase =
      this.di.get<SendReminderNotificationUseCase>(
        TYPES.SendReminderNotificationUseCase
      );

    const discordWebhookUrl =
      c.env.DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;

    if (!discordWebhookUrl) {
      return c.json(
        { error: 'DISCORD_WEBHOOK_URL not configured' },
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const upcomingDeadlines = await findDeadlinesUseCase.execute(hoursBefore);

    // Send notifications for each cycle
    for (const deadline of upcomingDeadlines) {
      await sendNotificationUseCase.execute(deadline.cycleId);
    }

    const result = upcomingDeadlines.map((deadline) => ({
      cycleId: deadline.cycleId,
      cycleName: deadline.cycleName,
    }));

    return c.json(
      {
        sent: result.length,
        cycles: result,
      },
      HttpStatusCodes.OK
    );
  }
}
