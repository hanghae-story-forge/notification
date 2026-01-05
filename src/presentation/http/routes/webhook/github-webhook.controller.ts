import { Container } from 'inversify';
import type { AppContext } from '../../../../libs';
import { TYPES } from '../../../../di/tokens';
import { CreateSubmissionUseCase, HandleGitHubIssueCreatedUseCase } from '../../../../core/application/use-cases';
import * as HttpStatusCodes from 'stoker/http-status-codes';

export class GitHubWebhookController {
  constructor(private readonly di: Container) {}

  async handleIssueComment(c: AppContext): Promise<Response> {
    try {
      const payload = await c.req.json();

      const useCase = this.di.get<CreateSubmissionUseCase>(TYPES.CreateSubmissionUseCase);
      await useCase.execute({ commentData: payload });

      return c.json({ message: 'Submission recorded' }, HttpStatusCodes.OK);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return c.json({ message: error.message }, HttpStatusCodes.NOT_FOUND);
        }
      }
      throw error;
    }
  }

  async handleIssueCreated(c: AppContext): Promise<Response> {
    try {
      const payload = await c.req.json();

      const useCase = this.di.get<HandleGitHubIssueCreatedUseCase>(
        TYPES.HandleGitHubIssueCreatedUseCase
      );
      const result = await useCase.execute({ issueData: payload });

      return c.json(
        {
          message: 'Cycle created',
          cycle: result,
        },
        HttpStatusCodes.CREATED
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return c.json({ message: error.message }, HttpStatusCodes.NOT_FOUND);
        }
      }
      throw error;
    }
  }

  async handleUnknownEvent(c: AppContext): Promise<Response> {
    const githubEvent = c.req.header('x-github-event');
    return c.json(
      { message: `Unhandled event: ${githubEvent}` },
      HttpStatusCodes.OK
    );
  }
}
