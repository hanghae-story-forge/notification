import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  DiscordAPIError,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { CreateCycleCommand as AppCreateCycleCommand } from '@/application/commands';
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

interface CycleGenerationLookup {
  findGenerationByOrganizationAndName(
    organizationSlug: string,
    generationName: string
  ): Promise<{ id: number } | null>;
}

function formatRemainingTime(daysLeft: number, hoursLeft?: number): string {
  if (daysLeft <= 0 && (!hoursLeft || hoursLeft <= 0)) {
    return '오늘 마감';
  }

  if (typeof hoursLeft === 'number') {
    return `마감까지 ${daysLeft}일 ${hoursLeft}시간`;
  }

  return daysLeft > 0 ? `마감까지 ${daysLeft}일` : '오늘 마감';
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
        .setName('create')
        .setDescription('운영자가 특정 기수의 주차를 생성합니다')
        .addStringOption((option) =>
          option
            .setName('organization')
            .setDescription('조직 slug (예: donguel-donguel)')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((option) =>
          option
            .setName('generation')
            .setDescription('기수 이름 (예: 똥글똥글 3기)')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addIntegerOption((option) =>
          option
            .setName('week')
            .setDescription('주차 번호')
            .setRequired(true)
            .setMinValue(1)
        )
        .addStringOption((option) =>
          option
            .setName('start_date')
            .setDescription('시작일 (YYYY-MM-DD)')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('end_date')
            .setDescription('마감일 (YYYY-MM-DD)')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('github_issue_url')
            .setDescription('연결할 GitHub Issue URL (선택)')
            .setRequired(false)
        )
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

  constructor(
    private readonly getCycleStatusQuery: GetCycleStatusQuery,
    private readonly createCycleCommand?: AppCreateCycleCommand,
    private readonly generationLookup?: CycleGenerationLookup
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === 'current') {
      await this.handleCurrent(interaction);
    } else if (subcommand === 'status') {
      await this.handleStatus(interaction);
    } else if (subcommand === 'create') {
      await this.handleCreate(interaction);
    } else if (subcommand === 'list') {
      await this.handleList(interaction);
    }
  }

  private parseDateOption(value: string, endOfDay = false): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const suffix = endOfDay ? 'T23:59:59.000Z' : 'T00:00:00.000Z';
    const date = new Date(`${value}${suffix}`);
    return Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
      ? null
      : date;
  }

  private async handleCreate(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    try {
      await interaction.deferReply({ ephemeral: true });
    } catch {
      return;
    }

    if (!this.createCycleCommand || !this.generationLookup) {
      await interaction.editReply({
        content: '❌ 주차 생성 기능이 아직 연결되지 않았습니다.',
      });
      return;
    }

    const organizationSlug = interaction.options.getString(
      'organization',
      true
    );
    const generationName = interaction.options.getString('generation', true);
    const week = interaction.options.getInteger('week', true);
    const startDateValue = interaction.options.getString('start_date', true);
    const endDateValue = interaction.options.getString('end_date', true);
    const githubIssueUrl =
      interaction.options.getString('github_issue_url', false) ?? undefined;
    const startDate = this.parseDateOption(startDateValue);
    const endDate = this.parseDateOption(endDateValue, true);

    if (!startDate || !endDate) {
      await interaction.editReply({
        content:
          '❌ 시작일/마감일은 `YYYY-MM-DD` 형식으로 입력해 주세요. 예: `2026-06-01`',
      });
      return;
    }

    try {
      const generation =
        await this.generationLookup.findGenerationByOrganizationAndName(
          organizationSlug,
          generationName
        );
      if (!generation) {
        await interaction.editReply({
          content: `❌ "${organizationSlug}" 조직에서 "${generationName}" 기수를 찾을 수 없습니다.`,
        });
        return;
      }

      const result = await this.createCycleCommand.execute({
        organizationSlug,
        generationId: generation.id,
        week,
        startDate,
        endDate,
        githubIssueUrl,
      });

      await interaction.editReply({
        content:
          `✅ **${result.generationName} ${result.cycle.week.toNumber()}주차**를 생성했습니다.\n\n` +
          `**기간**: ${startDate.toISOString().slice(0, 10)} ~ ${endDate.toISOString().slice(0, 10)}\n` +
          `**GitHub Issue**: ${githubIssueUrl ?? '나중에 연결'}\n\n` +
          `확인: \`/cycle list organization:${organizationSlug} generation:${generationName}\``,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '알 수 없는 오류';
      await interaction.editReply({
        content: `❌ 주차 생성 중 오류가 발생했습니다: ${errorMessage}`,
      });
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

      await interaction.editReply({
        content:
          `📅 **${currentCycle.generationName} ${currentCycle.week}주차가 진행 중이에요**\n\n` +
          `⏰ **${remainingTime}**\n` +
          `마감일: ${new Date(currentCycle.endDate).toLocaleString('ko-KR', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}\n` +
          `이슈 링크: ${currentCycle.githubIssueUrl}\n\n` +
          '**다음 행동**\n' +
          '1. 이번 주차 글을 작성해 주세요.\n' +
          '2. GitHub 이슈에 제출 링크를 댓글로 남겨 주세요.\n' +
          '3. 제출 후 `/me info`로 내 상태를 다시 확인해 주세요.',
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
          content: '❌ 현재 진행 중인 주차가 없습니다.',
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
}
