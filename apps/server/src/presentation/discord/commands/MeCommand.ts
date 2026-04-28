import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { GetCycleStatusQuery } from '@/application/queries';
import { MemberRepository } from '@/domain/member/member.repository';
import { OrganizationMemberRepository } from '@/domain/organization-member/organization-member.repository';
import { GenerationMemberRepository } from '@/domain/generation-member/generation-member.repository';
import { DiscordCommand } from './types';

const DEFAULT_ORGANIZATION_SLUG = 'donguel-donguel';

function formatRemainingTime(daysLeft: number, hoursLeft?: number): string {
  if (daysLeft <= 0 && (!hoursLeft || hoursLeft <= 0)) {
    return '오늘 마감';
  }

  if (typeof hoursLeft === 'number') {
    return `마감까지 ${daysLeft}일 ${hoursLeft}시간`;
  }

  return `마감까지 ${daysLeft}일`;
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
    private readonly generationMemberRepo: GenerationMemberRepository,
    private readonly getCycleStatusQuery?: GetCycleStatusQuery
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
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
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
            '👋 **아직 회원 등록이 필요해요.**\n\n' +
            '스터디 봇이 제출 상태를 확인하려면 Discord 계정과 GitHub 계정이 연결된 회원 정보가 필요해요.\n\n' +
            '**다음 행동**\n' +
            '1. `/member create`로 회원을 먼저 등록해 주세요.\n' +
            '2. 등록할 때 GitHub 계정을 정확히 입력해 주세요.\n' +
            '3. 등록 후 `/me info`를 다시 실행해 주세요.',
        });
        return;
      }

      // 소속 조직 수 확인
      const organizationMembers =
        await this.organizationMemberRepo.findByMember(member.id);
      const approvedOrganizations = organizationMembers.filter(
        (om) => om.status.value === 'APPROVED'
      ).length;
      const pendingOrganizations = organizationMembers.filter(
        (om) => om.status.value === 'PENDING'
      ).length;

      const organizationGuidance =
        approvedOrganizations > 0
          ? ''
          : pendingOrganizations > 0
            ? '🏢 **조직 승인 대기 중이에요.** 운영진 승인 후 주차 참여와 제출 상태 확인이 가능해요. `/me organizations`로 신청 상태를 확인해 주세요.\n'
            : '🏢 **조직 가입이 필요해요.** 먼저 `/organization join`으로 똥글똥글 조직에 가입 신청해 주세요. 신청 후 `/me organizations`로 상태를 확인할 수 있어요.\n';

      // 소속 기수 수 확인
      const generationMembers = await this.generationMemberRepo.findByMember(
        member.id
      );

      const currentCycle = this.getCycleStatusQuery
        ? await this.getCycleStatusQuery.getCurrentCycle(
            DEFAULT_ORGANIZATION_SLUG
          )
        : null;

      let submissionStatusMessage = '';
      if (currentCycle && this.getCycleStatusQuery) {
        const participantNames =
          await this.getCycleStatusQuery.getCycleParticipantNames(
            currentCycle.id,
            DEFAULT_ORGANIZATION_SLUG
          );

        if (!participantNames) {
          submissionStatusMessage = '📌 **내 제출 상태: 확인 불가**\n';
        } else if (participantNames.submittedNames.includes(member.name.value)) {
          submissionStatusMessage = '📌 **내 제출 상태: ✅ 제출 완료**\n';
        } else {
          submissionStatusMessage = '📌 **내 제출 상태: ⏳ 아직 제출 전**\n';
        }
      }

      const currentCycleMessage = currentCycle
        ? `🎯 **현재 주차**: ${currentCycle.generationName} ${currentCycle.week}주차\n` +
          `⏰ **${formatRemainingTime(currentCycle.daysLeft, currentCycle.hoursLeft)}**\n` +
          `🔗 이슈: ${currentCycle.githubIssueUrl ?? '아직 연결된 이슈가 없어요.'}\n` +
          submissionStatusMessage
        : '🎯 **현재 주차**: 진행 중인 주차를 찾지 못했어요. `/cycle current`로 다시 확인해 주세요.\n';

      const githubStatus = member.githubUsername
        ? `✅ GitHub 연결됨: ${member.githubUsername.value}`
        : '⚠️ GitHub 계정이 아직 연결되지 않았어요.';

      const nextActions =
        approvedOrganizations === 0
          ? pendingOrganizations > 0
            ? '1. 운영진 승인을 기다려 주세요.\n' +
              '2. `/me organizations`로 조직 가입 신청 상태를 확인해 주세요.\n' +
              '3. 승인 후 `/generation join`으로 참여 기수를 확인해 주세요.'
            : '1. `/organization join`으로 똥글똥글 조직에 가입 신청해 주세요.\n' +
              '2. `/me organizations`로 승인 상태를 확인해 주세요.\n' +
              '3. 승인 후 `/generation join`으로 참여 기수를 확인해 주세요.'
          : member.githubUsername
            ? '1. 이번 주차 글을 작성해 주세요.\n' +
              '2. GitHub 이슈에 제출 링크를 댓글로 남겨 주세요.\n' +
              '3. `/cycle status`로 전체 제출 현황을 확인해 주세요.'
            : '1. GitHub 계정을 먼저 연결해 주세요.\n' +
              '2. 연결 후 `/me info`로 상태를 다시 확인해 주세요.';

      await interaction.editReply({
        content:
          `👤 **내 스터디 대시보드**\n\n` +
          `**이름**: ${member.name.value}\n` +
          `**Discord**: ${member.discordUsername?.value ?? '미설정'}\n` +
          `${githubStatus}\n` +
          `**승인된 조직**: ${approvedOrganizations}개\n` +
          `**참여 기수**: ${generationMembers.length}개\n` +
          `${organizationGuidance ? `\n${organizationGuidance}` : '\n'}` +
          `\n${currentCycleMessage}\n` +
          '**다음 행동**\n' +
          nextActions,
        components: createIssueButton(currentCycle?.githubIssueUrl),
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
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
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
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
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
