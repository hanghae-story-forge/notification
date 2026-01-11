import { REST, Routes } from 'discord.js';
import { env } from '@/env';
import { DiscordCommand } from './types';
import { logger } from '@/infrastructure/lib/logger';
import { CycleCommand } from './CycleCommand';
import { MemberCommand } from './MemberCommand';
import { OrganizationCommand } from './OrganizationCommand';
import { GenerationCommand } from './GenerationCommand';
import { MeCommand } from './MeCommand';
import { GetCycleStatusQuery } from '@/application/queries';
import {
  CreateMemberCommand as AppCreateMemberCommand,
  CreateOrganizationCommand as AppCreateOrganizationCommand,
  JoinOrganizationCommand as AppJoinOrganizationCommand,
  UpdateMemberStatusCommand,
  JoinGenerationCommand as AppJoinGenerationCommand,
} from '@/application/commands';
import { DrizzleCycleRepository } from '@/infrastructure/persistence/drizzle/cycle.repository.impl';
import { DrizzleGenerationRepository } from '@/infrastructure/persistence/drizzle/generation.repository.impl';
import { DrizzleGenerationMemberRepository } from '@/infrastructure/persistence/drizzle/generation-member.repository.impl';
import { DrizzleSubmissionRepository } from '@/infrastructure/persistence/drizzle/submission.repository.impl';
import { DrizzleMemberRepository } from '@/infrastructure/persistence/drizzle/member.repository.impl';
import { DrizzleOrganizationRepository } from '@/infrastructure/persistence/drizzle/organization.repository.impl';
import { DrizzleOrganizationMemberRepository } from '@/infrastructure/persistence/drizzle/organization-member.repository.impl';
import { MemberService } from '@/domain/member/member.service';

// Repository instances
const cycleRepo = new DrizzleCycleRepository();
const generationRepo = new DrizzleGenerationRepository();
const generationMemberRepo = new DrizzleGenerationMemberRepository();
const submissionRepo = new DrizzleSubmissionRepository();
const memberRepo = new DrizzleMemberRepository();
const organizationRepo = new DrizzleOrganizationRepository();
const organizationMemberRepo = new DrizzleOrganizationMemberRepository();

// Application layer instances
const memberService = new MemberService(memberRepo);
const createMemberCommand = new AppCreateMemberCommand(
  memberRepo,
  memberService
);
const createOrganizationCommand = new AppCreateOrganizationCommand(
  organizationRepo
);
const joinOrganizationCommand = new AppJoinOrganizationCommand(
  organizationRepo,
  memberRepo,
  organizationMemberRepo
);
const updateMemberStatusCommand = new UpdateMemberStatusCommand(
  organizationRepo,
  organizationMemberRepo
);
const joinGenerationCommand = new AppJoinGenerationCommand(
  generationRepo,
  memberRepo,
  organizationRepo,
  organizationMemberRepo,
  generationMemberRepo
);

const getCycleStatusQuery = new GetCycleStatusQuery(
  cycleRepo,
  generationRepo,
  organizationRepo,
  submissionRepo,
  organizationMemberRepo,
  memberRepo
);

// Command instances
export const createCommands = (): DiscordCommand[] => {
  return [
    new MeCommand(memberRepo, organizationMemberRepo, generationMemberRepo),
    new MemberCommand(
      createMemberCommand,
      updateMemberStatusCommand,
      memberRepo,
      organizationRepo
    ),
    new OrganizationCommand(
      createOrganizationCommand,
      joinOrganizationCommand,
      organizationRepo
    ),
    new GenerationCommand(
      joinGenerationCommand,
      memberRepo,
      generationRepo,
      organizationRepo,
      generationMemberRepo,
      cycleRepo
    ),
    new CycleCommand(getCycleStatusQuery),
  ];
};

export const registerSlashCommands = async (
  commands: DiscordCommand[]
): Promise<void> => {
  const startTime = Date.now();
  const commandDefinitions = commands.map((cmd) => cmd.definition.toJSON());
  const commandNames = commands.map((cmd) => cmd.definition.toJSON().name);

  logger.discord.info('Registering slash commands', {
    count: commands.length,
    commands: commandNames,
  });

  const botToken = env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    logger.discord.error('DISCORD_BOT_TOKEN is not set');
    throw new Error('DISCORD_BOT_TOKEN is not set');
  }

  const rest = new REST({ version: '10' }).setToken(botToken);

  try {
    const clientId = env.DISCORD_CLIENT_ID;
    if (!clientId) {
      logger.discord.error('DISCORD_CLIENT_ID is not set');
      throw new Error('DISCORD_CLIENT_ID is not set');
    }

    const guildId = env.DISCORD_GUILD_ID;

    if (guildId) {
      logger.discord.info('Registering guild commands', { guildId });
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commandDefinitions,
      });
      logger.discord.info('Successfully registered guild commands', {
        guildId,
        duration: `${Date.now() - startTime}ms`,
      });
    } else {
      logger.discord.info('Registering global commands');
      await rest.put(Routes.applicationCommands(clientId), {
        body: commandDefinitions,
      });
      logger.discord.warn(
        'Registered global commands (may take up to 1 hour to propagate)',
        { duration: `${Date.now() - startTime}ms` }
      );
    }
  } catch (error) {
    logger.discord.error('Failed to register slash commands', error, {
      commandCount: commands.length,
    });
    throw error;
  }
};
