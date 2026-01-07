import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { GetCycleStatusQuery } from '@/application/queries';
import { DiscordCommand } from './types';

export class CycleStatusCommand implements DiscordCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('cycle-status')
    .setDescription('특정 기수의 주차 제출 현황을 확인합니다')
    .addStringOption((option) =>
      option
        .setName('generation')
        .setDescription('기수 이름 (예: 똥글똥글 1기, 똥글똥글 2기)')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('week')
        .setDescription('주차 (예: 1, 2, 3...)')
        .setRequired(false)
    );

  constructor(private readonly getCycleStatusQuery: GetCycleStatusQuery) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    console.log('🔵 handleCycleStatus: Starting...');

    try {
      await interaction.deferReply();
    } catch (error) {
      console.error('❌ handleCycleStatus: deferReply failed:', error);
      return;
    }

    try {
      const generationName = interaction.options.getString('generation', true);
      const week = interaction.options.getInteger('week');

      // organizationSlug는 기수 이름에서 추출하거나 고정값 사용
      const organizationSlug = 'donguel-donguel';

      if (week) {
        // 특정 주차 조회
        const cycleId = await this.findCycleIdByGenerationAndWeek(
          generationName,
          week,
          organizationSlug
        );

        if (!cycleId) {
          await interaction.editReply({
            content: `❌ "${generationName}" ${week}주차를 찾을 수 없습니다.`,
          });
          return;
        }

        const status = await this.getCycleStatusQuery.getCycleParticipantNames(
          cycleId,
          organizationSlug
        );

        if (!status) {
          await interaction.editReply({
            content: `❌ ${cycleId}번 주차 정보를 찾을 수 없습니다.`,
          });
          return;
        }

        const now = new Date();
        const daysLeft = Math.ceil(
          (status.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        await interaction.editReply({
          content:
            `📅 **${status.cycleName} 제출 현황**\n\n` +
            `📝 **제출자** (${status.submittedNames.length}명):\n` +
            (status.submittedNames.length > 0
              ? status.submittedNames.map((name) => `  ✅ ${name}`).join('\n')
              : '  없음') +
            `\n\n⏳ **미제출자** (${status.notSubmittedNames.length}명):\n` +
            (status.notSubmittedNames.length > 0
              ? status.notSubmittedNames
                  .map((name) => `  ❌ ${name}`)
                  .join('\n')
              : '  없음') +
            `\n\n📅 **마감일**: ${status.endDate.toLocaleDateString('ko-KR')} (${
              daysLeft > 0
                ? `D-${daysLeft}`
                : daysLeft === 0
                  ? '오늘 마감'
                  : '마감됨'
            })`,
        });
      } else {
        // 기수 전체 주차 목록 조회
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
                  `  • ${c.week}주차: ${c.startDate.toLocaleDateString('ko-KR')} ~ ${c.endDate.toLocaleDateString('ko-KR')}`
              )
              .join('\n'),
        });
      }
    } catch (error) {
      console.error('❌ Error handling cycle-status command:', error);
      try {
        await interaction.editReply({
          content: '❌ 주차 정보 조회 중 오류가 발생했습니다.',
        });
      } catch (editError) {
        console.error('❌ Failed to send error reply:', editError);
      }
    }
  }

  private async findCycleIdByGenerationAndWeek(
    generationName: string,
    week: number,
    organizationSlug: string
  ): Promise<number | null> {
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

    const cycle = await cycleRepo.findByGenerationAndWeek(
      generation.id.value,
      week
    );
    return cycle ? cycle.id.value : null;
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
