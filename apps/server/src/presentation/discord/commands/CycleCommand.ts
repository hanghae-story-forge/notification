import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  DiscordAPIError,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { GetCycleStatusQuery } from '@/application/queries';
import { createStatusMessage } from '@/infrastructure/external/discord';
import { DiscordCommand } from './types';

/**
 * Check if an error is a Discord API error that should be silently ignored.
 * These errors occur when interactions expire or are cancelled by user action.
 */
function isIgnorableDiscordError(error: unknown): boolean {
  if (error instanceof DiscordAPIError) {
    // 10062: Unknown interaction - interaction expired (3s timeout)
    // 40060: Interaction has already been acknowledged - race condition
    return error.code === 10062 || error.code === 40060;
  }
  return false;
}

const DEFAULT_ORGANIZATION_SLUG = 'donguel-donguel';

function formatRemainingTime(daysLeft: number, hoursLeft?: number): string {
  if (daysLeft <= 0 && (!hoursLeft || hoursLeft <= 0)) {
    return '오늘 마감';
  }

  if (typeof hoursLeft === 'number') {
    return `마감까지 ${daysLeft}일 ${hoursLeft}시간`;
  }

  return `마감까지 ${daysLeft}일`;
}

function createIssueButton(issueUrl?: string | null) {
  if (!issueUrl) return [];

  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('이번 주차 이슈 열기')
        .setStyle(ButtonStyle.Link)
        .setURL(issueUrl)
    ),
  ];
}

export class CycleCommand implements DiscordCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('cycle')
    .setDescription('주차 관련 정보를 확인합니다')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('current')
        .setDescription('현재 진행 중인 주차 정보를 확인합니다')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('status')
        .setDescription('현재 주차 제출 현황을 확인합니다')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('특정 기수의 주차 목록을 확인합니다')
        .addStringOption((option) =>
          option
            .setName('organization')
            .setDescription('조직')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((option) =>
          option
            .setName('generation')
            .setDescription('기수 이름 (예: 똥글똥글 1기)')
            .setRequired(true)
            .setAutocomplete(true)
        )
    );

  constructor(private readonly getCycleStatusQuery: GetCycleStatusQuery) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === 'current') {
      await this.handleCurrent(interaction);
    } else if (subcommand === 'status') {
      await this.handleStatus(interaction);
    } else if (subcommand === 'list') {
      await this.handleList(interaction);
    }
  }

  private async handleCurrent(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    console.log('🔵 cycle current: Starting...');

    try {
      await interaction.deferReply();
    } catch (error) {
      console.error('❌ cycle current: deferReply failed:', error);
      return;
    }

    try {
      const currentCycle = await this.getCycleStatusQuery.getCurrentCycle(
        DEFAULT_ORGANIZATION_SLUG
      );

      if (!currentCycle) {
        await interaction.editReply({
          content:
            '🗓️ **현재 진행 중인 주차를 찾지 못했어요.**\n\n' +
            '가능한 원인\n' +
            '1. 아직 이번 주차가 생성되지 않았어요.\n' +
            '2. 스터디 운영 설정이 아직 반영되지 않았을 수 있어요.\n' +
            '3. 잠시 후 다시 시도해 주세요.\n\n' +
            '운영자라면 `/cycle list`로 등록된 주차를 확인해 주세요.',
        });
        return;
      }

      const remainingTime = formatRemainingTime(
        currentCycle.daysLeft,
        currentCycle.hoursLeft
      );

      const issueSection = currentCycle.githubIssueUrl
        ? `🔗 이슈 링크: ${currentCycle.githubIssueUrl}\n\n`
        : '⚠️ **아직 이번 주차 GitHub 이슈가 연결되지 않았어요.**\n\n' +
          '**참여자라면**\n' +
          '- 잠시 후 다시 확인해 주세요.\n\n' +
          '**운영자라면**\n' +
          '- GitHub 이슈가 생성되었는지 확인해 주세요.\n' +
          '- 주차 데이터의 `githubIssueUrl`을 확인해 주세요.\n\n';

      await interaction.editReply({
        content:
          `📅 **${currentCycle.generationName} ${currentCycle.week}주차가 진행 중이에요**\n\n` +
          `⏰ **${remainingTime}**\n` +
          `마감일: ${new Date(currentCycle.endDate).toLocaleString('ko-KR', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}\n` +
          issueSection +
          '**제출 방법**\n' +
          '1. 이번 주차 글을 작성합니다.\n' +
          '2. 아래 버튼으로 이번 주차 GitHub 이슈를 엽니다.\n' +
          '3. 댓글에 글 링크를 남깁니다.\n\n' +
          '**댓글 예시**\n' +
          '```\nhttps://my-blog.com/my-post\n```\n' +
          '**다음 행동**\n' +
          '1. 제출 후 `/me info`로 내 상태를 다시 확인해 주세요.\n' +
          '2. 전체 현황은 `/cycle status`로 확인해 주세요.',
        components: createIssueButton(currentCycle.githubIssueUrl),
      });
    } catch (error) {
      console.error('❌ Error handling cycle current:', error);
      try {
        await interaction.editReply({
          content: '❌ 주차 정보 조회 중 오류가 발생했습니다.',
        });
      } catch (editError) {
        console.error('❌ Failed to send error reply:', editError);
      }
    }
  }

  private async handleStatus(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    await interaction.deferReply();

    try {
      const currentCycle = await this.getCycleStatusQuery.getCurrentCycle(
        DEFAULT_ORGANIZATION_SLUG
      );

      if (!currentCycle) {
        await interaction.editReply({
          content:
            '🗓️ **현재 진행 중인 주차를 찾지 못했어요.**\n\n' +
            '`/cycle current`로 현재 주차가 열려 있는지 먼저 확인해 주세요.\n' +
            '운영자라면 `/cycle list`로 등록된 주차를 확인해 주세요.',
        });
        return;
      }

      const participantNames =
        await this.getCycleStatusQuery.getCycleParticipantNames(
          currentCycle.id,
          DEFAULT_ORGANIZATION_SLUG
        );

      if (!participantNames) {
        await interaction.editReply({
          content: '❌ 제출 현황 조회 중 오류가 발생했습니다.',
        });
        return;
      }

      const discordMessage = createStatusMessage(
        participantNames.cycleName,
        participantNames.submittedNames,
        participantNames.notSubmittedNames,
        participantNames.endDate
      );

      await interaction.editReply(discordMessage);
    } catch (error) {
      console.error('Error handling cycle status:', error);
      await interaction.editReply({
        content: '❌ 제출 현황 조회 중 오류가 발생했습니다.',
      });
    }
  }

  private async handleList(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    console.log('🔵 cycle list: Starting...');

    try {
      await interaction.deferReply();
    } catch (error) {
      if (isIgnorableDiscordError(error)) {
        // Interaction expired or already acknowledged - silently ignore
        console.log('⚠️ cycle list: interaction expired or cancelled');
        return;
      }
      console.error('❌ cycle list: deferReply failed:', error);
      return;
    }

    try {
      const organizationSlug = interaction.options.getString(
        'organization',
        true
      );
      const generationName = interaction.options.getString('generation', true);

      const cycles = await this.findCyclesByGeneration(
        generationName,
        organizationSlug
      );

      if (!cycles || cycles.length === 0) {
        await interaction.editReply({
          content: `❌ "${generationName}"의 주차 정보를 찾을 수 없습니다.`,
        });
        return;
      }

      await interaction.editReply({
        content:
          `📅 **${generationName} 주차 목록**\n\n` +
          cycles
            .map(
              (c) =>
                `  • ${c.week}주차: ${c.startDate.toLocaleDateString(
                  'ko-KR'
                )} ~ ${c.endDate.toLocaleDateString('ko-KR')}`
            )
            .join('\n'),
      });
    } catch (error) {
      console.error('❌ Error handling cycle list:', error);
      try {
        await interaction.editReply({
          content: '❌ 주차 정보 조회 중 오류가 발생했습니다.',
        });
      } catch (editError) {
        console.error('❌ Failed to send error reply:', editError);
      }
    }
  }

  /* v8 ignore start -- repository wiring is exercised by infrastructure tests; command UX tests stub this boundary. */
  private async findCyclesByGeneration(
    generationName: string,
    organizationSlug: string
  ): Promise<Array<{ week: number; startDate: Date; endDate: Date }> | null> {
    const { DrizzleCycleRepository } =
      await import('@/infrastructure/persistence/drizzle/cycle.repository.impl');
    const { DrizzleGenerationRepository } =
      await import('@/infrastructure/persistence/drizzle/generation.repository.impl');
    const { DrizzleOrganizationRepository } =
      await import('@/infrastructure/persistence/drizzle/organization.repository.impl');

    const cycleRepo = new DrizzleCycleRepository();
    const generationRepo = new DrizzleGenerationRepository();
    const organizationRepo = new DrizzleOrganizationRepository();

    const organization = await organizationRepo.findBySlug(organizationSlug);
    if (!organization) return null;

    const generations = await generationRepo.findByOrganization(
      organization.id.value
    );
    const generation = generations.find((g) => g.name === generationName);
    if (!generation) return null;

    const cycles = await cycleRepo.findByGeneration(generation.id.value);
    return cycles.map((c) => ({
      week: c.week.toNumber(),
      startDate: c.startDate,
      endDate: c.endDate,
    }));
  }
  /* v8 ignore stop */
}
