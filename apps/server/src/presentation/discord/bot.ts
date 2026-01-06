import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import { env } from '@/env';
import { createStatusMessage } from '@/infrastructure/external/discord';

// DDD Layer imports
import { GetCycleStatusQuery } from '@/application/queries';
import { DrizzleCycleRepository } from '@/infrastructure/persistence/drizzle/cycle.repository.impl';
import { DrizzleGenerationRepository } from '@/infrastructure/persistence/drizzle/generation.repository.impl';
import { DrizzleSubmissionRepository } from '@/infrastructure/persistence/drizzle/submission.repository.impl';
import { DrizzleMemberRepository } from '@/infrastructure/persistence/drizzle/member.repository.impl';
import { DrizzleOrganizationRepository } from '@/infrastructure/persistence/drizzle/organization.repository.impl';
import { DrizzleOrganizationMemberRepository } from '@/infrastructure/persistence/drizzle/organization-member.repository.impl';

// ========================================
// Repository & Query Instances
// ========================================

const cycleRepo = new DrizzleCycleRepository();
const generationRepo = new DrizzleGenerationRepository();
const submissionRepo = new DrizzleSubmissionRepository();
const memberRepo = new DrizzleMemberRepository();
const organizationRepo = new DrizzleOrganizationRepository();
const organizationMemberRepo = new DrizzleOrganizationMemberRepository();

const getCycleStatusQuery = new GetCycleStatusQuery(
  cycleRepo,
  generationRepo,
  organizationRepo,
  submissionRepo,
  organizationMemberRepo,
  memberRepo
);

// Discord Bot 클라이언트 생성
export const createDiscordBot = (): Client => {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  // 봇 준비 완료 시
  client.once('ready', () => {
    console.log(`✅ Discord Bot logged in as ${client.user?.tag}`);
  });

  // 슬래시 명령어 핸들러
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'check-submission') {
      await handleCheckSubmission(interaction);
    } else if (commandName === 'current-cycle') {
      await handleCurrentCycle(interaction);
    }
  });

  return client;
};

// 슬래시 명령어 등록
export const registerSlashCommands = async (): Promise<void> => {
  const commands = [
    new SlashCommandBuilder()
      .setName('check-submission')
      .setDescription('현재 활성화된 주차의 제출 현황을 확인합니다'),
    new SlashCommandBuilder()
      .setName('current-cycle')
      .setDescription('현재 진행 중인 주차 정보를 확인합니다'),
  ].map((command) => command.toJSON());

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
      // 길드 명령어로 등록 (즉시 반영)
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      });
      console.log(
        `✅ Successfully registered guild commands for server: ${guildId}`
      );
    } else {
      // 글로벌 명령어로 등록 (최대 1시간 소요)
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
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

// /current-cycle 명령어 핸들러
const handleCurrentCycle = async (
  interaction: ChatInputCommandInteraction
): Promise<void> => {
  await interaction.deferReply();

  try {
    const currentCycle =
      await getCycleStatusQuery.getCurrentCycle('dongueldonguel');

    if (!currentCycle) {
      await interaction.editReply({
        content: '❌ 현재 진행 중인 주차가 없습니다.',
      });
      return;
    }

    const daysUntilDeadline = currentCycle.daysLeft;

    await interaction.editReply({
      content: `📅 **현재 주차 정보**\n\n**기수**: ${currentCycle.generationName}\n**주차**: ${currentCycle.week}주차\n**마감일**: ${new Date(currentCycle.endDate).toLocaleDateString('ko-KR')} (${
        daysUntilDeadline > 0 ? `D-${daysUntilDeadline}` : '오늘 마감'
      })\n\n이슈 링크: ${currentCycle.githubIssueUrl}`,
    });
  } catch (error) {
    console.error('Error handling current-cycle command:', error);
    await interaction.editReply({
      content: '❌ 주차 정보 조회 중 오류가 발생했습니다.',
    });
  }
};

// /check-submission 명령어 핸들러
const handleCheckSubmission = async (
  interaction: ChatInputCommandInteraction
): Promise<void> => {
  // 응답 지연 (데이터 조회 시간 필요)
  await interaction.deferReply();

  try {
    // 현재 진행 중인 사이클 찾기
    const currentCycle =
      await getCycleStatusQuery.getCurrentCycle('dongueldonguel');

    if (!currentCycle) {
      await interaction.editReply({
        content: '❌ 현재 진행 중인 주차가 없습니다.',
      });
      return;
    }

    // 제출 현황 조회
    const participantNames = await getCycleStatusQuery.getCycleParticipantNames(
      currentCycle.id,
      'dongueldonguel'
    );

    if (!participantNames) {
      await interaction.editReply({
        content: '❌ 제출 현황 조회 중 오류가 발생했습니다.',
      });
      return;
    }

    // Discord 메시지 생성
    const discordMessage = createStatusMessage(
      participantNames.cycleName,
      participantNames.submittedNames,
      participantNames.notSubmittedNames,
      participantNames.endDate
    );

    // 응답 전송
    await interaction.editReply(discordMessage);
  } catch (error) {
    console.error('Error handling check-submission command:', error);
    await interaction.editReply({
      content: '❌ 제출 현황 조회 중 오류가 발생했습니다.',
    });
  }
};
