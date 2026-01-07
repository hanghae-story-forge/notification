import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { GetCycleStatusQuery } from '@/application/queries';
import { createStatusMessage } from '@/infrastructure/external/discord';
import { DiscordCommand } from './types';

export class CheckSubmissionCommand implements DiscordCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('check-submission')
    .setDescription('현재 활성화된 주차의 제출 현황을 확인합니다');

  constructor(private readonly getCycleStatusQuery: GetCycleStatusQuery) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    try {
      const currentCycle =
        await this.getCycleStatusQuery.getCurrentCycle('dongueldonguel');

      if (!currentCycle) {
        await interaction.editReply({
          content: '❌ 현재 진행 중인 주차가 없습니다.',
        });
        return;
      }

      const participantNames = await this.getCycleStatusQuery.getCycleParticipantNames(
        currentCycle.id,
        'dongueldonguel'
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
      console.error('Error handling check-submission command:', error);
      await interaction.editReply({
        content: '❌ 제출 현황 조회 중 오류가 발생했습니다.',
      });
    }
  }
}
