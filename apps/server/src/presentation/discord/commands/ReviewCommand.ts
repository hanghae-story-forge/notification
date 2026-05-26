import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import {
  CompletePeerReviewAssignmentCommand,
  CreatePeerReviewAssignmentsCommand,
  GetMyPeerReviewAssignmentQuery,
  GetPeerReviewStatusQuery,
} from '@/application/peer-review';
import { PeerReviewAssignment } from '@/domain/peer-review';
import { MemberRepository } from '@/domain/member/member.repository';
import {
  createPeerReviewDoneMessage,
  createPeerReviewMyAssignmentMessage,
  createPeerReviewNoAssignmentMessage,
  createPeerReviewStatusMessage,
  createPeerReviewTemplateMessage,
} from '@/infrastructure/external/discord';
import { DiscordCommand } from './types';

const DEFAULT_ORGANIZATION_SLUG = 'dongueldonguel';

interface CurrentCycleLookup {
  getCurrentCycle(organizationSlug: string): Promise<{
    id: number;
    week: number;
    generationName: string;
  } | null>;
}

export interface PeerReviewAssignmentDetails {
  revieweeName: string;
  submissionUrl: string;
}

export interface PeerReviewAssignmentDetailsLookup {
  findAssignmentDetails(
    assignment: PeerReviewAssignment
  ): Promise<PeerReviewAssignmentDetails>;
}

export interface ReviewCommandDependencies {
  memberRepository: Pick<MemberRepository, 'findByDiscordId'>;
  cycleQuery: CurrentCycleLookup;
  createAssignmentsCommand: Pick<CreatePeerReviewAssignmentsCommand, 'execute'>;
  getMyAssignmentQuery: Pick<GetMyPeerReviewAssignmentQuery, 'execute'>;
  completeAssignmentCommand: Pick<
    CompletePeerReviewAssignmentCommand,
    'execute'
  >;
  getStatusQuery: Pick<GetPeerReviewStatusQuery, 'execute'>;
  assignmentDetailsLookup: PeerReviewAssignmentDetailsLookup;
}

export class ReviewCommand implements DiscordCommand {
  readonly definition = new SlashCommandBuilder()
    .setName('review')
    .setDescription('똥글똥글 감상평 매칭과 템플릿을 관리합니다')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('template')
        .setDescription('3기 제출 템플릿과 감상평 가이드를 확인합니다')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('assign')
        .setDescription('현재 회차 제출자끼리 감상평 매칭을 생성합니다')
        .addStringOption((option) =>
          option
            .setName('seed')
            .setDescription('재현 가능한 랜덤 매칭 seed (선택)')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('my')
        .setDescription('내가 읽고 감상평을 남길 글을 확인합니다')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('done')
        .setDescription('내 감상평 작성을 완료로 기록합니다')
        .addStringOption((option) =>
          option
            .setName('source_url')
            .setDescription('감상평을 남긴 댓글/메시지 링크 (선택)')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('note')
            .setDescription('운영 참고용 짧은 메모 (선택)')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('status')
        .setDescription('현재 회차 감상평 진행 현황을 확인합니다')
    );

  constructor(private readonly dependencies?: ReviewCommandDependencies) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === 'template') {
      await interaction.reply(createPeerReviewTemplateMessage());
      return;
    }

    if (subcommand === 'assign') {
      await this.handleAssign(interaction);
    } else if (subcommand === 'my') {
      await this.handleMy(interaction);
    } else if (subcommand === 'done') {
      await this.handleDone(interaction);
    } else if (subcommand === 'status') {
      await this.handleStatus(interaction);
    }
  }

  private async handleAssign(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    await interaction.deferReply();
    const dependencies = await this.requireDependencies(interaction);
    if (!dependencies) return;

    const currentCycle = await this.getCurrentCycleOrReply(interaction);
    if (!currentCycle) return;

    const seed =
      interaction.options.getString('seed') ??
      `${DEFAULT_ORGANIZATION_SLUG}:${currentCycle.id}`;
    const assignments = await dependencies.createAssignmentsCommand.execute({
      cycleId: currentCycle.id,
      seed,
    });

    await interaction.editReply({
      content:
        `✅ **${currentCycle.generationName} ${currentCycle.week}주차**에 ` +
        `**${assignments.length}개의 감상평 매칭을 만들었어요.**\n\n` +
        '참가자는 `/review my`로 본인이 읽을 글을 확인할 수 있어요.',
    });
  }

  private async handleMy(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const dependencies = await this.requireDependencies(interaction);
    if (!dependencies) return;

    const currentCycle = await this.getCurrentCycleOrReply(interaction);
    if (!currentCycle) return;

    const member = await this.getMemberOrReply(interaction);
    if (!member) return;

    const assignment = await dependencies.getMyAssignmentQuery.execute({
      cycleId: currentCycle.id,
      reviewerMemberId: member.id.value,
    });

    if (!assignment) {
      await interaction.editReply(
        createPeerReviewNoAssignmentMessage({
          cycleName: `${currentCycle.generationName} ${currentCycle.week}주차`,
        })
      );
      return;
    }

    const details =
      await dependencies.assignmentDetailsLookup.findAssignmentDetails(
        assignment
      );

    await interaction.editReply(
      createPeerReviewMyAssignmentMessage({
        cycleName: `${currentCycle.generationName} ${currentCycle.week}주차`,
        revieweeName: details.revieweeName,
        submissionUrl: details.submissionUrl,
      })
    );
  }

  private async handleDone(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const dependencies = await this.requireDependencies(interaction);
    if (!dependencies) return;

    const currentCycle = await this.getCurrentCycleOrReply(interaction);
    if (!currentCycle) return;

    const member = await this.getMemberOrReply(interaction);
    if (!member) return;

    await dependencies.completeAssignmentCommand.execute({
      cycleId: currentCycle.id,
      reviewerMemberId: member.id.value,
      completedSourceUrl:
        interaction.options.getString('source_url') ?? undefined,
      completionNote: interaction.options.getString('note') ?? undefined,
    });

    await interaction.editReply(
      createPeerReviewDoneMessage({
        cycleName: `${currentCycle.generationName} ${currentCycle.week}주차`,
      })
    );
  }

  private async handleStatus(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    await interaction.deferReply();
    const dependencies = await this.requireDependencies(interaction);
    if (!dependencies) return;

    const currentCycle = await this.getCurrentCycleOrReply(interaction);
    if (!currentCycle) return;

    const status = await dependencies.getStatusQuery.execute({
      cycleId: currentCycle.id,
    });

    await interaction.editReply(
      createPeerReviewStatusMessage({
        cycleName: `${currentCycle.generationName} ${currentCycle.week}주차`,
        total: status.total,
        completed: status.completed,
        pending: status.pending,
        skipped: status.skipped,
        cancelled: status.cancelled,
      })
    );
  }

  private async requireDependencies(
    interaction: ChatInputCommandInteraction
  ): Promise<ReviewCommandDependencies | null> {
    if (this.dependencies) return this.dependencies;

    await interaction.editReply({
      content:
        '❌ 감상평 명령어 설정이 아직 연결되지 않았어요. 운영자에게 알려주세요.',
    });
    return null;
  }

  private async getCurrentCycleOrReply(
    interaction: ChatInputCommandInteraction
  ): Promise<{ id: number; week: number; generationName: string } | null> {
    const currentCycle = await this.dependencies?.cycleQuery.getCurrentCycle(
      DEFAULT_ORGANIZATION_SLUG
    );
    if (currentCycle) return currentCycle;

    await interaction.editReply({
      content:
        '❌ 현재 진행 중인 회차를 찾지 못했어요. `/cycle current`로 먼저 회차 상태를 확인해 주세요.',
    });
    return null;
  }

  private async getMemberOrReply(
    interaction: ChatInputCommandInteraction
  ): Promise<{ id: { value: number } } | null> {
    const member = await this.dependencies?.memberRepository.findByDiscordId(
      interaction.user.id
    );
    if (member) return member;

    await interaction.editReply({
      content:
        '👋 아직 회원 등록이 필요해요. `/member create`로 등록한 뒤 다시 실행해 주세요.',
    });
    return null;
  }
}
