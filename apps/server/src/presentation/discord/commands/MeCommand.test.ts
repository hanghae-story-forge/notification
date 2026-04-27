import { describe, expect, it, vi } from 'vitest';
import { MeCommand } from './MeCommand';

type MockInteraction = {
  user: { id: string };
  options: {
    getSubcommand: ReturnType<typeof vi.fn>;
  };
  deferReply: ReturnType<typeof vi.fn>;
  editReply: ReturnType<typeof vi.fn>;
};

function createInteraction(): MockInteraction {
  return {
    user: { id: '328388086574874627' },
    options: {
      getSubcommand: vi.fn().mockReturnValue('info'),
    },
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
  };
}

describe('MeCommand', () => {
  it('shows my profile as an action-oriented dashboard with the current cycle', async () => {
    const memberRepo = {
      findByDiscordId: vi.fn().mockResolvedValue({
        id: { value: 1 },
        name: { value: '박준형' },
        discordUsername: { value: 'bbak_jun' },
        githubUsername: { value: 'BBAK-jun' },
      }),
    };
    const organizationMemberRepo = {
      findByMember: vi
        .fn()
        .mockResolvedValue([
          { status: { value: 'APPROVED' } },
          { status: { value: 'PENDING' } },
        ]),
    };
    const generationMemberRepo = {
      findByMember: vi.fn().mockResolvedValue([{ id: { value: 1 } }]),
    };
    const getCycleStatusQuery = {
      getCurrentCycle: vi.fn().mockResolvedValue({
        id: 1,
        week: 7,
        generationName: '똥글똥글 2기',
        startDate: '2026-04-26T15:00:00.000Z',
        endDate: '2026-05-10T14:59:59.000Z',
        githubIssueUrl:
          'https://github.com/hanghae-story-forge/archive/issues/16',
        daysLeft: 13,
        hoursLeft: 3,
      }),
    };
    const command = new MeCommand(
      memberRepo as never,
      organizationMemberRepo as never,
      generationMemberRepo as never,
      getCycleStatusQuery as never
    );
    const interaction = createInteraction();

    await command.execute(interaction as never);

    expect(getCycleStatusQuery.getCurrentCycle).toHaveBeenCalledWith(
      'donguel-donguel'
    );
    const reply = interaction.editReply.mock.calls.at(-1)?.[0] as {
      content: string;
      components?: unknown[];
    };
    expect(reply.content).toContain('내 스터디 대시보드');
    expect(reply.content).toContain('똥글똥글 2기 7주차');
    expect(reply.content).toContain('마감까지 13일 3시간');
    expect(reply.content).toContain('다음 행동');
    expect(reply.content).toContain('/cycle status');
    expect(reply.components).toEqual(expect.any(Array));
  });

  it('tells unregistered users exactly what to do next', async () => {
    const memberRepo = {
      findByDiscordId: vi.fn().mockResolvedValue(null),
    };
    const command = new MeCommand(
      memberRepo as never,
      { findByMember: vi.fn() } as never,
      { findByMember: vi.fn() } as never,
      { getCurrentCycle: vi.fn() } as never
    );
    const interaction = createInteraction();

    await command.execute(interaction as never);

    const reply = interaction.editReply.mock.calls.at(-1)?.[0] as {
      content: string;
    };
    expect(reply.content).toContain('아직 회원 등록이 필요해요');
    expect(reply.content).toContain('/member create');
    expect(reply.content).toContain('GitHub 계정');
  });
});
