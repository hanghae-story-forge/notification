import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { CreateMemberCommand as AppCreateMemberCommand } from '@/application/commands';
import { UpdateMemberStatusCommand } from '@/application/commands';
import { MemberRepository } from '@/domain/member/member.repository';
import { OrganizationRepository } from '@/domain/organization/organization.repository';
import { OrganizationMemberStatus } from '@/domain/organization-member/organization-member.domain';
import { DiscordCommand } from './types';

export class MemberCommand implements DiscordCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('member')
    .setDescription('회원 관련 명령어')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('create')
        .setDescription('회원으로 등록합니다')
        .addStringOption((option) =>
          option.setName('name').setDescription('실제 이름').setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('github')
            .setDescription('GitHub 사용자명 (선택사항)')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('approve')
        .setDescription('조직 가입 신청을 승인/거절합니다 (관리자 전용)')
        .addStringOption((option) =>
          option
            .setName('organization')
            .setDescription('조직')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('승인할 사용자')
            .setRequired(true)
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
        )
    );

  constructor(
    private readonly createMemberCommand: AppCreateMemberCommand,
    private readonly updateMemberStatusCommand: UpdateMemberStatusCommand,
    private readonly memberRepo: MemberRepository,
    private readonly organizationRepo: OrganizationRepository
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === 'create') {
      await this.handleCreate(interaction);
    } else if (subcommand === 'approve') {
      await this.handleApprove(interaction);
    }
  }

  private async handleCreate(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    try {
      await interaction.deferReply({ ephemeral: true });
    } catch {
      return;
    }

    try {
      const name = interaction.options.getString('name', true);
      const githubUsername = interaction.options.getString('github', false);

      if (!interaction.user) {
        await interaction.editReply({
          content: '❌ 사용자 정보를 가져올 수 없습니다.',
        });
        return;
      }

      const discordId = interaction.user.id;
      const discordUsername = interaction.user.username;
      const discordAvatar = interaction.user.avatar;

      const result = await this.createMemberCommand.execute({
        githubUsername: githubUsername ?? '',
        name,
        discordId,
      });

      const member = result.member;
      member.updateDiscordUsername(discordUsername);
      if (discordAvatar) {
        member.updateDiscordAvatar(discordAvatar);
      }
      await this.memberRepo.save(member);

      await interaction.editReply({
        content: `✅ 회원 등록이 완료되었습니다!\n\n**이름**: ${name}\n**Discord**: ${discordUsername}\n**GitHub**: ${githubUsername || '미연결'}\n\n\n📝 다음 단계:\n1. \`/organization join\` - 조직에 가입 신청\n2. 관리자 승인 후 \`/generation join\` - 기수 참여`,
      });
    } catch (error) {
      console.error('Error handling member create:', error);
      const errorMessage =
        error instanceof Error ? error.message : '알 수 없는 오류';

      try {
        if (errorMessage.includes('이미 존재')) {
          await interaction.editReply({
            content: '❌ 이미 등록된 회원입니다.',
          });
        } else {
          await interaction.editReply({
            content: `❌ 회원 등록 중 오류가 발생했습니다: ${errorMessage}`,
          });
        }
      } catch (editError) {
        console.error('Failed to send error reply:', editError);
      }
    }
  }

  private async handleApprove(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    try {
      await interaction.deferReply();
    } catch {
      return;
    }

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
      console.error('Error handling member approve:', error);
      const errorMessage =
        error instanceof Error ? error.message : '알 수 없는 오류';

      try {
        await interaction.editReply({
          content: `❌ 오류가 발생했습니다: ${errorMessage}`,
        });
      } catch (editError) {
        console.error('Failed to send error reply:', editError);
      }
    }
  }
}
