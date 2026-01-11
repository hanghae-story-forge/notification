import { AutocompleteInteraction } from 'discord.js';
import { GenerationRepository } from '@/domain/generation/generation.repository';
import { OrganizationRepository } from '@/domain/organization/organization.repository';

export class GenerationAutocomplete {
  constructor(
    private readonly generationRepo: GenerationRepository,
    private readonly organizationRepo: OrganizationRepository
  ) {}

  async execute(interaction: AutocompleteInteraction): Promise<void> {
    const focusedValue = interaction.options.getFocused();

    // organization 옵션이 있는 경우 해당 조직의 기수만 표시
    const organizationSlug = interaction.options.getString('organization');

    let generations;

    if (organizationSlug) {
      // 조직으로 필터링
      const organization =
        await this.organizationRepo.findBySlug(organizationSlug);
      if (organization) {
        generations = await this.generationRepo.findByOrganization(
          organization.id.value
        );
      } else {
        generations = [];
      }
    } else {
      // 모든 기수 표시
      generations = await this.generationRepo.findAll();
    }

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
