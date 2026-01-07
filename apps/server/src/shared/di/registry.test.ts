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

/**
 * Integration tests for the Dependency Injection Registry
 *
 * These tests ensure that:
 * 1. All dependencies are properly registered
 * 2. Dependencies can be resolved in any order
 * 3. No module-level resolution happens before registration
 */
describe('DI Registry Integration', () => {
  beforeEach(() => {
    // Clear container before each test to ensure isolation
    container.clear();
  });

  afterEach(() => {
    // Clean up after each test
    container.clear();
  });

  describe('Dependency Registration', () => {
    it('should register all repository tokens', () => {
      registerDependencies();

      expect(container.has(CYCLE_REPO_TOKEN)).toBe(true);
      expect(container.has(GENERATION_REPO_TOKEN)).toBe(true);
      expect(container.has(MEMBER_REPO_TOKEN)).toBe(true);
      expect(container.has(ORGANIZATION_MEMBER_REPO_TOKEN)).toBe(true);
      expect(container.has(ORGANIZATION_REPO_TOKEN)).toBe(true);
      expect(container.has(SUBMISSION_REPO_TOKEN)).toBe(true);
    });

    it('should register all service tokens', () => {
      registerDependencies();

      expect(container.has(SUBMISSION_SERVICE_TOKEN)).toBe(true);
      expect(container.has(MEMBER_SERVICE_TOKEN)).toBe(true);
      expect(container.has(DISCORD_WEBHOOK_CLIENT_TOKEN)).toBe(true);
    });

    it('should register all application command tokens', () => {
      registerDependencies();

      expect(container.has(RECORD_SUBMISSION_COMMAND_TOKEN)).toBe(true);
      expect(container.has(CREATE_CYCLE_COMMAND_TOKEN)).toBe(true);
    });

    it('should register all application query tokens', () => {
      registerDependencies();

      expect(container.has(GET_CYCLE_STATUS_QUERY_TOKEN)).toBe(true);
      expect(container.has(GET_REMINDER_TARGETS_QUERY_TOKEN)).toBe(true);
    });

    it('should register all Discord autocomplete tokens', () => {
      registerDependencies();

      expect(container.has(ORGANIZATION_AUTOCOMPLETE_TOKEN)).toBe(true);
      expect(container.has(GENERATION_AUTOCOMPLETE_TOKEN)).toBe(true);
    });
  });

  describe('Dependency Resolution', () => {
    beforeEach(() => {
      registerDependencies();
    });

    it('should resolve all repository tokens without errors', () => {
      expect(() => container.resolve(CYCLE_REPO_TOKEN)).not.toThrow();
      expect(() => container.resolve(GENERATION_REPO_TOKEN)).not.toThrow();
      expect(() => container.resolve(MEMBER_REPO_TOKEN)).not.toThrow();
      expect(() =>
        container.resolve(ORGANIZATION_MEMBER_REPO_TOKEN)
      ).not.toThrow();
      expect(() => container.resolve(ORGANIZATION_REPO_TOKEN)).not.toThrow();
      expect(() => container.resolve(SUBMISSION_REPO_TOKEN)).not.toThrow();
    });

    it('should resolve all service tokens without errors', () => {
      expect(() => container.resolve(SUBMISSION_SERVICE_TOKEN)).not.toThrow();
      expect(() => container.resolve(MEMBER_SERVICE_TOKEN)).not.toThrow();
      expect(() =>
        container.resolve(DISCORD_WEBHOOK_CLIENT_TOKEN)
      ).not.toThrow();
    });

    it('should resolve all command tokens without errors', () => {
      expect(() =>
        container.resolve(RECORD_SUBMISSION_COMMAND_TOKEN)
      ).not.toThrow();
      expect(() => container.resolve(CREATE_CYCLE_COMMAND_TOKEN)).not.toThrow();
    });

    it('should resolve all query tokens without errors', () => {
      expect(() =>
        container.resolve(GET_CYCLE_STATUS_QUERY_TOKEN)
      ).not.toThrow();
      expect(() =>
        container.resolve(GET_REMINDER_TARGETS_QUERY_TOKEN)
      ).not.toThrow();
    });

    it('should resolve all Discord autocomplete tokens without errors', () => {
      expect(() =>
        container.resolve(ORGANIZATION_AUTOCOMPLETE_TOKEN)
      ).not.toThrow();
      expect(() =>
        container.resolve(GENERATION_AUTOCOMPLETE_TOKEN)
      ).not.toThrow();
    });

    it('should return singleton instances for repeated resolutions', () => {
      const instance1 = container.resolve(CYCLE_REPO_TOKEN);
      const instance2 = container.resolve(CYCLE_REPO_TOKEN);

      expect(instance1).toBe(instance2);
    });
  });

  describe('Module Import Order Safety', () => {
    /**
     * This test simulates the scenario where modules are imported
     * before registerDependencies() is called.
     *
     * The key is that NO module-level code should call container.resolve()
     * directly - all resolution should happen through getter functions or
     * inside functions/methods that are called AFTER registration.
     */
    it('should allow importing modules before registration', async () => {
      // Clear the container
      container.clear();

      // Import the Discord bot module (which has lazy getters)
      // This should NOT throw an error because it uses getter functions
      const { createDiscordBot } = await import('@/presentation/discord/bot');

      // Now register dependencies
      registerDependencies();

      // Creating the bot should work because the actual resolution happens
      // when the bot is used, not when the module is imported
      expect(() => createDiscordBot()).not.toThrow();
    });

    it('should fail when resolving before registration', () => {
      // Clear the container
      container.clear();

      // Trying to resolve without registering should fail
      expect(() => container.resolve(ORGANIZATION_AUTOCOMPLETE_TOKEN)).toThrow(
        'Dependency not found'
      );
    });

    it('should succeed when resolving after registration', () => {
      // Clear the container
      container.clear();

      // Register dependencies
      registerDependencies();

      // Now resolution should work
      expect(() =>
        container.resolve(ORGANIZATION_AUTOCOMPLETE_TOKEN)
      ).not.toThrow();
    });
  });

  describe('GraphQL Resolvers', () => {
    beforeEach(() => {
      registerDependencies();
    });

    /**
     * Ensure that GraphQL resolvers can resolve their dependencies
     * after registration
     */
    it('should allow GraphQL resolvers to work after registration', async () => {
      // Import GraphQL resolvers
      const { queryResolvers, mutationResolvers } =
        await import('@/presentation/graphql/resolvers');

      // The resolvers should be defined
      expect(queryResolvers).toBeDefined();
      expect(mutationResolvers).toBeDefined();

      // Verify that the resolvers have the expected structure
      expect(queryResolvers).toHaveProperty('members');
      expect(queryResolvers).toHaveProperty('generations');
      expect(queryResolvers).toHaveProperty('cycles');
      expect(queryResolvers).toHaveProperty('organizations');
    });
  });

  describe('All Registered Dependencies', () => {
    beforeEach(() => {
      registerDependencies();
    });

    /**
     * Comprehensive test to ensure all tokens are registered
     * and can be resolved
     */
    it('should resolve all registered tokens', () => {
      const allTokens = [
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
      ];

      for (const token of allTokens) {
        expect(() => container.resolve(token)).not.toThrow();
      }
    });
  });
});
