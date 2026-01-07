import { Client, GatewayIntentBits } from 'discord.js';
import { createCommands } from './commands';
import { registerSlashCommands } from './commands/index';
import { DiscordCommand } from './commands/types';
import { OrganizationAutocomplete } from './autocompletions/OrganizationAutocomplete';
import { GenerationAutocomplete } from './autocompletions/GenerationAutocomplete';
import { DrizzleOrganizationRepository } from '@/infrastructure/persistence/drizzle/organization.repository.impl';
import { DrizzleGenerationRepository } from '@/infrastructure/persistence/drizzle/generation.repository.impl';

const commands = createCommands();
const commandMap = new Map<string, DiscordCommand>();

// Autocomplete handlers
const organizationRepo = new DrizzleOrganizationRepository();
const generationRepo = new DrizzleGenerationRepository();
const organizationAutocomplete = new OrganizationAutocomplete(organizationRepo);
const generationAutocomplete = new GenerationAutocomplete(generationRepo);

commands.forEach((cmd) => {
  commandMap.set(cmd.definition.toJSON().name, cmd);
});

export const createDiscordBot = (): Client => {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  client.once('ready', () => {
    console.log(`✅ Discord Bot logged in as ${client.user?.tag}`);
  });

  client.on('interactionCreate', async (interaction) => {
    // Autocomplete handling
    if (interaction.isAutocomplete()) {
      const { options } = interaction;

      if (options.getFocused(true).name === 'organization') {
        await organizationAutocomplete.execute(interaction);
        return;
      }

      if (options.getFocused(true).name === 'generation') {
        await generationAutocomplete.execute(interaction);
        return;
      }

      return;
    }

    // Command handling
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    console.log(`📝 Received command: ${commandName}`);

    const command = commandMap.get(commandName);
    if (command) {
      await command.execute(interaction);
    } else {
      console.log(`⚠️  Unknown command: ${commandName}`);
    }
  });

  return client;
};

export { registerSlashCommands };
