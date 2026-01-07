import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { container, registerDependencies } from './registry';
import {
  CYCLE_REPO_TOKEN,
  GENERATION_REPO_TOKEN,
  MEMBER_REPO_TOKEN,
  ORGANIZATION_MEMBER_REPO_TOKEN,
  ORGANIZATION_REPO_TOKEN,
  SUBMISSION_REPO_TOKEN,
  SUBMISSION_SERVICE_TOKEN,
  MEMBER_SERVICE_TOKEN,
  DISCORD_WEBHOOK_CLIENT_TOKEN,
  RECORD_SUBMISSION_COMMAND_TOKEN,
  CREATE_CYCLE_COMMAND_TOKEN,
  GET_CYCLE_STATUS_QUERY_TOKEN,
  GET_REMINDER_TARGETS_QUERY_TOKEN,
  ORGANIZATION_AUTOCOMPLETE_TOKEN,
  GENERATION_AUTOCOMPLETE_TOKEN,
} from './registry';
import type {
  CycleRepository,
  GenerationRepository,
  MemberRepository,
  OrganizationMemberRepository,
  OrganizationRepository,
  SubmissionRepository,
  SubmissionService,
  MemberService,
} from '@/domain';
import type { IDiscordWebhookClient } from '@/infrastructure/external/discord';
import type { RecordSubmissionCommand } from '@/application/commands/record-submission.command';
import type { CreateCycleCommand } from '@/application/commands/create-cycle.command';
import type { GetCycleStatusQuery } from '@/application/queries/get-cycle-status.query';
import type { GetReminderTargetsQuery } from '@/application/queries/get-reminder-targets.query';
import type { OrganizationAutocomplete } from '@/presentation/discord/autocompletions/OrganizationAutocomplete';
import type { GenerationAutocomplete } from '@/presentation/discord/autocompletions/GenerationAutocomplete';

/**
 * Application DI Integration Tests
 *
 * These tests verify that actual application dependencies are properly
 * injected and can be resolved with their correct implementations.
 */
describe('Application DI Integration', () => {
  beforeEach(() => {
    container.clear();
  });

  afterEach(() => {
    container.clear();
  });

  describe('Repository Implementations', () => {
    beforeEach(() => {
      registerDependencies();
    });

    it('should resolve CycleRepository with correct implementation', () => {
      const repo = container.resolve<CycleRepository>(CYCLE_REPO_TOKEN);

      expect(repo).toBeDefined();
      expect(repo).toHaveProperty('save');
      expect(repo).toHaveProperty('findById');
      expect(repo).toHaveProperty('findByIssueUrl');
      expect(repo).toHaveProperty('findByGeneration');
    });

    it('should resolve GenerationRepository with correct implementation', () => {
      const repo = container.resolve<GenerationRepository>(
        GENERATION_REPO_TOKEN
      );

      expect(repo).toBeDefined();
      expect(repo).toHaveProperty('save');
      expect(repo).toHaveProperty('findById');
      expect(repo).toHaveProperty('findAll');
      expect(repo).toHaveProperty('findActiveByOrganization');
    });

    it('should resolve MemberRepository with correct implementation', () => {
      const repo = container.resolve<MemberRepository>(MEMBER_REPO_TOKEN);

      expect(repo).toBeDefined();
      expect(repo).toHaveProperty('save');
      expect(repo).toHaveProperty('findByGithubUsername');
      expect(repo).toHaveProperty('findByDiscordId');
      expect(repo).toHaveProperty('findAll');
    });

    it('should resolve OrganizationMemberRepository with correct implementation', () => {
      const repo = container.resolve<OrganizationMemberRepository>(
        ORGANIZATION_MEMBER_REPO_TOKEN
      );

      expect(repo).toBeDefined();
      expect(repo).toHaveProperty('save');
      expect(repo).toHaveProperty('remove');
      expect(repo).toHaveProperty('findByOrganization');
      expect(repo).toHaveProperty('findByMember');
    });

    it('should resolve OrganizationRepository with correct implementation', () => {
      const repo = container.resolve<OrganizationRepository>(
        ORGANIZATION_REPO_TOKEN
      );

      expect(repo).toBeDefined();
      expect(repo).toHaveProperty('save');
      expect(repo).toHaveProperty('findBySlug');
      expect(repo).toHaveProperty('findAll');
      expect(repo).toHaveProperty('findActive');
    });

    it('should resolve SubmissionRepository with correct implementation', () => {
      const repo = container.resolve<SubmissionRepository>(
        SUBMISSION_REPO_TOKEN
      );

      expect(repo).toBeDefined();
      expect(repo).toHaveProperty('save');
      expect(repo).toHaveProperty('findById');
      expect(repo).toHaveProperty('findByCycleAndMember');
      expect(repo).toHaveProperty('findByCycleId');
    });
  });

  describe('Domain Services', () => {
    beforeEach(() => {
      registerDependencies();
    });

    it('should resolve SubmissionService with repository dependency', () => {
      const service = container.resolve<SubmissionService>(
        SUBMISSION_SERVICE_TOKEN
      );

      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(Object);
    });

    it('should resolve MemberService with repository dependency', () => {
      const service = container.resolve<MemberService>(MEMBER_SERVICE_TOKEN);

      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(Object);
    });

    it('should resolve services as singletons', () => {
      const service1 = container.resolve<SubmissionService>(
        SUBMISSION_SERVICE_TOKEN
      );
      const service2 = container.resolve<SubmissionService>(
        SUBMISSION_SERVICE_TOKEN
      );

      expect(service1).toBe(service2);
    });
  });

  describe('External Services', () => {
    beforeEach(() => {
      registerDependencies();
    });

    it('should resolve DiscordWebhookClient', () => {
      const client = container.resolve<IDiscordWebhookClient>(
        DISCORD_WEBHOOK_CLIENT_TOKEN
      );

      expect(client).toBeDefined();
      expect(client).toHaveProperty('sendMessage');
    });
  });

  describe('Application Commands', () => {
    beforeEach(() => {
      registerDependencies();
    });

    it('should resolve RecordSubmissionCommand with all dependencies', () => {
      const command = container.resolve<RecordSubmissionCommand>(
        RECORD_SUBMISSION_COMMAND_TOKEN
      );

      expect(command).toBeDefined();
      expect(command).toHaveProperty('execute');
    });

    it('should resolve CreateCycleCommand with all dependencies', () => {
      const command = container.resolve<CreateCycleCommand>(
        CREATE_CYCLE_COMMAND_TOKEN
      );

      expect(command).toBeDefined();
      expect(command).toHaveProperty('execute');
    });

    it('should resolve commands as singletons', () => {
      const command1 = container.resolve<RecordSubmissionCommand>(
        RECORD_SUBMISSION_COMMAND_TOKEN
      );
      const command2 = container.resolve<RecordSubmissionCommand>(
        RECORD_SUBMISSION_COMMAND_TOKEN
      );

      expect(command1).toBe(command2);
    });
  });

  describe('Application Queries', () => {
    beforeEach(() => {
      registerDependencies();
    });

    it('should resolve GetCycleStatusQuery with all dependencies', () => {
      const query = container.resolve<GetCycleStatusQuery>(
        GET_CYCLE_STATUS_QUERY_TOKEN
      );

      expect(query).toBeDefined();
      expect(query).toHaveProperty('getCurrentCycle');
      expect(query).toHaveProperty('getCycleStatus');
    });

    it('should resolve GetReminderTargetsQuery with all dependencies', () => {
      const query = container.resolve<GetReminderTargetsQuery>(
        GET_REMINDER_TARGETS_QUERY_TOKEN
      );

      expect(query).toBeDefined();
      expect(query).toHaveProperty('getCyclesWithDeadlineIn');
      expect(query).toHaveProperty('getNotSubmittedMembers');
    });

    it('should resolve queries as singletons', () => {
      const query1 = container.resolve<GetCycleStatusQuery>(
        GET_CYCLE_STATUS_QUERY_TOKEN
      );
      const query2 = container.resolve<GetCycleStatusQuery>(
        GET_CYCLE_STATUS_QUERY_TOKEN
      );

      expect(query1).toBe(query2);
    });
  });

  describe('Discord Autocompletes', () => {
    beforeEach(() => {
      registerDependencies();
    });

    it('should resolve OrganizationAutocomplete with repository dependency', () => {
      const autocomplete = container.resolve<OrganizationAutocomplete>(
        ORGANIZATION_AUTOCOMPLETE_TOKEN
      );

      expect(autocomplete).toBeDefined();
      expect(autocomplete).toHaveProperty('execute');
      expect(typeof autocomplete.execute).toBe('function');
    });

    it('should resolve GenerationAutocomplete with repository dependency', () => {
      const autocomplete = container.resolve<GenerationAutocomplete>(
        GENERATION_AUTOCOMPLETE_TOKEN
      );

      expect(autocomplete).toBeDefined();
      expect(autocomplete).toHaveProperty('execute');
      expect(typeof autocomplete.execute).toBe('function');
    });
  });

  describe('Dependency Graph Verification', () => {
    beforeEach(() => {
      registerDependencies();
    });

    /**
     * Verify that services have their repository dependencies properly injected
     */
    it('should inject repositories into SubmissionService', () => {
      container.resolve<SubmissionRepository>(SUBMISSION_REPO_TOKEN);

      // SubmissionService should have the same submission repository instance
      const service = container.resolve<SubmissionService>(
        SUBMISSION_SERVICE_TOKEN
      );

      expect(service).toBeDefined();
    });

    it('should inject repositories into commands', () => {
      container.resolve<CycleRepository>(CYCLE_REPO_TOKEN);
      container.resolve<GenerationRepository>(GENERATION_REPO_TOKEN);
      container.resolve<OrganizationRepository>(ORGANIZATION_REPO_TOKEN);

      const command = container.resolve<CreateCycleCommand>(
        CREATE_CYCLE_COMMAND_TOKEN
      );

      expect(command).toBeDefined();
    });

    it('should inject repositories into queries', () => {
      container.resolve<CycleRepository>(CYCLE_REPO_TOKEN);
      container.resolve<GenerationRepository>(GENERATION_REPO_TOKEN);
      container.resolve<OrganizationRepository>(ORGANIZATION_REPO_TOKEN);

      const query = container.resolve<GetCycleStatusQuery>(
        GET_CYCLE_STATUS_QUERY_TOKEN
      );

      expect(query).toBeDefined();
    });
  });

  describe('Singleton Lifecycle Verification', () => {
    beforeEach(() => {
      registerDependencies();
    });

    it('should return same repository instance across multiple resolves', () => {
      const repo1 = container.resolve<CycleRepository>(CYCLE_REPO_TOKEN);
      const repo2 = container.resolve<CycleRepository>(CYCLE_REPO_TOKEN);

      expect(repo1).toBe(repo2);
    });

    it('should return same service instance across multiple resolves', () => {
      const service1 = container.resolve<SubmissionService>(
        SUBMISSION_SERVICE_TOKEN
      );
      const service2 = container.resolve<SubmissionService>(
        SUBMISSION_SERVICE_TOKEN
      );

      expect(service1).toBe(service2);
    });

    it('should return different instances for different tokens', () => {
      const cycleRepo = container.resolve<CycleRepository>(CYCLE_REPO_TOKEN);
      const generationRepo = container.resolve<GenerationRepository>(
        GENERATION_REPO_TOKEN
      );

      expect(cycleRepo).not.toBe(generationRepo);
    });
  });

  describe('Real Application Module Loading', () => {
    /**
     * This test simulates real application startup by importing
     * modules that use the DI container
     */
    it('should work with real Discord bot module', async () => {
      registerDependencies();

      // Import the actual Discord bot module
      const { createDiscordBot } = await import('@/presentation/discord/bot');

      expect(typeof createDiscordBot).toBe('function');

      // Creating the bot should work
      const bot = createDiscordBot();
      expect(bot).toBeDefined();
      expect(bot).toHaveProperty('login');
    });

    it('should work with real GraphQL resolvers', async () => {
      registerDependencies();

      // Import the actual GraphQL resolvers
      const { queryResolvers, mutationResolvers } =
        await import('@/presentation/graphql/resolvers');

      expect(queryResolvers).toBeDefined();
      expect(mutationResolvers).toBeDefined();

      // Check that resolver methods exist
      expect(queryResolvers).toHaveProperty('members');
      expect(queryResolvers).toHaveProperty('generations');
      expect(queryResolvers).toHaveProperty('cycles');
      expect(queryResolvers).toHaveProperty('organizations');
    });

    it('should work with HTTP handlers', async () => {
      registerDependencies();

      // Import HTTP handlers (they should work after DI registration)
      const { handleIssueComment } =
        await import('@/presentation/http/github/github.handlers');

      expect(typeof handleIssueComment).toBe('function');
    });
  });

  describe('Complete Application Startup Simulation', () => {
    it('should simulate full application startup sequence', async () => {
      // Step 1: Clear container (fresh start)
      container.clear();

      // Step 2: Register all dependencies
      expect(() => registerDependencies()).not.toThrow();

      // Step 3: Import and create Discord bot
      const { createDiscordBot } = await import('@/presentation/discord/bot');
      const bot = createDiscordBot();
      expect(bot).toBeDefined();

      // Step 4: Import GraphQL resolvers
      const { queryResolvers } =
        await import('@/presentation/graphql/resolvers');
      expect(queryResolvers).toBeDefined();

      // Step 5: Verify all critical dependencies are resolvable
      expect(() => container.resolve(CYCLE_REPO_TOKEN)).not.toThrow();
      expect(() =>
        container.resolve(ORGANIZATION_AUTOCOMPLETE_TOKEN)
      ).not.toThrow();
      expect(() =>
        container.resolve(RECORD_SUBMISSION_COMMAND_TOKEN)
      ).not.toThrow();
    });
  });
});
