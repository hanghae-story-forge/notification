import { describe, expect, it, vi } from 'vitest';
import { RecordDiscordSubmissionCommand } from './record-discord-submission.command';
import { Member } from '@/domain/member/member.domain';
import { Organization } from '@/domain/organization/organization.domain';
import { Cycle } from '@/domain/cycle/cycle.domain';
import { Generation } from '@/domain/generation/generation.domain';
import { ForbiddenError, NotFoundError } from '@/domain/common/errors';

function createMember() {
  return Member.reconstitute({
    id: 7,
    discordId: 'discord-user-1',
    discordUsername: 'bbakjun',
    githubUsername: 'bbakjun',
    name: '박준형',
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
  });
}

function createOrganization() {
  return Organization.reconstitute({
    id: 3,
    name: '똥글똥글',
    slug: 'donguel-donguel',
    discordWebhookUrl: null,
    isActive: true,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
  });
}

function createCycle() {
  return Cycle.reconstitute({
    id: 11,
    generationId: 5,
    week: 8,
    startDate: new Date('2026-05-11T00:00:00.000Z'),
    endDate: new Date('2026-05-24T23:59:59.000Z'),
    githubIssueUrl: 'https://github.com/hanghae-story-forge/archive/issues/17',
    createdAt: new Date('2026-05-11T00:00:00.000Z'),
  });
}

function createGeneration() {
  return Generation.reconstitute({
    id: 5,
    organizationId: 3,
    name: '똥글똥글 2기',
    startedAt: new Date('2026-02-01T00:00:00.000Z'),
    isActive: true,
    createdAt: new Date('2026-02-01T00:00:00.000Z'),
  });
}

function createCommand(
  overrides: Partial<{
    organizationRepo: unknown;
    memberRepo: unknown;
    cycleRepo: unknown;
    generationRepo: unknown;
    organizationMemberRepo: unknown;
    submissionRepo: unknown;
    submissionService: unknown;
  }> = {}
) {
  const organization = createOrganization();
  const member = createMember();
  const cycle = createCycle();
  const generation = createGeneration();
  const submissionRepo = {
    save: vi.fn().mockResolvedValue(undefined),
  };

  return {
    command: new RecordDiscordSubmissionCommand(
      (overrides.organizationRepo ?? {
        findBySlug: vi.fn().mockResolvedValue(organization),
      }) as never,
      (overrides.memberRepo ?? {
        findByDiscordId: vi.fn().mockResolvedValue(member),
      }) as never,
      (overrides.cycleRepo ?? {
        findActiveCyclesByOrganization: vi.fn().mockResolvedValue([cycle]),
      }) as never,
      (overrides.generationRepo ?? {
        findById: vi.fn().mockResolvedValue(generation),
      }) as never,
      (overrides.organizationMemberRepo ?? {
        isActiveMember: vi.fn().mockResolvedValue(true),
      }) as never,
      (overrides.submissionRepo ?? submissionRepo) as never,
      (overrides.submissionService ?? {
        validateSubmission: vi.fn().mockResolvedValue(undefined),
      }) as never
    ),
    submissionRepo,
  };
}

describe('RecordDiscordSubmissionCommand', () => {
  it('records a submission for the current cycle from a Discord user', async () => {
    const { command, submissionRepo } = createCommand();

    const result = await command.execute({
      discordUserId: 'discord-user-1',
      organizationSlug: 'donguel-donguel',
      blogUrl: 'https://bbak.dev/post/study-8',
    });

    expect(submissionRepo.save).toHaveBeenCalledTimes(1);
    const savedSubmission = submissionRepo.save.mock.calls[0][0];
    expect(savedSubmission.toDTO()).toMatchObject({
      cycleId: 11,
      memberId: 7,
      url: 'https://bbak.dev/post/study-8',
      githubCommentId: 'discord:11:7:https://bbak.dev/post/study-8',
    });
    expect(result).toMatchObject({
      memberName: '박준형',
      generationName: '똥글똥글 2기',
      cycleWeek: 8,
      cycleId: 11,
      organizationSlug: 'donguel-donguel',
      statusPath: '/api/status/11?organizationSlug=donguel-donguel',
    });
  });

  it('rejects an unknown organization', async () => {
    const { command } = createCommand({
      organizationRepo: { findBySlug: vi.fn().mockResolvedValue(null) },
    });

    await expect(
      command.execute({
        discordUserId: 'discord-user-1',
        organizationSlug: 'missing-org',
        blogUrl: 'https://bbak.dev/post/study-8',
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects a Discord user who is not registered as a member', async () => {
    const { command } = createCommand({
      memberRepo: { findByDiscordId: vi.fn().mockResolvedValue(null) },
    });

    await expect(
      command.execute({
        discordUserId: 'unknown',
        organizationSlug: 'donguel-donguel',
        blogUrl: 'https://bbak.dev/post/study-8',
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects a registered Discord user who is not approved in the organization', async () => {
    const { command } = createCommand({
      organizationMemberRepo: {
        isActiveMember: vi.fn().mockResolvedValue(false),
      },
    });

    await expect(
      command.execute({
        discordUserId: 'discord-user-1',
        organizationSlug: 'donguel-donguel',
        blogUrl: 'https://bbak.dev/post/study-8',
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('rejects submission when there is no active cycle', async () => {
    const { command } = createCommand({
      cycleRepo: {
        findActiveCyclesByOrganization: vi.fn().mockResolvedValue([]),
      },
    });

    await expect(
      command.execute({
        discordUserId: 'discord-user-1',
        organizationSlug: 'donguel-donguel',
        blogUrl: 'https://bbak.dev/post/study-8',
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects submission when the active cycle generation is missing', async () => {
    const { command } = createCommand({
      generationRepo: { findById: vi.fn().mockResolvedValue(null) },
    });

    await expect(
      command.execute({
        discordUserId: 'discord-user-1',
        organizationSlug: 'donguel-donguel',
        blogUrl: 'https://bbak.dev/post/study-8',
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
