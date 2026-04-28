import { describe, expect, it, vi, afterEach } from 'vitest';
import { DiscordAPIError } from 'discord.js';
import { CycleCommand } from './CycleCommand';

type MockInteraction = {
  options: {
    getSubcommand: ReturnType<typeof vi.fn>;
    getString: ReturnType<typeof vi.fn>;
  };
  deferReply: ReturnType<typeof vi.fn>;
  editReply: ReturnType<typeof vi.fn>;
};

function createInteraction(
  subcommand: 'current' | 'status' | 'list' | 'unknown',
  strings: Record<string, string> = {}
): MockInteraction {
  return {
    options: {
      getSubcommand: vi.fn().mockReturnValue(subcommand),
      getString: vi.fn((name: string) => strings[name]),
    },
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
  };
}

describe('CycleCommand', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('ignores unknown subcommands without replying', async () => {
    const command = new CycleCommand({} as never);
    const interaction = createInteraction('unknown');

    await command.execute(interaction as never);

    expect(interaction.deferReply).not.toHaveBeenCalled();
    expect(interaction.editReply).not.toHaveBeenCalled();
  });

  it('uses the canonical donguel-donguel organization slug when looking up the current cycle', async () => {
    const getCurrentCycle = vi.fn().mockResolvedValue({
      id: 1,
      week: 7,
      generationName: '똥글똥글 2기',
      startDate: '2026-04-26T15:00:00.000Z',
      endDate: '2026-05-10T14:59:59.000Z',
      githubIssueUrl:
        'https://github.com/hanghae-story-forge/archive/issues/16',
      daysLeft: 13,
    });
    const command = new CycleCommand({ getCurrentCycle } as never);
    const interaction = createInteraction('current');

    await command.execute(interaction as never);

    expect(getCurrentCycle).toHaveBeenCalledWith('donguel-donguel');
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('7주차'),
      })
    );
  });

  it('shows the current cycle as an action-oriented guide with the issue link', async () => {
    const issueUrl = 'https://github.com/hanghae-story-forge/archive/issues/16';
    const getCurrentCycle = vi.fn().mockResolvedValue({
      id: 1,
      week: 7,
      generationName: '똥글똥글 2기',
      startDate: '2026-04-26T15:00:00.000Z',
      endDate: '2026-05-10T14:59:59.000Z',
      githubIssueUrl: issueUrl,
      daysLeft: 13,
      hoursLeft: 3,
    });
    const command = new CycleCommand({ getCurrentCycle } as never);
    const interaction = createInteraction('current');

    await command.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('다음 행동'),
        components: expect.any(Array),
      })
    );
    const reply = interaction.editReply.mock.calls.at(-1)?.[0] as {
      content: string;
    };
    expect(reply.content).toContain('마감까지 13일 3시간');
    expect(reply.content).toContain(issueUrl);
    expect(reply.content).toContain('/me info');
  });

  it('shows concrete submission steps and a comment example for the current cycle', async () => {
    const getCurrentCycle = vi.fn().mockResolvedValue({
      id: 1,
      week: 7,
      generationName: '똥글똥글 2기',
      startDate: '2026-04-26T15:00:00.000Z',
      endDate: '2026-05-10T14:59:59.000Z',
      githubIssueUrl:
        'https://github.com/hanghae-story-forge/archive/issues/16',
      daysLeft: 0,
      hoursLeft: 0,
    });
    const command = new CycleCommand({ getCurrentCycle } as never);
    const interaction = createInteraction('current');

    await command.execute(interaction as never);

    const reply = interaction.editReply.mock.calls.at(-1)?.[0] as {
      content: string;
    };
    expect(reply.content).toContain('제출 방법');
    expect(reply.content).toContain('댓글 예시');
    expect(reply.content).toContain('https://my-blog.com/my-post');
    expect(reply.content).toContain('오늘 마감');
  });

  it('shows hour-level remaining time even when the deadline is within the same day', async () => {
    const getCurrentCycle = vi.fn().mockResolvedValue({
      id: 1,
      week: 7,
      generationName: '똥글똥글 2기',
      endDate: '2026-05-10T14:59:59.000Z',
      githubIssueUrl:
        'https://github.com/hanghae-story-forge/archive/issues/16',
      daysLeft: 0,
      hoursLeft: 1,
    });
    const command = new CycleCommand({ getCurrentCycle } as never);
    const interaction = createInteraction('current');

    await command.execute(interaction as never);

    const reply = interaction.editReply.mock.calls.at(-1)?.[0] as {
      content: string;
    };
    expect(reply.content).toContain('마감까지 0일 1시간');
  });

  it('explains the missing issue-link state without rendering a button', async () => {
    const getCurrentCycle = vi.fn().mockResolvedValue({
      id: 1,
      week: 7,
      generationName: '똥글똥글 2기',
      startDate: '2026-04-26T15:00:00.000Z',
      endDate: '2026-05-10T14:59:59.000Z',
      githubIssueUrl: null,
      daysLeft: 1,
    });
    const command = new CycleCommand({ getCurrentCycle } as never);
    const interaction = createInteraction('current');

    await command.execute(interaction as never);

    const reply = interaction.editReply.mock.calls.at(-1)?.[0] as {
      content: string;
      components?: unknown[];
    };
    expect(reply.content).toContain(
      '아직 이번 주차 GitHub 이슈가 연결되지 않았어요'
    );
    expect(reply.content).toContain('참여자라면');
    expect(reply.content).toContain('운영자라면');
    expect(reply.components).toEqual([]);
  });

  it('shows a progress-focused status message for the current cycle', async () => {
    const getCurrentCycle = vi.fn().mockResolvedValue({
      id: 1,
      week: 7,
      generationName: '똥글똥글 2기',
      startDate: '2026-04-26T15:00:00.000Z',
      endDate: '2026-05-10T14:59:59.000Z',
      githubIssueUrl:
        'https://github.com/hanghae-story-forge/archive/issues/16',
      daysLeft: 13,
    });
    const getCycleParticipantNames = vi.fn().mockResolvedValue({
      cycleName: '똥글똥글 2기 7주차',
      submittedNames: ['박준형', '김항해'],
      notSubmittedNames: ['이프론트'],
      endDate: new Date('2026-05-10T14:59:59.000Z'),
    });
    const command = new CycleCommand({
      getCurrentCycle,
      getCycleParticipantNames,
    } as never);
    const interaction = createInteraction('status');

    await command.execute(interaction as never);

    const reply = interaction.editReply.mock.calls.at(-1)?.[0] as {
      embeds?: Array<{ description?: string }>;
    };
    expect(reply.embeds?.[0]?.description).toContain(
      '진행률: 2 / 3명 제출, 67%'
    );
  });

  it('explains missing current cycle from status with a next command', async () => {
    const getCurrentCycle = vi.fn().mockResolvedValue(null);
    const command = new CycleCommand({ getCurrentCycle } as never);
    const interaction = createInteraction('status');

    await command.execute(interaction as never);

    const reply = interaction.editReply.mock.calls.at(-1)?.[0] as {
      content: string;
    };
    expect(reply.content).toContain('현재 진행 중인 주차를 찾지 못했어요');
    expect(reply.content).toContain('/cycle current');
  });

  it('explains what to check when there is no active cycle', async () => {
    const getCurrentCycle = vi.fn().mockResolvedValue(null);
    const command = new CycleCommand({ getCurrentCycle } as never);
    const interaction = createInteraction('current');

    await command.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('운영자라면'),
      })
    );
  });

  it('uses the canonical donguel-donguel organization slug when looking up cycle status', async () => {
    const getCurrentCycle = vi.fn().mockResolvedValue({
      id: 1,
      week: 7,
      generationName: '똥글똥글 2기',
      startDate: '2026-04-26T15:00:00.000Z',
      endDate: '2026-05-10T14:59:59.000Z',
      githubIssueUrl:
        'https://github.com/hanghae-story-forge/archive/issues/16',
      daysLeft: 13,
    });
    const getCycleParticipantNames = vi.fn().mockResolvedValue({
      cycleName: '똥글똥글 2기 7주차',
      submittedNames: ['박준형'],
      notSubmittedNames: [],
      endDate: new Date('2026-05-10T14:59:59.000Z'),
    });
    const command = new CycleCommand({
      getCurrentCycle,
      getCycleParticipantNames,
    } as never);
    const interaction = createInteraction('status');

    await command.execute(interaction as never);

    expect(getCurrentCycle).toHaveBeenCalledWith('donguel-donguel');
    expect(getCycleParticipantNames).toHaveBeenCalledWith(1, 'donguel-donguel');
  });

  it('returns an actionable error when participant lookup fails', async () => {
    const command = new CycleCommand({
      getCurrentCycle: vi.fn().mockResolvedValue({ id: 1 }),
      getCycleParticipantNames: vi.fn().mockResolvedValue(null),
    } as never);
    const interaction = createInteraction('status');

    await command.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith({
      content: '❌ 제출 현황 조회 중 오류가 발생했습니다.',
    });
  });

  it('returns an error message when status lookup throws', async () => {
    const command = new CycleCommand({
      getCurrentCycle: vi.fn().mockRejectedValue(new Error('db down')),
    } as never);
    const interaction = createInteraction('status');

    await command.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith({
      content: '❌ 제출 현황 조회 중 오류가 발생했습니다.',
    });
  });

  it('stops when current interaction defer fails', async () => {
    const command = new CycleCommand({ getCurrentCycle: vi.fn() } as never);
    const interaction = createInteraction('current');
    interaction.deferReply.mockRejectedValue(new Error('expired'));

    await command.execute(interaction as never);

    expect(interaction.editReply).not.toHaveBeenCalled();
  });

  it('returns an error message when current lookup throws', async () => {
    const command = new CycleCommand({
      getCurrentCycle: vi.fn().mockRejectedValue(new Error('db down')),
    } as never);
    const interaction = createInteraction('current');

    await command.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith({
      content: '❌ 주차 정보 조회 중 오류가 발생했습니다.',
    });
  });

  it('swallows current error replies that also fail', async () => {
    const command = new CycleCommand({
      getCurrentCycle: vi.fn().mockRejectedValue(new Error('db down')),
    } as never);
    const interaction = createInteraction('current');
    interaction.editReply.mockRejectedValue(new Error('reply failed'));

    await expect(
      command.execute(interaction as never)
    ).resolves.toBeUndefined();
  });

  it('lists cycles for a generation', async () => {
    const command = new CycleCommand({} as never);
    vi.spyOn(command as any, 'findCyclesByGeneration').mockResolvedValue([
      {
        week: 7,
        startDate: new Date('2026-04-27T00:00:00.000Z'),
        endDate: new Date('2026-05-10T00:00:00.000Z'),
      },
    ]);
    const interaction = createInteraction('list', {
      organization: 'donguel-donguel',
      generation: '똥글똥글 2기',
    });

    await command.execute(interaction as never);

    const reply = interaction.editReply.mock.calls.at(-1)?.[0] as {
      content: string;
    };
    expect(reply.content).toContain('똥글똥글 2기 주차 목록');
    expect(reply.content).toContain('7주차');
  });

  it('explains when no cycles exist for a generation', async () => {
    const command = new CycleCommand({} as never);
    vi.spyOn(command as any, 'findCyclesByGeneration').mockResolvedValue([]);
    const interaction = createInteraction('list', {
      organization: 'donguel-donguel',
      generation: '똥글똥글 2기',
    });

    await command.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith({
      content: '❌ "똥글똥글 2기"의 주차 정보를 찾을 수 없습니다.',
    });
  });

  it('explains when cycle list lookup returns null', async () => {
    const command = new CycleCommand({} as never);
    vi.spyOn(command as any, 'findCyclesByGeneration').mockResolvedValue(null);
    const interaction = createInteraction('list', {
      organization: 'donguel-donguel',
      generation: '똥글똥글 2기',
    });

    await command.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith({
      content: '❌ "똥글똥글 2기"의 주차 정보를 찾을 수 없습니다.',
    });
  });

  it('returns an error message when cycle list lookup throws', async () => {
    const command = new CycleCommand({} as never);
    vi.spyOn(command as any, 'findCyclesByGeneration').mockRejectedValue(
      new Error('db down')
    );
    const interaction = createInteraction('list', {
      organization: 'donguel-donguel',
      generation: '똥글똥글 2기',
    });

    await command.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith({
      content: '❌ 주차 정보 조회 중 오류가 발생했습니다.',
    });
  });

  it('swallows cycle list error replies that also fail', async () => {
    const command = new CycleCommand({} as never);
    vi.spyOn(command as any, 'findCyclesByGeneration').mockRejectedValue(
      new Error('db down')
    );
    const interaction = createInteraction('list', {
      organization: 'donguel-donguel',
      generation: '똥글똥글 2기',
    });
    interaction.editReply.mockRejectedValue(new Error('reply failed'));

    await expect(
      command.execute(interaction as never)
    ).resolves.toBeUndefined();
  });

  it('stops when cycle list defer fails', async () => {
    const command = new CycleCommand({} as never);
    const interaction = createInteraction('list');
    interaction.deferReply.mockRejectedValue(new Error('expired'));

    await command.execute(interaction as never);

    expect(interaction.editReply).not.toHaveBeenCalled();
  });

  it('silently ignores Discord interaction expiry while listing cycles', async () => {
    const command = new CycleCommand({} as never);
    const interaction = createInteraction('list');
    interaction.deferReply.mockRejectedValue(
      new DiscordAPIError(
        { message: 'Unknown interaction', code: 10062 } as never,
        10062,
        404,
        'POST',
        '/interactions',
        {}
      )
    );

    await command.execute(interaction as never);

    expect(interaction.editReply).not.toHaveBeenCalled();
  });

  it('silently ignores already-acknowledged Discord interactions while listing cycles', async () => {
    const command = new CycleCommand({} as never);
    const interaction = createInteraction('list');
    interaction.deferReply.mockRejectedValue(
      new DiscordAPIError(
        { message: 'Already acknowledged', code: 40060 } as never,
        40060,
        400,
        'POST',
        '/interactions',
        {}
      )
    );

    await command.execute(interaction as never);

    expect(interaction.editReply).not.toHaveBeenCalled();
  });
});
