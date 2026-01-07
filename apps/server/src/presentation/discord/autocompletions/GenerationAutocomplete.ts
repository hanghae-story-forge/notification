import { AutocompleteInteraction } from 'discord.js';
import { GenerationRepository } from '@/domain/generation/generation.repository';

export class GenerationAutocomplete {
  constructor(private readonly generationRepo: GenerationRepository) {}

  async execute(interaction: AutocompleteInteraction): Promise<void> {
    const focusedValue = interaction.options.getFocused();
    const generations = await this.generationRepo.findAll();

    const filtered = generations
      .filter((gen) => gen.name.includes(focusedValue))
      .slice(0, 25)
      .map((gen) => ({
        name: gen.name,
        value: gen.name,
      }));

    await interaction.respond(filtered);
  }
}
