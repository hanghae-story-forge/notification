import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { UpdateMemberStatusCommand } from '@/application/commands';
import { MemberRepository } from '@/domain/member/member.repository';
import { OrganizationRepository } from '@/domain/organization/organization.repository';
import { OrganizationMemberStatus } from '@/domain/organization-member/organization-member.domain';
import { DiscordCommand } from './types';

export class ApproveMemberCommand implements DiscordCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('approve-member')
    .setDescription('조직 가입 신청을 승인/거절합니다 (관리자 전용)')
    .addStringOption((option) =>
      option
        .setName('organization')
        .setDescription('조직')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addUserOption((option) =>
      option.setName('user').setDescription('승인할 사용자').setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('action')
        .setDescription('승인 또는 거절')
        .setRequired(true)
        .addChoices(
          { name: '승인', value: 'APPROVED' },
          { name: '거절', value: 'REJECTED' },
          { name: '비활성화', value: 'INACTIVE' }
        )
    );

  constructor(
    private readonly updateMemberStatusCommand: UpdateMemberStatusCommand,
    private readonly memberRepo: MemberRepository,
    private readonly organizationRepo: OrganizationRepository
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: false });

    try {
      const organizationSlug = interaction.options.getString(
        'organization',
        true
      );
      const targetUser = interaction.options.getUser('user', true);
      const action = interaction.options.getString('action', true);

      // 조직 확인
      const organization =
        await this.organizationRepo.findBySlug(organizationSlug);
      if (!organization) {
        await interaction.editReply({
          content: '❌ 조직을 찾을 수 없습니다.',
        });
        return;
      }

      // 대상 멤버 확인
      const member = await this.memberRepo.findByDiscordId(targetUser.id);
      if (!member) {
        await interaction.editReply({
          content:
            '❌ 해당 사용자를 찾을 수 없습니다. 먼저 회원 등록이 필요합니다.',
        });
        return;
      }

      // 상태 변경
      const status = action as OrganizationMemberStatus;
      await this.updateMemberStatusCommand.execute({
        organizationId: organization.id.value,
        memberId: member.id.value,
        status,
      });

      const actionText =
        status === 'APPROVED'
          ? '승인'
          : status === 'REJECTED'
            ? '거절'
            : '비활성화';

      await interaction.editReply({
        content: `✅ ${targetUser.toString()} 님을 **${actionText}**했습니다.\n\n**조직**: ${organization.name.value}\n**상태**: ${status}`,
      });
    } catch (error) {
      console.error('Error handling approve-member command:', error);
      const errorMessage =
        error instanceof Error ? error.message : '알 수 없는 오류';

      await interaction.editReply({
        content: `❌ 오류가 발생했습니다: ${errorMessage}`,
      });
    }
  }
}
