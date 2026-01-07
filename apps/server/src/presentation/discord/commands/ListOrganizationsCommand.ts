import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { OrganizationRepository } from '@/domain/organization/organization.repository';
import { DiscordCommand } from './types';

export class ListOrganizationsCommand implements DiscordCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('list-organizations')
    .setDescription('등록된 모든 스터디(조직) 목록을 조회합니다');

  constructor(private readonly organizationRepo: OrganizationRepository) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    try {
      const allOrgs = await this.organizationRepo.findAll();

      if (allOrgs.length === 0) {
        await interaction.editReply({
          content: '📋 등록된 스터디가 없습니다.',
        });
        return;
      }

      const activeOrgs = allOrgs.filter((org) => org.isActive);

      if (activeOrgs.length === 0) {
        await interaction.editReply({
          content: '📋 활성화된 스터디가 없습니다.',
        });
        return;
      }

      let message = `📋 **스터디 목록** (총 ${activeOrgs.length}개)\n\n`;

      activeOrgs.forEach((org, index) => {
        const dto = org.toDTO();
        message += `**${index + 1}. ${dto.name}**\n`;
        message += `   슬러그: \`${dto.slug}\`\n`;
        if (dto.discordWebhookUrl) {
          message += `   웹훅: 연결됨\n`;
        }
        message += '\n';
      });

      await interaction.editReply({
        content: message,
      });
    } catch (error) {
      console.error('Error handling list-organizations command:', error);
      await interaction.editReply({
        content: '❌ 스터디 목록 조회 중 오류가 발생했습니다.',
      });
    }
  }
}
