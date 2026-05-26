import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { createPeerReviewTemplateMessage } from '@/infrastructure/external/discord';
import { DiscordCommand } from './types';

export class ReviewCommand implements DiscordCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('review')
    .setDescription('똥글똥글 감상평 매칭과 템플릿을 관리합니다')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('template')
        .setDescription('3기 제출 템플릿과 감상평 가이드를 확인합니다')
    );

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === 'template') {
      await interaction.reply(createPeerReviewTemplateMessage());
    }
  }
}
