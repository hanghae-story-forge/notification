import { describe, expect, it, vi } from 'vitest';
import { SubmitCommand } from './SubmitCommand';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '@/domain/common/errors';

function createInteraction(url = 'https://bbak.dev/post/study-8') {
  return {
    user: { id: 'discord-user-1' },
    options: {
      getString: vi.fn().mockReturnValue(url),
    },
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
  };
}

describe('SubmitCommand', () => {
  it('defines /submit with a required url option', () => {
    const command = new SubmitCommand({ execute: vi.fn() } as never);

    const json = command.definition.toJSON();

    expect(json.name).toBe('submit');
    expect(json.options?.map((option) => option.name)).toEqual(['url']);
    expect(json.options?.[0]?.required).toBe(true);
  });

  it('records a Discord submission and replies with the web status path', async () => {
    const recordSubmission = {
      execute: vi.fn().mockResolvedValue({
        memberName: '박준형',
        generationName: '똥글똥글 2기',
        cycleWeek: 8,
        cycleId: 11,
        organizationSlug: 'donguel-donguel',
        submittedUrl: 'https://bbak.dev/post/study-8',
        statusPath: '/api/status/11?organizationSlug=donguel-donguel',
      }),
    };
    const command = new SubmitCommand(recordSubmission as never);
    const interaction = createInteraction();

    await command.execute(interaction as never);

    expect(recordSubmission.execute).toHaveBeenCalledWith({
      discordUserId: 'discord-user-1',
      organizationSlug: 'donguel-donguel',
      blogUrl: 'https://bbak.dev/post/study-8',
    });
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('제출 완료'),
      })
    );
    const reply = interaction.editReply.mock.calls.at(-1)?.[0] as {
      content: string;
    };
    expect(reply.content).toContain('똥글똥글 2기 8주차');
    expect(reply.content).toContain(
      '/api/status/11?organizationSlug=donguel-donguel'
    );
    expect(reply.content).toContain('/cycle status');
  });

  it('guides unregistered users to create a member profile first', async () => {
    const command = new SubmitCommand({
      execute: vi
        .fn()
        .mockRejectedValue(new NotFoundError('Member', 'discord=1')),
    } as never);
    const interaction = createInteraction();

    await command.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('/member create'),
      })
    );
  });

  it('explains that operators should check the cycle when there is no current cycle', async () => {
    const command = new SubmitCommand({
      execute: vi
        .fn()
        .mockRejectedValue(
          new NotFoundError('Active cycle', 'donguel-donguel')
        ),
    } as never);
    const interaction = createInteraction();

    await command.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('/cycle current'),
      })
    );
  });

  it('guides unapproved users to join the organization before submitting', async () => {
    const command = new SubmitCommand({
      execute: vi.fn().mockRejectedValue(new ForbiddenError('not approved')),
    } as never);
    const interaction = createInteraction();

    await command.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('/organization join'),
      })
    );
  });

  it('explains duplicate submissions can be checked with cycle status', async () => {
    const command = new SubmitCommand({
      execute: vi
        .fn()
        .mockRejectedValue(new ConflictError('Already submitted')),
    } as never);
    const interaction = createInteraction();

    await command.execute(interaction as never);

    const reply = interaction.editReply.mock.calls.at(-1)?.[0] as {
      content: string;
    };
    expect(reply.content).toContain('/cycle status');
    expect(reply.content).toContain('URL 수정이 필요하면');
  });

  it('returns a safe fallback message for unexpected errors', async () => {
    const command = new SubmitCommand({
      execute: vi.fn().mockRejectedValue(new Error('database is sleepy')),
    } as never);
    const interaction = createInteraction();

    await command.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('제출 처리 중 오류'),
      })
    );
  });
});
