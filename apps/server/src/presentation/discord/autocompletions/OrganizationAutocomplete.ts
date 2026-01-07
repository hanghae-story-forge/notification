import { AutocompleteInteraction } from 'discord.js';
import { OrganizationRepository } from '@/domain/organization/organization.repository';

export class OrganizationAutocomplete {
  constructor(private readonly organizationRepo: OrganizationRepository) {}

  async execute(interaction: AutocompleteInteraction): Promise<void> {
    const focusedValue = interaction.options.getFocused();
    const organizations = await this.organizationRepo.findActive();

    const filtered = organizations
      .filter(
        (org) =>
          org.slug.value.includes(focusedValue) ||
          org.name.value.includes(focusedValue)
      )
      .slice(0, 25) // Discord 최대 25개
      .map((org) => ({
        name: `${org.name.value} (${org.slug.value})`,
        value: org.slug.value,
      }));

    await interaction.respond(filtered);
  }
}
