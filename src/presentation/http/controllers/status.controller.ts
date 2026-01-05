import { Container } from 'inversify';
import type { AppContext } from '@/libs';
import { TYPES } from '@/di/tokens';
import { FindSubmissionStatusUseCase } from '@core/application/use-cases';
import { createStatusMessage } from '@infrastructure/external-services/discord/discord-notification.service';
import * as HttpStatusCodes from 'stoker/http-status-codes';

export class StatusController {
  constructor(private readonly di: Container) {}

  async getStatus(c: AppContext): Promise<Response> {
    const cycleId = parseInt(c.req.param('cycleId'));

    const useCase = this.di.get<FindSubmissionStatusUseCase>(
      TYPES.FindSubmissionStatusUseCase
    );

    try {
      const status = await useCase.execute(cycleId);

      return c.json(
        {
          cycle: {
            id: status.cycleId,
            week: parseInt(status.cycleName.split('-')[1]?.trim() || '0'),
            startDate: status.deadline.toISOString(),
            endDate: status.deadline.toISOString(),
            generationName: status.cycleName.split('-')[0]?.trim() || '',
          },
          summary: status.summary,
          submitted: status.submitted,
          notSubmitted: status.notSubmitted,
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

  async getStatusDiscord(c: AppContext): Promise<Response> {
    const cycleId = parseInt(c.req.param('cycleId'));

    const useCase = this.di.get<FindSubmissionStatusUseCase>(
      TYPES.FindSubmissionStatusUseCase
    );

    try {
      const status = await useCase.execute(cycleId);

      const submittedNames = status.submitted.map((s) => s.memberName);
      const notSubmittedNames = status.notSubmitted.map((m) => m.memberName);

      const discordMessage = createStatusMessage(
        status.cycleName,
        submittedNames,
        notSubmittedNames,
        status.deadline
      );

      return c.json(discordMessage, HttpStatusCodes.OK);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return c.json({ error: 'Cycle not found' }, HttpStatusCodes.NOT_FOUND);
      }
      throw error;
    }
  }
}
