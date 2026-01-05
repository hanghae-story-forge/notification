import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from './tokens';

// Repositories
import {
  DrizzleMemberRepository,
  DrizzleCycleRepository,
  DrizzleSubmissionRepository,
  DrizzleGenerationRepository,
} from '@/infrastructure/persistence/drizzle/repositories';

// Services
import { DiscordNotificationService } from '@/infrastructure/external-services/discord/discord-notification.service';
import { GitHubWebhookParserService } from '@/infrastructure/external-services/github/github-webhook-parser.service';

// Use Cases
import {
  CreateSubmissionUseCase,
  FindSubmissionStatusUseCase,
  FindUpcomingDeadlinesUseCase,
  HandleGitHubIssueCreatedUseCase,
  SendReminderNotificationUseCase,
} from '@/core/application/use-cases';

// Interfaces
import type { IMemberRepository } from '@/core/domain/member';
import type { ICycleRepository } from '@/core/domain/cycle';
import type { ISubmissionRepository } from '@/core/domain/submission';
import type { IGenerationRepository } from '@/core/domain/generation';
import type {
  INotificationService,
  IGitHubParserService,
} from '@/core/application/ports/services';

export function createDIContainer(discordWebhookUrl?: string) {
  const container = new Container({ defaultScope: 'Singleton' });

  // Repositories
  container
    .bind<IMemberRepository>(TYPES.MemberRepository)
    .to(DrizzleMemberRepository);
  container
    .bind<ICycleRepository>(TYPES.CycleRepository)
    .to(DrizzleCycleRepository);
  container
    .bind<ISubmissionRepository>(TYPES.SubmissionRepository)
    .to(DrizzleSubmissionRepository);
  container
    .bind<IGenerationRepository>(TYPES.GenerationRepository)
    .to(DrizzleGenerationRepository);

  // External Services
  if (discordWebhookUrl) {
    container
      .bind<INotificationService>(TYPES.NotificationService)
      .toConstantValue(new DiscordNotificationService(discordWebhookUrl));
  }
  container
    .bind<IGitHubParserService>(TYPES.GitHubParserService)
    .to(GitHubWebhookParserService);

  // Use Cases
  container
    .bind<CreateSubmissionUseCase>(TYPES.CreateSubmissionUseCase)
    .to(CreateSubmissionUseCase);
  container
    .bind<FindSubmissionStatusUseCase>(TYPES.FindSubmissionStatusUseCase)
    .to(FindSubmissionStatusUseCase);
  container
    .bind<FindUpcomingDeadlinesUseCase>(TYPES.FindUpcomingDeadlinesUseCase)
    .to(FindUpcomingDeadlinesUseCase);
  container
    .bind<HandleGitHubIssueCreatedUseCase>(
      TYPES.HandleGitHubIssueCreatedUseCase
    )
    .to(HandleGitHubIssueCreatedUseCase);
  container
    .bind<SendReminderNotificationUseCase>(
      TYPES.SendReminderNotificationUseCase
    )
    .to(SendReminderNotificationUseCase);

  return container;
}
