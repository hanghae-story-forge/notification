import { describe, expect, it, vi, afterEach } from 'vitest';
import { MeCommand } from './MeCommand';

type MockInteraction = {
  user?: { id: string };
  options: {
    getSubcommand: ReturnType<typeof vi.fn>;
  };
  deferReply: ReturnType<typeof vi.fn>;
  editReply: ReturnType<typeof vi.fn>;
};

function createInteraction(subcommand: 'info' | 'organizations' | 'generations' | 'unknown' = 'info'): MockInteraction {
  return {
    user: { id: '328388086574874627' },
    options: {
      getSubcommand: vi.fn().mockReturnValue(subcommand),
    },
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
  };
}

function createMember(overrides: Record<string, unknown> = {}) {
  return {
    id: { value: 1 },
    name: { value: '박준형' },
    discordUsername: { value: 'bbak_jun' },
    githubUsername: { value: 'BBAK-jun' },
    ...overrides,
  };
}

function createRepos(member = createMember()) {
  return {
    memberRepo: {
      findByDiscordId: vi.fn().mockResolvedValue(member),
    },
    organizationMemberRepo: {
      findByMember: vi.fn().mockResolvedValue([
        { status: { value: 'APPROVED' } },
        { status: { value: 'PENDING' } },
      ]),
      findByMemberWithOrganizations: vi.fn().mockResolvedValue([]),
    },
    generationMemberRepo: {
      findByMember: vi.fn().mockResolvedValue([{ id: { value: 1 } }]),
      findByMemberWithGenerations: vi.fn().mockResolvedValue([]),
    },
  };
}

function createCommand(repos = createRepos(), getCycleStatusQuery?: Record<string, unknown>) {
  return new MeCommand(
    repos.memberRepo as never,
    repos.organizationMemberRepo as never,
    repos.generationMemberRepo as never,
    getCycleStatusQuery as never
  );
}

function currentCycle(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    week: 7,
    generationName: '똥글똥글 2기',
    startDate: '2026-04-26T15:00:00.000Z',
    endDate: '2026-05-10T14:59:59.000Z',
    githubIssueUrl: 'https://github.com/hanghae-story-forge/archive/issues/16',
    daysLeft: 13,
    hoursLeft: 3,
    ...overrides,
  };
}

describe('MeCommand', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ignores unknown subcommands without replying', async () => {
    const command = createCommand();
    const interaction = createInteraction('unknown');

    await command.execute(interaction as never);

    expect(interaction.deferReply).not.toHaveBeenCalled();
    expect(interaction.editReply).not.toHaveBeenCalled();
  });

  it('shows my profile as an action-oriented dashboard with current cycle and submitted status', async () => {
    const repos = createRepos();
    const getCycleStatusQuery = {
      getCurrentCycle: vi.fn().mockResolvedValue(currentCycle()),
      getCycleParticipantNames: vi.fn().mockResolvedValue({
        cycleName: '똥글똥글 2기 - 7주차',
        submittedNames: ['박준형'],
        notSubmittedNames: ['김항해'],
        endDate: new Date('2026-05-10T14:59:59.000Z'),
      }),
    };
    const command = createCommand(repos, getCycleStatusQuery);
    const interaction = createInteraction();

    await command.execute(interaction as never);

    expect(getCycleStatusQuery.getCurrentCycle).toHaveBeenCalledWith('donguel-donguel');
    expect(getCycleStatusQuery.getCycleParticipantNames).toHaveBeenCalledWith(1, 'donguel-donguel');
    const reply = interaction.editReply.mock.calls.at(-1)?.[0] as {
      content: string;
      components?: unknown[];
    };
    expect(reply.content).toContain('내 스터디 대시보드');
    expect(reply.content).toContain('똥글똥글 2기 7주차');
    expect(reply.content).toContain('마감까지 13일 3시간');
    expect(reply.content).toContain('내 제출 상태: ✅ 제출 완료');
    expect(reply.content).toContain('다음 행동');
    expect(reply.content).toContain('/cycle status');
    expect(reply.components).toEqual(expect.any(Array));
  });

  it('shows my profile as not submitted when my name is still missing from submissions', async () => {
    const repos = createRepos();
    const getCycleStatusQuery = {
      getCurrentCycle: vi.fn().mockResolvedValue(currentCycle({ daysLeft: 0, hoursLeft: 1 })),
      getCycleParticipantNames: vi.fn().mockResolvedValue({
        cycleName: '똥글똥글 2기 - 7주차',
        submittedNames: ['김항해'],
        notSubmittedNames: ['박준형'],
        endDate: new Date('2026-05-10T14:59:59.000Z'),
      }),
    };
    const command = createCommand(repos, getCycleStatusQuery);
    const interaction = createInteraction();

    await command.execute(interaction as never);

    const reply = interaction.editReply.mock.calls.at(-1)?.[0] as { content: string };
    expect(reply.content).toContain('마감까지 0일 1시간');
    expect(reply.content).toContain('내 제출 상태: ⏳ 아직 제출 전');
    expect(reply.content).toContain('GitHub 이슈에 제출 링크를 댓글로 남겨 주세요');
  });

  it('shows day-level remaining time when hour information is missing', async () => {
    const repos = createRepos();
    const getCycleStatusQuery = {
      getCurrentCycle: vi.fn().mockResolvedValue(currentCycle({ daysLeft: 5, hoursLeft: undefined })),
      getCycleParticipantNames: vi.fn().mockResolvedValue({
        cycleName: '똥글똥글 2기 - 7주차',
        submittedNames: ['박준형'],
        notSubmittedNames: [],
        endDate: new Date('2026-05-10T14:59:59.000Z'),
      }),
    };
    const command = createCommand(repos, getCycleStatusQuery);
    const interaction = createInteraction();

    await command.execute(interaction as never);

    const reply = interaction.editReply.mock.calls.at(-1)?.[0] as { content: string };
    expect(reply.content).toContain('마감까지 5일');
  });

  it('explains when the current cycle has no GitHub issue link yet', async () => {
    const repos = createRepos();
    const getCycleStatusQuery = {
      getCurrentCycle: vi.fn().mockResolvedValue(currentCycle({ githubIssueUrl: null })),
      getCycleParticipantNames: vi.fn().mockResolvedValue({
        cycleName: '똥글똥글 2기 - 7주차',
        submittedNames: ['박준형'],
        notSubmittedNames: [],
        endDate: new Date('2026-05-10T14:59:59.000Z'),
      }),
    };
    const command = createCommand(repos, getCycleStatusQuery);
    const interaction = createInteraction();

    await command.execute(interaction as never);

    const reply = interaction.editReply.mock.calls.at(-1)?.[0] as {
      content: string;
      components?: unknown[];
    };
    expect(reply.content).toContain('아직 연결된 이슈가 없어요');
    expect(reply.components).toEqual([]);
  });

  it('shows unknown submission status when participant names cannot be loaded', async () => {
    const repos = createRepos();
    const getCycleStatusQuery = {
      getCurrentCycle: vi.fn().mockResolvedValue(currentCycle({ daysLeft: 0, hoursLeft: 0 })),
      getCycleParticipantNames: vi.fn().mockResolvedValue(null),
    };
    const command = createCommand(repos, getCycleStatusQuery);
    const interaction = createInteraction();

    await command.execute(interaction as never);

    const reply = interaction.editReply.mock.calls.at(-1)?.[0] as { content: string };
    expect(reply.content).toContain('오늘 마감');
    expect(reply.content).toContain('내 제출 상태: 확인 불가');
  });

  it('guides users without GitHub or current cycle to connect their account first', async () => {
    const repos = createRepos(createMember({ githubUsername: null, discordUsername: null }));
    const getCycleStatusQuery = {
      getCurrentCycle: vi.fn().mockResolvedValue(null),
    };
    const command = createCommand(repos, getCycleStatusQuery);
    const interaction = createInteraction();

    await command.execute(interaction as never);

    const reply = interaction.editReply.mock.calls.at(-1)?.[0] as {
      content: string;
      components?: unknown[];
    };
    expect(reply.content).toContain('Discord**: 미설정');
    expect(reply.content).toContain('GitHub 계정이 아직 연결되지 않았어요');
    expect(reply.content).toContain('진행 중인 주차를 찾지 못했어요');
    expect(reply.content).toContain('GitHub 계정을 먼저 연결해 주세요');
    expect(reply.components).toEqual([]);
  });

  it('guides info users to join an organization when they are not approved in any organization', async () => {
    const repos = createRepos();
    repos.organizationMemberRepo.findByMember.mockResolvedValue([]);
    const getCycleStatusQuery = {
      getCurrentCycle: vi.fn().mockResolvedValue(null),
    };
    const command = createCommand(repos, getCycleStatusQuery);
    const interaction = createInteraction();

    await command.execute(interaction as never);

    const reply = interaction.editReply.mock.calls.at(-1)?.[0] as { content: string };
    expect(reply.content).toContain('승인된 조직**: 0개');
    expect(reply.content).toContain('조직 가입이 필요해요');
    expect(reply.content).toContain('/organization join');
    expect(reply.content).toContain('/me organizations');
  });

  it('guides info users to wait for approval when organization membership is still pending', async () => {
    const repos = createRepos();
    repos.organizationMemberRepo.findByMember.mockResolvedValue([
      { status: { value: 'PENDING' } },
    ]);
    const getCycleStatusQuery = {
      getCurrentCycle: vi.fn().mockResolvedValue(null),
    };
    const command = createCommand(repos, getCycleStatusQuery);
    const interaction = createInteraction();

    await command.execute(interaction as never);

    const reply = interaction.editReply.mock.calls.at(-1)?.[0] as { content: string };
    expect(reply.content).toContain('조직 승인 대기 중이에요');
    expect(reply.content).toContain('운영진 승인 후');
    expect(reply.content).toContain('/me organizations');
  });

  it('shows dashboard without current-cycle lookup when the query is not injected', async () => {
    const command = createCommand(createRepos());
    const interaction = createInteraction();

    await command.execute(interaction as never);

    const reply = interaction.editReply.mock.calls.at(-1)?.[0] as { content: string };
    expect(reply.content).toContain('진행 중인 주차를 찾지 못했어요');
  });

  it('stops info flow when defer fails', async () => {
    const command = createCommand();
    const interaction = createInteraction();
    interaction.deferReply.mockRejectedValue(new Error('expired'));

    await command.execute(interaction as never);

    expect(interaction.editReply).not.toHaveBeenCalled();
  });

  it('tells info users when Discord user context is missing', async () => {
    const command = createCommand();
    const interaction = createInteraction();
    delete interaction.user;

    await command.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith({
      content: '❌ 사용자 정보를 가져올 수 없습니다.',
    });
  });

  it('tells unregistered users exactly what to do next', async () => {
    const repos = createRepos(null);
    const command = createCommand(repos, { getCurrentCycle: vi.fn() });
    const interaction = createInteraction();

    await command.execute(interaction as never);

    const reply = interaction.editReply.mock.calls.at(-1)?.[0] as { content: string };
    expect(reply.content).toContain('아직 회원 등록이 필요해요');
    expect(reply.content).toContain('/member create');
    expect(reply.content).toContain('GitHub 계정');
  });

  it('returns an info error when lookup fails and swallows failed error replies', async () => {
    const repos = createRepos();
    repos.memberRepo.findByDiscordId.mockRejectedValue(new Error('db down'));
    const command = createCommand(repos);
    const interaction = createInteraction();
    interaction.editReply.mockRejectedValue(new Error('reply failed'));

    await expect(command.execute(interaction as never)).resolves.toBeUndefined();
  });

  it('lists organizations with readable status emojis', async () => {
    const repos = createRepos();
    repos.organizationMemberRepo.findByMemberWithOrganizations.mockResolvedValue([
      {
        organizationMember: { status: { value: 'APPROVED' }, role: { value: 'MEMBER' }, joinedAt: '2026-01-01T00:00:00.000Z' },
        organization: { name: '똥글똥글' },
      },
      {
        organizationMember: { status: { value: 'PENDING' }, role: { value: 'MEMBER' }, joinedAt: '2026-01-02T00:00:00.000Z' },
        organization: { name: '대기 조직' },
      },
      {
        organizationMember: { status: { value: 'REJECTED' }, role: { value: 'MEMBER' }, joinedAt: '2026-01-03T00:00:00.000Z' },
        organization: { name: '거절 조직' },
      },
      {
        organizationMember: { status: { value: 'APPROVED' }, role: { value: 'MEMBER' }, joinedAt: '2026-01-04T00:00:00.000Z' },
        organization: null,
      },
    ]);
    const command = createCommand(repos);
    const interaction = createInteraction('organizations');

    await command.execute(interaction as never);

    const reply = interaction.editReply.mock.calls.at(-1)?.[0] as { content: string };
    expect(reply.content).toContain('✅ **똥글똥글**');
    expect(reply.content).toContain('⏳ **대기 조직**');
    expect(reply.content).toContain('❌ **거절 조직**');
  });

  it('guides users with no organizations', async () => {
    const command = createCommand(createRepos());
    const interaction = createInteraction('organizations');

    await command.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith({
      content: '📋 아직 소속된 조직이 없습니다.\n\n`/organization join` 명령어로 조직에 가입 신청을 해주세요!',
    });
  });

  it('handles organizations edge and error paths', async () => {
    const command = createCommand(createRepos());

    const deferFailed = createInteraction('organizations');
    deferFailed.deferReply.mockRejectedValue(new Error('expired'));
    await command.execute(deferFailed as never);
    expect(deferFailed.editReply).not.toHaveBeenCalled();

    const noUser = createInteraction('organizations');
    delete noUser.user;
    await command.execute(noUser as never);
    expect(noUser.editReply).toHaveBeenCalledWith({ content: '❌ 사용자 정보를 가져올 수 없습니다.' });

    const missingMemberRepos = createRepos(null);
    const missingMember = createInteraction('organizations');
    await createCommand(missingMemberRepos).execute(missingMember as never);
    expect(missingMember.editReply).toHaveBeenCalledWith({ content: '❌ 회원 정보를 찾을 수 없습니다.' });

    const throwingRepos = createRepos();
    throwingRepos.organizationMemberRepo.findByMemberWithOrganizations.mockRejectedValue(new Error('db down'));
    const errorInteraction = createInteraction('organizations');
    await createCommand(throwingRepos).execute(errorInteraction as never);
    expect(errorInteraction.editReply).toHaveBeenCalledWith({ content: '❌ 조직 목록 조회 중 오류가 발생했습니다.' });

    const failedErrorReply = createInteraction('organizations');
    failedErrorReply.editReply.mockRejectedValue(new Error('reply failed'));
    await expect(createCommand(throwingRepos).execute(failedErrorReply as never)).resolves.toBeUndefined();
  });

  it('lists generations with active and inactive states', async () => {
    const repos = createRepos();
    repos.generationMemberRepo.findByMemberWithGenerations.mockResolvedValue([
      {
        generation: { name: '똥글똥글 2기', startedAt: '2026-01-01T00:00:00.000Z', isActive: true },
        organization: { name: '똥글똥글' },
      },
      {
        generation: { name: '똥글똥글 1기', startedAt: '2025-01-01T00:00:00.000Z', isActive: false },
        organization: null,
      },
      {
        generation: null,
        organization: { name: '무시될 조직' },
      },
    ]);
    const command = createCommand(repos);
    const interaction = createInteraction('generations');

    await command.execute(interaction as never);

    const reply = interaction.editReply.mock.calls.at(-1)?.[0] as { content: string };
    expect(reply.content).toContain('🎯 **똥글똥글 2기**');
    expect(reply.content).toContain('조직: 똥글똥글');
    expect(reply.content).toContain('상태: 활성중 ✅');
    expect(reply.content).toContain('🎯 **똥글똥글 1기**');
    expect(reply.content).toContain('상태: 종료됨');
  });

  it('guides users with no generations', async () => {
    const command = createCommand(createRepos());
    const interaction = createInteraction('generations');

    await command.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith({
      content: '📋 아직 참여 중인 기수가 없습니다.\n\n`/generation join` 명령어로 기수에 참여해주세요!',
    });
  });

  it('handles generations edge and error paths', async () => {
    const command = createCommand(createRepos());

    const deferFailed = createInteraction('generations');
    deferFailed.deferReply.mockRejectedValue(new Error('expired'));
    await command.execute(deferFailed as never);
    expect(deferFailed.editReply).not.toHaveBeenCalled();

    const noUser = createInteraction('generations');
    delete noUser.user;
    await command.execute(noUser as never);
    expect(noUser.editReply).toHaveBeenCalledWith({ content: '❌ 사용자 정보를 가져올 수 없습니다.' });

    const missingMemberRepos = createRepos(null);
    const missingMember = createInteraction('generations');
    await createCommand(missingMemberRepos).execute(missingMember as never);
    expect(missingMember.editReply).toHaveBeenCalledWith({ content: '❌ 회원 정보를 찾을 수 없습니다.' });

    const throwingRepos = createRepos();
    throwingRepos.generationMemberRepo.findByMemberWithGenerations.mockRejectedValue(new Error('db down'));
    const errorInteraction = createInteraction('generations');
    await createCommand(throwingRepos).execute(errorInteraction as never);
    expect(errorInteraction.editReply).toHaveBeenCalledWith({ content: '❌ 기수 목록 조회 중 오류가 발생했습니다.' });

    const failedErrorReply = createInteraction('generations');
    failedErrorReply.editReply.mockRejectedValue(new Error('reply failed'));
    await expect(createCommand(throwingRepos).execute(failedErrorReply as never)).resolves.toBeUndefined();
  });
});
