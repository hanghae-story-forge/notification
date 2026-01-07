/**
 * DI System Entry Point
 *
 * Export everything needed for dependency injection
 */

export { container, createToken, Injectable } from './container';
export {
  registerDependencies,
  container as diContainer,
  // Repository Tokens
  CYCLE_REPO_TOKEN,
  GENERATION_REPO_TOKEN,
  MEMBER_REPO_TOKEN,
  ORGANIZATION_MEMBER_REPO_TOKEN,
  ORGANIZATION_REPO_TOKEN,
  SUBMISSION_REPO_TOKEN,
  // Service Tokens
  SUBMISSION_SERVICE_TOKEN,
  MEMBER_SERVICE_TOKEN,
  // External Service Tokens
  DISCORD_WEBHOOK_CLIENT_TOKEN,
  // Application Layer Tokens (only for HTTP handlers & Discord bot)
  RECORD_SUBMISSION_COMMAND_TOKEN,
  CREATE_CYCLE_COMMAND_TOKEN,
  GET_CYCLE_STATUS_QUERY_TOKEN,
  GET_REMINDER_TARGETS_QUERY_TOKEN,
  // Discord Bot Tokens
  ORGANIZATION_AUTOCOMPLETE_TOKEN,
  GENERATION_AUTOCOMPLETE_TOKEN,
} from './registry';
