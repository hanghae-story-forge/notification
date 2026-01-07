import { Client, GatewayIntentBits } from 'discord.js';
import { createCommands } from './commands';
import { registerSlashCommands } from './commands/index';
import { DiscordCommand } from './commands/types';

// DI Container imports
import {
  container,
  ORGANIZATION_AUTOCOMPLETE_TOKEN,
  GENERATION_AUTOCOMPLETE_TOKEN,
} from '@/shared/di';

import type { OrganizationAutocomplete } from './autocompletions/OrganizationAutocomplete';
import type { GenerationAutocomplete } from './autocompletions/GenerationAutocomplete';

const commands = createCommands();
const commandMap = new Map<string, DiscordCommand>();

// Autocomplete handlers from DI container
const organizationAutocomplete = container.resolve<OrganizationAutocomplete>(
  ORGANIZATION_AUTOCOMPLETE_TOKEN
);
const generationAutocomplete = container.resolve<GenerationAutocomplete>(
  GENERATION_AUTOCOMPLETE_TOKEN
);

commands.forEach((cmd) => {
  commandMap.set(cmd.definition.toJSON().name, cmd);
});

export const createDiscordBot = (): Client => {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  // Global error handlers to prevent process crashes
  client.on('error', (error) => {
    console.error('Discord client error:', error);
  });

  // Handle unhandled rejections from Discord.js
  client.on('shardError', (error) => {
    console.error('Discord shard error:', error);
  });

  client.once('ready', () => {
    console.log(`✅ Discord Bot logged in as ${client.user?.tag}`);
  });

  client.on('interactionCreate', async (interaction) => {
    // Autocomplete handling
    if (interaction.isAutocomplete()) {
      const { options } = interaction;

      if (options.getFocused(true).name === 'organization') {
        try {
          await organizationAutocomplete.execute(interaction);
        } catch (error) {
          console.error('Error handling autocomplete:', error);
        }
        return;
      }

      if (options.getFocused(true).name === 'generation') {
        try {
          await generationAutocomplete.execute(interaction);
        } catch (error) {
          console.error('Error handling autocomplete:', error);
        }
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
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing command ${commandName}:`, error);

        // Try to send error response if interaction hasn't been replied to
        if (interaction.isRepliable()) {
          try {
            if (interaction.deferred || interaction.replied) {
              await interaction.editReply({
                content:
                  '❌ 명령 실행 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
              });
            } else {
              await interaction.reply({
                content:
                  '❌ 명령 실행 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
                ephemeral: true,
              });
            }
          } catch (replyError) {
            console.error('Error sending error response:', replyError);
          }
        }
      }
    } else {
      console.log(`⚠️  Unknown command: ${commandName}`);
    }
  });

  return client;
};

export { registerSlashCommands };
