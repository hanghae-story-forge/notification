import { describe, expect, it, vi } from 'vitest';
import { ReviewCommand } from './ReviewCommand';

type MockInteraction = {
  options: {
    getSubcommand: ReturnType<typeof vi.fn>;
  };
  reply: ReturnType<typeof vi.fn>;
};

function createInteraction(subcommand: 'template'): MockInteraction {
  return {
    options: {
      getSubcommand: vi.fn().mockReturnValue(subcommand),
    },
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

describe('ReviewCommand', () => {
  it('defines the review command with a template subcommand', () => {
    const commandJson = new ReviewCommand().definition.toJSON();

    expect(commandJson.name).toBe('review');
    expect(commandJson.description).toContain('감상평');
    expect(
      commandJson.options?.some((option) => option.name === 'template')
    ).toBe(true);
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

  it('ignores unknown subcommands without replying', async () => {
    const command = new ReviewCommand();
    const interaction = {
      options: {
        getSubcommand: vi.fn().mockReturnValue('unknown'),
      },
      reply: vi.fn().mockResolvedValue(undefined),
    };

    await command.execute(interaction as never);

    expect(interaction.reply).not.toHaveBeenCalled();
  });
});
