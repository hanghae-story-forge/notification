import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { GetCycleStatusQuery } from '@/application/queries';
import { DiscordCommand } from './types';

export class CurrentCycleCommand implements DiscordCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('current-cycle')
    .setDescription('현재 진행 중인 주차 정보를 확인합니다');

  constructor(private readonly getCycleStatusQuery: GetCycleStatusQuery) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    console.log('🔵 handleCurrentCycle: Starting...');

    try {
      await interaction.deferReply();
    } catch (error) {
      console.error('❌ handleCurrentCycle: deferReply failed:', error);
      return;
    }

    try {
      const currentCycle =
        await this.getCycleStatusQuery.getCurrentCycle('dongueldonguel');

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
      console.error('❌ Error handling current-cycle command:', error);
      try {
        await interaction.editReply({
          content: '❌ 주차 정보 조회 중 오류가 발생했습니다.',
        });
      } catch (editError) {
        console.error('❌ Failed to send error reply:', editError);
      }
    }
  }
}
