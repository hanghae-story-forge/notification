import { describe, expect, it, vi } from 'vitest';
import { GenerationCommand } from './GenerationCommand';
import { Generation } from '@/domain/generation/generation.domain';

type MockInteraction = {
  options: {
    getSubcommand: ReturnType<typeof vi.fn>;
    getString: ReturnType<typeof vi.fn>;
    getBoolean: ReturnType<typeof vi.fn>;
  };
  deferReply: ReturnType<typeof vi.fn>;
  editReply: ReturnType<typeof vi.fn>;
};

function createInteraction(): MockInteraction {
  return {
    options: {
      getSubcommand: vi.fn().mockReturnValue('create'),
      getString: vi.fn((name: string) => {
        const values: Record<string, string> = {
          organization: 'donguel-donguel',
          name: '똥글똥글 3기',
          start_date: '2026-06-01',
        };
        return values[name] ?? null;
      }),
      getBoolean: vi.fn((name: string) => (name === 'active' ? false : null)),
    },
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
  };
}

function createCommand(createGenerationCommand: {
  execute: ReturnType<typeof vi.fn>;
}) {
  return new GenerationCommand(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    createGenerationCommand as never
  );
}

describe('GenerationCommand create', () => {
  it('defines /generation create with organization, name, start_date, and active options', () => {
    const command = createCommand({ execute: vi.fn() });
    const json = command.definition.toJSON();

    const create = json.options?.find((option) => option.name === 'create') as
      | { options?: Array<{ name: string }> }
      | undefined;

    expect(create).toBeDefined();
    expect(create?.options?.map((option) => option.name)).toEqual([
      'organization',
      'name',
      'start_date',
      'active',
    ]);
  });

  it('creates a generation through the application command and tells the operator the next command', async () => {
    const savedGeneration = Generation.reconstitute({
      id: 3,
      organizationId: 2,
      name: '똥글똥글 3기',
      startedAt: new Date('2026-06-01T00:00:00.000Z'),
      isActive: false,
      createdAt: new Date('2026-05-26T00:00:00.000Z'),
    });
    const createGenerationCommand = {
      execute: vi.fn().mockResolvedValue({ generation: savedGeneration }),
    };
    const command = createCommand(createGenerationCommand);
    const interaction = createInteraction();

    await command.execute(interaction as never);

    expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    expect(createGenerationCommand.execute).toHaveBeenCalledWith({
      organizationSlug: 'donguel-donguel',
      name: '똥글똥글 3기',
      startedAt: new Date('2026-06-01T00:00:00.000Z'),
      isActive: false,
    });
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('/cycle create'),
      })
    );
  });

  it('rejects an invalid start_date before calling the application command', async () => {
    const createGenerationCommand = { execute: vi.fn() };
    const command = createCommand(createGenerationCommand);
    const interaction = createInteraction();
    interaction.options.getString = vi.fn((name: string) => {
      const values: Record<string, string> = {
        organization: 'donguel-donguel',
        name: '똥글똥글 3기',
        start_date: 'not-a-date',
      };
      return values[name] ?? null;
    });

    await command.execute(interaction as never);

    expect(createGenerationCommand.execute).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('YYYY-MM-DD'),
      })
    );
  });
});
