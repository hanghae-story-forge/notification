import { describe, expect, it, vi } from 'vitest';
import { CycleCommand } from './CycleCommand';

type MockInteraction = {
  options: {
    getSubcommand: ReturnType<typeof vi.fn>;
    getString: ReturnType<typeof vi.fn>;
    getInteger: ReturnType<typeof vi.fn>;
  };
  deferReply: ReturnType<typeof vi.fn>;
  editReply: ReturnType<typeof vi.fn>;
};

function createInteraction(
  subcommand: 'current' | 'status' | 'create'
): MockInteraction {
  return {
    options: {
      getSubcommand: vi.fn().mockReturnValue(subcommand),
      getString: vi.fn(),
      getInteger: vi.fn(),
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

  it('defines /cycle create with generation, week, dates, and optional issue URL', () => {
    const command = new CycleCommand({} as never, {} as never);
    const json = command.definition.toJSON();

    const create = json.options?.find((option) => option.name === 'create') as
      | { options?: Array<{ name: string }> }
      | undefined;

    expect(create).toBeDefined();
    expect(create?.options?.map((option) => option.name)).toEqual([
      'organization',
      'generation',
      'week',
      'start_date',
      'end_date',
      'github_issue_url',
    ]);
  });

  it('creates a cycle for the requested generation name and tells the operator how to verify it', async () => {
    const createCycleCommand = {
      execute: vi.fn().mockResolvedValue({
        generationName: '똥글똥글 3기',
        cycle: {
          week: { toNumber: () => 1 },
          startDate: new Date('2026-06-01T00:00:00.000Z'),
          endDate: new Date('2026-06-14T23:59:59.000Z'),
          githubIssueUrl: null,
        },
      }),
    };
    const generationLookup = {
      findGenerationByOrganizationAndName: vi.fn().mockResolvedValue({ id: 3 }),
    };
    const command = new CycleCommand(
      {} as never,
      createCycleCommand as never,
      generationLookup
    );
    const interaction = createInteraction('create');
    interaction.options.getString = vi.fn((name: string) => {
      const values: Record<string, string> = {
        organization: 'donguel-donguel',
        generation: '똥글똥글 3기',
        start_date: '2026-06-01',
        end_date: '2026-06-14',
      };
      return values[name] ?? null;
    });
    interaction.options.getInteger = vi.fn((name: string) =>
      name === 'week' ? 1 : null
    );

    await command.execute(interaction as never);

    expect(
      generationLookup.findGenerationByOrganizationAndName
    ).toHaveBeenCalledWith('donguel-donguel', '똥글똥글 3기');
    expect(createCycleCommand.execute).toHaveBeenCalledWith({
      organizationSlug: 'donguel-donguel',
      generationId: 3,
      week: 1,
      startDate: new Date('2026-06-01T00:00:00.000Z'),
      endDate: new Date('2026-06-14T23:59:59.000Z'),
      githubIssueUrl: undefined,
    });
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('/cycle list'),
      })
    );
  });

  it('rejects an invalid cycle date before calling the application command', async () => {
    const createCycleCommand = { execute: vi.fn() };
    const generationLookup = {
      findGenerationByOrganizationAndName: vi.fn().mockResolvedValue({ id: 3 }),
    };
    const command = new CycleCommand(
      {} as never,
      createCycleCommand as never,
      generationLookup
    );
    const interaction = createInteraction('create');
    interaction.options.getString = vi.fn((name: string) => {
      const values: Record<string, string> = {
        organization: 'donguel-donguel',
        generation: '똥글똥글 3기',
        start_date: '2026-06-99',
        end_date: '2026-06-14',
      };
      return values[name] ?? null;
    });
    interaction.options.getInteger = vi.fn((name: string) =>
      name === 'week' ? 1 : null
    );

    await command.execute(interaction as never);

    expect(createCycleCommand.execute).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('YYYY-MM-DD'),
      })
    );
  });
});
