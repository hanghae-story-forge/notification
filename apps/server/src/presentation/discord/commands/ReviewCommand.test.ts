import { MessageFlags } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';
import { PeerReviewAssignment } from '@/domain/peer-review';
import { Member } from '@/domain/member/member.domain';
import { ReviewCommand, ReviewCommandDependencies } from './ReviewCommand';

type MockInteraction = {
  user: { id: string };
  options: {
    getSubcommand: ReturnType<typeof vi.fn>;
    getString: ReturnType<typeof vi.fn>;
  };
  reply: ReturnType<typeof vi.fn>;
  deferReply: ReturnType<typeof vi.fn>;
  editReply: ReturnType<typeof vi.fn>;
};

function createInteraction(
  subcommand: 'template' | 'assign' | 'my' | 'done' | 'status' | 'unknown',
  stringOptions: Record<string, string | null> = {}
): MockInteraction {
  return {
    user: { id: 'discord-1' },
    options: {
      getSubcommand: vi.fn().mockReturnValue(subcommand),
      getString: vi.fn((name: string) => stringOptions[name] ?? null),
    },
    reply: vi.fn().mockResolvedValue(undefined),
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
  };
}

function createMember(id = 20): Member {
  return Member.reconstitute({
    id,
    discordId: 'discord-1',
    discordUsername: 'jun',
    githubUsername: 'BBAK-jun',
    name: '박준형',
    createdAt: new Date('2026-05-26T00:00:00.000Z'),
  });
}

function createAssignment(status: 'ASSIGNED' | 'COMPLETED' = 'ASSIGNED') {
  return PeerReviewAssignment.create({
    id: 1,
    cycleId: 10,
    reviewerMemberId: 20,
    revieweeMemberId: 30,
    submissionId: 300,
    status,
    assignedAt: new Date('2026-05-26T00:00:00.000Z'),
    completedAt:
      status === 'COMPLETED' ? new Date('2026-05-27T00:00:00.000Z') : undefined,
  });
}

function createDependencies(
  overrides: Partial<ReviewCommandDependencies> = {}
): ReviewCommandDependencies {
  return {
    memberRepository: {
      findByDiscordId: vi.fn().mockResolvedValue(createMember()),
    },
    cycleQuery: {
      getCurrentCycle: vi.fn().mockResolvedValue({
        id: 10,
        week: 3,
        generationName: '똥글똥글 3기',
      }),
    },
    createAssignmentsCommand: {
      execute: vi.fn().mockResolvedValue([createAssignment()]),
    },
    getMyAssignmentQuery: {
      execute: vi.fn().mockResolvedValue(createAssignment()),
    },
    completeAssignmentCommand: {
      execute: vi.fn().mockResolvedValue(createAssignment('COMPLETED')),
    },
    getStatusQuery: {
      execute: vi.fn().mockResolvedValue({
        cycleId: 10,
        total: 1,
        completed: 0,
        pending: 1,
        skipped: 0,
        cancelled: 0,
        pendingReviewerMemberIds: [20],
      }),
    },
    assignmentDetailsLookup: {
      findAssignmentDetails: vi.fn().mockResolvedValue({
        revieweeName: '김리뷰',
        submissionUrl: 'https://example.com/post',
      }),
    },
    ...overrides,
  };
}

describe('ReviewCommand', () => {
  it('defines the review command with peer-review subcommands', () => {
    const commandJson = new ReviewCommand().definition.toJSON();

    expect(commandJson.name).toBe('review');
    expect(commandJson.description).toContain('감상평');
    expect(commandJson.options?.map((option) => option.name)).toEqual([
      'template',
      'assign',
      'my',
      'done',
      'status',
    ]);
  });

  it('replies with the 3rd generation submission and peer review template', async () => {
    const command = new ReviewCommand();
    const interaction = createInteraction('template');

    await command.execute(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('3기 제출 템플릿'),
      })
    );
    const reply = interaction.reply.mock.calls[0][0] as { content: string };
    expect(reply.content).toContain('평가나 채점이 아니라');
    expect(reply.content).toContain('2~5문장');
  });

  it('assigns current cycle peer reviews for operators', async () => {
    const dependencies = createDependencies();
    const command = new ReviewCommand(dependencies);
    const interaction = createInteraction('assign', { seed: 'week-3' });

    await command.execute(interaction as never);

    expect(interaction.deferReply).toHaveBeenCalledWith();
    expect(dependencies.cycleQuery.getCurrentCycle).toHaveBeenCalledWith(
      'dongueldonguel'
    );
    expect(dependencies.createAssignmentsCommand.execute).toHaveBeenCalledWith({
      cycleId: 10,
      seed: 'week-3',
    });
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('1개의 감상평 매칭을 만들었어요'),
      })
    );
  });

  it('shows my current cycle peer review assignment', async () => {
    const dependencies = createDependencies();
    const command = new ReviewCommand(dependencies);
    const interaction = createInteraction('my');

    await command.execute(interaction as never);

    expect(interaction.deferReply).toHaveBeenCalledWith({
      flags: MessageFlags.Ephemeral,
    });
    expect(dependencies.memberRepository.findByDiscordId).toHaveBeenCalledWith(
      'discord-1'
    );
    expect(dependencies.getMyAssignmentQuery.execute).toHaveBeenCalledWith({
      cycleId: 10,
      reviewerMemberId: 20,
    });
    expect(
      dependencies.assignmentDetailsLookup.findAssignmentDetails
    ).toHaveBeenCalledWith(createAssignment());
    const reply = interaction.editReply.mock.calls[0][0] as { content: string };
    expect(reply.content).toContain('김리뷰');
    expect(reply.content).toContain('https://example.com/post');
  });

  it('marks my current cycle peer review as done', async () => {
    const dependencies = createDependencies();
    const command = new ReviewCommand(dependencies);
    const interaction = createInteraction('done', {
      source_url: 'https://github.com/org/repo/issues/1#comment-1',
      note: '좋았던 점을 남겼어요',
    });

    await command.execute(interaction as never);

    expect(interaction.deferReply).toHaveBeenCalledWith({
      flags: MessageFlags.Ephemeral,
    });
    expect(dependencies.completeAssignmentCommand.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        cycleId: 10,
        reviewerMemberId: 20,
        completedSourceUrl: 'https://github.com/org/repo/issues/1#comment-1',
        completionNote: '좋았던 점을 남겼어요',
      })
    );
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('감상평을 완료로 기록했어요'),
      })
    );
  });

  it('shows current cycle peer review status', async () => {
    const dependencies = createDependencies();
    const command = new ReviewCommand(dependencies);
    const interaction = createInteraction('status');

    await command.execute(interaction as never);

    expect(interaction.deferReply).toHaveBeenCalledWith();
    expect(dependencies.getStatusQuery.execute).toHaveBeenCalledWith({
      cycleId: 10,
    });
    const reply = interaction.editReply.mock.calls[0][0] as { content: string };
    expect(reply.content).toContain('감상평 현황');
    expect(reply.content).toContain('남은 감상평: 1개');
  });

  it('ignores unknown subcommands without replying', async () => {
    const command = new ReviewCommand();
    const interaction = createInteraction('unknown');

    await command.execute(interaction as never);

    expect(interaction.reply).not.toHaveBeenCalled();
    expect(interaction.deferReply).not.toHaveBeenCalled();
  });
});
