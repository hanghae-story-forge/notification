import { describe, expect, it, vi } from 'vitest';
import { CycleCommand } from './CycleCommand';

type MockInteraction = {
  options: {
    getSubcommand: ReturnType<typeof vi.fn>;
  };
  deferReply: ReturnType<typeof vi.fn>;
  editReply: ReturnType<typeof vi.fn>;
};

function createInteraction(subcommand: 'current' | 'status'): MockInteraction {
  return {
    options: {
      getSubcommand: vi.fn().mockReturnValue(subcommand),
    },
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
  };
}

describe('CycleCommand', () => {
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
});
