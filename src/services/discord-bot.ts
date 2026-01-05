import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import { env } from '@/env';
import { db } from '@/lib/db';
import { cycles, generations, members, submissions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { createStatusMessage } from '@/services/discord';

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
  ].map((command) => command.toJSON());

  const rest = new REST({ version: '10' }).setToken(env.DISCORD_BOT_TOKEN);

  try {
    console.log('🔄 Started refreshing application (/) commands.');

    const clientId = env.DISCORD_CLIENT_ID;

    if (!clientId) {
      throw new Error('DISCORD_CLIENT_ID is not set');
    }

    await rest.put(Routes.applicationCommands(clientId), { body: commands });

    console.log('✅ Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('❌ Error registering slash commands:', error);
    throw error;
  }
};

// /check-submission 명령어 핸들러
const handleCheckSubmission = async (
  interaction: ChatInputCommandInteraction
): Promise<void> => {
  // 응답 지연 (데이터 조회 시간 필요)
  await interaction.deferReply();

  try {
    // 현재 활성화된 기수 찾기
    const activeGenerations = await db
      .select()
      .from(generations)
      .where(eq(generations.isActive, true))
      .orderBy(desc(generations.startedAt))
      .limit(1);

    if (activeGenerations.length === 0) {
      await interaction.editReply({
        content: '❌ 활성화된 기수가 없습니다.',
      });
      return;
    }

    const activeGeneration = activeGenerations[0];

    // 해당 기수의 가장 최근 사이클(현재 진행 중인 주차)
    const currentCycle = await db
      .select()
      .from(cycles)
      .where(eq(cycles.generationId, activeGeneration.id))
      .orderBy(desc(cycles.week))
      .limit(1);

    if (currentCycle.length === 0) {
      await interaction.editReply({
        content: '❌ 진행 중인 주차가 없습니다.',
      });
      return;
    }

    const cycle = currentCycle[0];

    // 제출 목록 조회
    const submissionList = await db
      .select({
        memberId: submissions.memberId,
      })
      .from(submissions)
      .where(eq(submissions.cycleId, cycle.id));

    // 전체 멤버 조회
    const allMembers = await db.select().from(members);

    const submittedIds = new Set(submissionList.map((s) => s.memberId));

    const submittedNames = allMembers
      .filter((m) => submittedIds.has(m.id))
      .map((m) => m.name);

    const notSubmittedNames = allMembers
      .filter((m) => !submittedIds.has(m.id))
      .map((m) => m.name);

    // Discord 메시지 생성
    const discordMessage = createStatusMessage(
      `${activeGeneration.name} - ${cycle.week}주차`,
      submittedNames,
      notSubmittedNames,
      cycle.endDate
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
