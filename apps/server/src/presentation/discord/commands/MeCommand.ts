import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { MemberRepository } from '@/domain/member/member.repository';
import { OrganizationMemberRepository } from '@/domain/organization-member/organization-member.repository';
import { GenerationMemberRepository } from '@/domain/generation-member/generation-member.repository';
import { DiscordCommand } from './types';

export class MeCommand implements DiscordCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('me')
    .setDescription('내 정보를 확인합니다')
    .addSubcommand((subcommand) =>
      subcommand.setName('info').setDescription('내 기본 정보를 확인합니다')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('organizations')
        .setDescription('내가 속한 조직 목록을 확인합니다')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('generations')
        .setDescription('내가 속한 기수 목록을 확인합니다')
    );

  constructor(
    private readonly memberRepo: MemberRepository,
    private readonly organizationMemberRepo: OrganizationMemberRepository,
    private readonly generationMemberRepo: GenerationMemberRepository
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === 'info') {
      await this.handleInfo(interaction);
    } else if (subcommand === 'organizations') {
      await this.handleOrganizations(interaction);
    } else if (subcommand === 'generations') {
      await this.handleGenerations(interaction);
    }
  }

  private async handleInfo(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    try {
      await interaction.deferReply({ ephemeral: true });
    } catch {
      return;
    }

    try {
      if (!interaction.user) {
        await interaction.editReply({
          content: '❌ 사용자 정보를 가져올 수 없습니다.',
        });
        return;
      }

      const member = await this.memberRepo.findByDiscordId(interaction.user.id);
      if (!member) {
        await interaction.editReply({
          content:
            '❌ 회원 정보를 찾을 수 없습니다. `/member create` 명령어로 먼저 회원 등록을 해주세요.',
        });
        return;
      }

      // 소속 조직 수 확인
      const organizationMembers =
        await this.organizationMemberRepo.findByMember(member.id);
      const approvedOrganizations = organizationMembers.filter(
        (om) => om.status.value === 'APPROVED'
      ).length;

      // 소속 기수 수 확인
      const generationMembers = await this.generationMemberRepo.findByMember(
        member.id
      );

      await interaction.editReply({
        content:
          `👤 **내 정보**\n\n` +
          `**이름**: ${member.name.value}\n` +
          `**Discord**: ${member.discordUsername || '미설정'}\n` +
          `**GitHub**: ${member.githubUsername || '미연결'}\n` +
          `**소속 조직**: ${approvedOrganizations}개\n` +
          `**참여 기수**: ${generationMembers.length}개`,
      });
    } catch (error) {
      console.error('Error handling me info:', error);
      try {
        await interaction.editReply({
          content: '❌ 정보 조회 중 오류가 발생했습니다.',
        });
      } catch (editError) {
        console.error('Failed to send error reply:', editError);
      }
    }
  }

  private async handleOrganizations(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    try {
      await interaction.deferReply({ ephemeral: true });
    } catch {
      return;
    }

    try {
      if (!interaction.user) {
        await interaction.editReply({
          content: '❌ 사용자 정보를 가져올 수 없습니다.',
        });
        return;
      }

      const member = await this.memberRepo.findByDiscordId(interaction.user.id);
      if (!member) {
        await interaction.editReply({
          content: '❌ 회원 정보를 찾을 수 없습니다.',
        });
        return;
      }

      const organizationMembers =
        await this.organizationMemberRepo.findByMemberWithOrganizations(
          member.id
        );

      if (organizationMembers.length === 0) {
        await interaction.editReply({
          content:
            '📋 아직 소속된 조직이 없습니다.\n\n`/organization join` 명령어로 조직에 가입 신청을 해주세요!',
        });
        return;
      }

      let message = `📋 **내 소속 조직** (총 ${organizationMembers.length}개)\n\n`;

      for (const { organizationMember, organization } of organizationMembers) {
        if (organization) {
          const statusEmoji =
            organizationMember.status.value === 'APPROVED'
              ? '✅'
              : organizationMember.status.value === 'PENDING'
                ? '⏳'
                : '❌';

          message += `${statusEmoji} **${organization.name}**\n`;
          message += `   상태: ${organizationMember.status.value} | `;
          message += `역할: ${organizationMember.role.value}\n`;
          message += `   가입일: ${new Date(organizationMember.joinedAt).toLocaleDateString('ko-KR')}\n\n`;
        }
      }

      await interaction.editReply({
        content: message,
      });
    } catch (error) {
      console.error('Error handling me organizations:', error);
      try {
        await interaction.editReply({
          content: '❌ 조직 목록 조회 중 오류가 발생했습니다.',
        });
      } catch (editError) {
        console.error('Failed to send error reply:', editError);
      }
    }
  }

  private async handleGenerations(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    try {
      await interaction.deferReply({ ephemeral: true });
    } catch {
      return;
    }

    try {
      if (!interaction.user) {
        await interaction.editReply({
          content: '❌ 사용자 정보를 가져올 수 없습니다.',
        });
        return;
      }

      const member = await this.memberRepo.findByDiscordId(interaction.user.id);
      if (!member) {
        await interaction.editReply({
          content: '❌ 회원 정보를 찾을 수 없습니다.',
        });
        return;
      }

      const generationMembers =
        await this.generationMemberRepo.findByMemberWithGenerations(member.id);

      if (generationMembers.length === 0) {
        await interaction.editReply({
          content:
            '📋 아직 참여 중인 기수가 없습니다.\n\n`/generation join` 명령어로 기수에 참여해주세요!',
        });
        return;
      }

      let message = `📋 **내 참여 기수** (총 ${generationMembers.length}개)\n\n`;

      for (const { generation, organization } of generationMembers) {
        if (generation) {
          message += `🎯 **${generation.name}**\n`;
          if (organization) {
            message += `   조직: ${organization.name}\n`;
          }
          message += `   시작일: ${new Date(generation.startedAt).toLocaleDateString('ko-KR')}\n`;
          if (generation.isActive) {
            message += `   상태: 활성중 ✅\n\n`;
          } else {
            message += `   상태: 종료됨\n\n`;
          }
        }
      }

      await interaction.editReply({
        content: message,
      });
    } catch (error) {
      console.error('Error handling me generations:', error);
      try {
        await interaction.editReply({
          content: '❌ 기수 목록 조회 중 오류가 발생했습니다.',
        });
      } catch (editError) {
        console.error('Failed to send error reply:', editError);
      }
    }
  }
}
