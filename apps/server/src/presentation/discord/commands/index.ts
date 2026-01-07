import { REST, Routes } from 'discord.js';
import { env } from '@/env';
import { DiscordCommand } from './types';
import { CheckSubmissionCommand } from './CheckSubmissionCommand';
import { CurrentCycleCommand } from './CurrentCycleCommand';
import { CreateMemberCommand } from './CreateMemberCommand';
import { CreateOrganizationCommand } from './CreateOrganizationCommand';
import { ListOrganizationsCommand } from './ListOrganizationsCommand';
import { GetCycleStatusQuery } from '@/application/queries';
import {
  CreateMemberCommand as AppCreateMemberCommand,
  CreateOrganizationCommand as AppCreateOrganizationCommand,
} from '@/application/commands';
import { DrizzleCycleRepository } from '@/infrastructure/persistence/drizzle/cycle.repository.impl';
import { DrizzleGenerationRepository } from '@/infrastructure/persistence/drizzle/generation.repository.impl';
import { DrizzleSubmissionRepository } from '@/infrastructure/persistence/drizzle/submission.repository.impl';
import { DrizzleMemberRepository } from '@/infrastructure/persistence/drizzle/member.repository.impl';
import { DrizzleOrganizationRepository } from '@/infrastructure/persistence/drizzle/organization.repository.impl';
import { DrizzleOrganizationMemberRepository } from '@/infrastructure/persistence/drizzle/organization-member.repository.impl';
import { MemberService } from '@/domain/member/member.service';

// Repository instances
const cycleRepo = new DrizzleCycleRepository();
const generationRepo = new DrizzleGenerationRepository();
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
    new CheckSubmissionCommand(getCycleStatusQuery),
    new CurrentCycleCommand(getCycleStatusQuery),
    new CreateMemberCommand(createMemberCommand, memberRepo),
    new CreateOrganizationCommand(createOrganizationCommand),
    new ListOrganizationsCommand(organizationRepo),
  ];
};

export const registerSlashCommands = async (
  commands: DiscordCommand[]
): Promise<void> => {
  const commandDefinitions = commands.map((cmd) => cmd.definition.toJSON());

  const botToken = env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    throw new Error('DISCORD_BOT_TOKEN is not set');
  }

  const rest = new REST({ version: '10' }).setToken(botToken);

  try {
    console.log('🔄 Started refreshing application (/) commands.');

    const clientId = env.DISCORD_CLIENT_ID;
    if (!clientId) {
      throw new Error('DISCORD_CLIENT_ID is not set');
    }

    const guildId = env.DISCORD_GUILD_ID;

    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commandDefinitions,
      });
      console.log(
        `✅ Successfully registered guild commands for server: ${guildId}`
      );
    } else {
      await rest.put(Routes.applicationCommands(clientId), {
        body: commandDefinitions,
      });
      console.log(
        '✅ Successfully registered global commands (may take up to 1 hour to propagate)'
      );
    }

    console.log('✅ Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('❌ Error registering slash commands:', error);
    throw error;
  }
};
