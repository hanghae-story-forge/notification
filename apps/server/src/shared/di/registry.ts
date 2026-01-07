/**
 * Dependency Registry
 *
 * Centralized registration of all project dependencies.
 * This file defines all the dependency bindings for the DI container.
 */

import { container, createToken } from './container';

// ========================================
// Imports (Types + Values)
// ========================================

import {
  CycleRepository,
  GenerationRepository,
  MemberRepository,
  OrganizationMemberRepository,
  OrganizationRepository,
  SubmissionRepository,
  SubmissionService,
  MemberService,
} from '@/domain';
import { IDiscordWebhookClient } from '@/infrastructure/external/discord';
import { RecordSubmissionCommand } from '@/application/commands/record-submission.command';
import { CreateCycleCommand } from '@/application/commands/create-cycle.command';
import { GetCycleStatusQuery } from '@/application/queries/get-cycle-status.query';
import { GetReminderTargetsQuery } from '@/application/queries/get-reminder-targets.query';
import { OrganizationAutocomplete } from '@/presentation/discord/autocompletions/OrganizationAutocomplete';
import { GenerationAutocomplete } from '@/presentation/discord/autocompletions/GenerationAutocomplete';

// Infrastructure implementations
import { DrizzleCycleRepository } from '@/infrastructure/persistence/drizzle/cycle.repository.impl';
import { DrizzleGenerationRepository } from '@/infrastructure/persistence/drizzle/generation.repository.impl';
import { DrizzleMemberRepository } from '@/infrastructure/persistence/drizzle/member.repository.impl';
import { DrizzleOrganizationMemberRepository } from '@/infrastructure/persistence/drizzle/organization-member.repository.impl';
import { DrizzleOrganizationRepository } from '@/infrastructure/persistence/drizzle/organization.repository.impl';
import { DrizzleSubmissionRepository } from '@/infrastructure/persistence/drizzle/submission.repository.impl';
import { DiscordWebhookClient } from '@/infrastructure/external/discord/discord.webhook';
import { MemberService as MemberServiceImpl } from '@/domain/member/member.service';

// ========================================
// Repository Tokens
// ========================================

export const CYCLE_REPO_TOKEN = createToken<CycleRepository>('CycleRepository');
export const GENERATION_REPO_TOKEN = createToken<GenerationRepository>(
  'GenerationRepository'
);
export const MEMBER_REPO_TOKEN =
  createToken<MemberRepository>('MemberRepository');
export const ORGANIZATION_MEMBER_REPO_TOKEN =
  createToken<OrganizationMemberRepository>('OrganizationMemberRepository');
export const ORGANIZATION_REPO_TOKEN = createToken<OrganizationRepository>(
  'OrganizationRepository'
);
export const SUBMISSION_REPO_TOKEN = createToken<SubmissionRepository>(
  'SubmissionRepository'
);

// ========================================
// Service Tokens
// ========================================

export const SUBMISSION_SERVICE_TOKEN =
  createToken<SubmissionService>('SubmissionService');
export const MEMBER_SERVICE_TOKEN = createToken<MemberService>('MemberService');

// ========================================
// External Service Tokens
// ========================================

export const DISCORD_WEBHOOK_CLIENT_TOKEN = createToken<IDiscordWebhookClient>(
  'DiscordWebhookClient'
);

// ========================================
// Application Layer Tokens (only for HTTP handlers & Discord bot)
// ========================================

export const RECORD_SUBMISSION_COMMAND_TOKEN =
  createToken<RecordSubmissionCommand>('RecordSubmissionCommand');
export const CREATE_CYCLE_COMMAND_TOKEN =
  createToken<CreateCycleCommand>('CreateCycleCommand');
export const GET_CYCLE_STATUS_QUERY_TOKEN = createToken<GetCycleStatusQuery>(
  'GetCycleStatusQuery'
);
export const GET_REMINDER_TARGETS_QUERY_TOKEN =
  createToken<GetReminderTargetsQuery>('GetReminderTargetsQuery');

// ========================================
// Discord Bot Tokens
// ========================================

export const ORGANIZATION_AUTOCOMPLETE_TOKEN =
  createToken<OrganizationAutocomplete>('OrganizationAutocomplete');
export const GENERATION_AUTOCOMPLETE_TOKEN =
  createToken<GenerationAutocomplete>('GenerationAutocomplete');

/**
 * Register all dependencies in the container
 * Call this once at application startup
 */
export function registerDependencies(): void {
  // ========================================
  // Repositories (Singletons)
  // ========================================

  container.register(
    CYCLE_REPO_TOKEN,
    () => new DrizzleCycleRepository(),
    'singleton'
  );
  container.register(
    GENERATION_REPO_TOKEN,
    () => new DrizzleGenerationRepository(),
    'singleton'
  );
  container.register(
    MEMBER_REPO_TOKEN,
    () => new DrizzleMemberRepository(),
    'singleton'
  );
  container.register(
    ORGANIZATION_MEMBER_REPO_TOKEN,
    () => new DrizzleOrganizationMemberRepository(),
    'singleton'
  );
  container.register(
    ORGANIZATION_REPO_TOKEN,
    () => new DrizzleOrganizationRepository(),
    'singleton'
  );
  container.register(
    SUBMISSION_REPO_TOKEN,
    () => new DrizzleSubmissionRepository(),
    'singleton'
  );

  // ========================================
  // Domain Services (Singletons)
  // ========================================

  container.register(
    SUBMISSION_SERVICE_TOKEN,
    () => new SubmissionService(container.resolve(SUBMISSION_REPO_TOKEN)),
    'singleton'
  );

  container.register(
    MEMBER_SERVICE_TOKEN,
    () => new MemberServiceImpl(container.resolve(MEMBER_REPO_TOKEN)),
    'singleton'
  );

  // ========================================
  // External Services (Singletons)
  // ========================================

  container.register(
    DISCORD_WEBHOOK_CLIENT_TOKEN,
    () => new DiscordWebhookClient(),
    'singleton'
  );

  // ========================================
  // Application Commands (Singletons)
  // ========================================

  container.register(
    RECORD_SUBMISSION_COMMAND_TOKEN,
    () =>
      new RecordSubmissionCommand(
        container.resolve(CYCLE_REPO_TOKEN),
        container.resolve(MEMBER_REPO_TOKEN),
        container.resolve(SUBMISSION_REPO_TOKEN),
        container.resolve(ORGANIZATION_MEMBER_REPO_TOKEN),
        container.resolve(GENERATION_REPO_TOKEN),
        container.resolve(SUBMISSION_SERVICE_TOKEN)
      ),
    'singleton'
  );

  container.register(
    CREATE_CYCLE_COMMAND_TOKEN,
    () =>
      new CreateCycleCommand(
        container.resolve(CYCLE_REPO_TOKEN),
        container.resolve(GENERATION_REPO_TOKEN),
        container.resolve(ORGANIZATION_REPO_TOKEN)
      ),
    'singleton'
  );

  // ========================================
  // Application Queries (Singletons) - only for HTTP handlers
  // ========================================

  container.register(
    GET_CYCLE_STATUS_QUERY_TOKEN,
    () =>
      new GetCycleStatusQuery(
        container.resolve(CYCLE_REPO_TOKEN),
        container.resolve(GENERATION_REPO_TOKEN),
        container.resolve(ORGANIZATION_REPO_TOKEN),
        container.resolve(SUBMISSION_REPO_TOKEN),
        container.resolve(ORGANIZATION_MEMBER_REPO_TOKEN),
        container.resolve(MEMBER_REPO_TOKEN)
      ),
    'singleton'
  );

  container.register(
    GET_REMINDER_TARGETS_QUERY_TOKEN,
    () =>
      new GetReminderTargetsQuery(
        container.resolve(CYCLE_REPO_TOKEN),
        container.resolve(GENERATION_REPO_TOKEN),
        container.resolve(ORGANIZATION_REPO_TOKEN),
        container.resolve(SUBMISSION_REPO_TOKEN),
        container.resolve(ORGANIZATION_MEMBER_REPO_TOKEN),
        container.resolve(MEMBER_REPO_TOKEN)
      ),
    'singleton'
  );

  // ========================================
  // Discord Autocompletes (Singletons)
  // ========================================

  container.register(
    ORGANIZATION_AUTOCOMPLETE_TOKEN,
    () =>
      new OrganizationAutocomplete(container.resolve(ORGANIZATION_REPO_TOKEN)),
    'singleton'
  );

  container.register(
    GENERATION_AUTOCOMPLETE_TOKEN,
    () => new GenerationAutocomplete(container.resolve(GENERATION_REPO_TOKEN)),
    'singleton'
  );
}

// Export container for convenience
export { container };
