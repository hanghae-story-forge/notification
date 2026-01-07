import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { JoinOrganizationCommand as AppJoinOrganizationCommand } from '@/application/commands';
import { DiscordCommand } from './types';

export class JoinOrganizationDiscordCommand implements DiscordCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('join-organization')
    .setDescription('조직에 가입 신청합니다')
    .addStringOption((option) =>
      option
        .setName('organization')
        .setDescription('조직 슬러그 (예: donguel-donguel)')
        .setRequired(true)
        .setAutocomplete(true)
    );

  constructor(
    private readonly joinOrganizationCommand: AppJoinOrganizationCommand
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    try {
      const organizationSlug = interaction.options.getString(
        'organization',
        true
      );

      if (!interaction.user) {
        await interaction.editReply({
          content: '❌ 사용자 정보를 가져올 수 없습니다.',
        });
        return;
      }

      const result = await this.joinOrganizationCommand.execute({
        organizationSlug,
        memberDiscordId: interaction.user.id,
      });

      if (result.isNew) {
        await interaction.editReply({
          content: `✅ 조직 가입 신청이 완료되었습니다!\n\n**조직**: ${result.organization.name.value}\n**상태**: PENDING (승인 대기 중)\n\n관리자의 승인을 기다려주세요.`,
        });
      } else {
        const status = result.organizationMember.status.value;
        if (status === 'APPROVED') {
          await interaction.editReply({
            content: `ℹ️ 이미 승인된 조직원입니다.\n\n**조직**: ${result.organization.name.value}\n**역할**: ${result.organizationMember.role.value}`,
          });
        } else {
          await interaction.editReply({
            content: `ℹ️ 이미 가입 신청이 처리 중입니다.\n\n**조직**: ${result.organization.name.value}\n**상태**: ${status}`,
          });
        }
      }
    } catch (error) {
      console.error('Error handling join-organization command:', error);
      const errorMessage =
        error instanceof Error ? error.message : '알 수 없는 오류';

      if (errorMessage.includes('not found')) {
        await interaction.editReply({
          content: '❌ 조직을 찾을 수 없습니다. 슬러그를 확인해주세요.',
        });
      } else if (errorMessage.includes('Member with Discord ID')) {
        await interaction.editReply({
          content: '❌ 먼저 `/register` 명령어로 회원 등록을 해주세요.',
        });
      } else {
        await interaction.editReply({
          content: `❌ 조직 가입 중 오류가 발생했습니다: ${errorMessage}`,
        });
      }
    }
  }
}
