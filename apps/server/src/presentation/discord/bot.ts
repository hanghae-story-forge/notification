import { Client, GatewayIntentBits } from 'discord.js';
import { createCommands } from './commands';
import { registerSlashCommands } from './commands/index';
import { DiscordCommand } from './commands/types';
import { logger } from '@/infrastructure/lib/logger';

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

commands.forEach((cmd) => {
  commandMap.set(cmd.definition.toJSON().name, cmd);
});

// Lazy getters for autocomplete handlers to ensure DI is registered first
const getOrganizationAutocomplete = (): OrganizationAutocomplete => {
  return container.resolve<OrganizationAutocomplete>(
    ORGANIZATION_AUTOCOMPLETE_TOKEN
  );
};

const getGenerationAutocomplete = (): GenerationAutocomplete => {
  return container.resolve<GenerationAutocomplete>(
    GENERATION_AUTOCOMPLETE_TOKEN
  );
};

export const createDiscordBot = (): Client => {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  // Global error handlers to prevent process crashes
  client.on('error', (error) => {
    logger.discord.error('Discord client error', error);
  });

  // Handle unhandled rejections from Discord.js
  client.on('shardError', (error) => {
    logger.discord.error('Discord shard error', error);
  });

  client.once('ready', () => {
    logger.discord.info('Discord Bot logged in', {
      tag: client.user?.tag,
      id: client.user?.id,
      guilds: client.guilds.cache.size,
    });
  });

  client.on('interactionCreate', async (interaction) => {
    // Autocomplete handling
    if (interaction.isAutocomplete()) {
      const { options } = interaction;

      if (options.getFocused(true).name === 'organization') {
        try {
          await getOrganizationAutocomplete().execute(interaction);
        } catch (error) {
          logger.discord.error('Organization autocomplete error', error, {
            user: interaction.user.id,
          });
        }
        return;
      }

      if (options.getFocused(true).name === 'generation') {
        try {
          await getGenerationAutocomplete().execute(interaction);
        } catch (error) {
          logger.discord.error('Generation autocomplete error', error, {
            user: interaction.user.id,
          });
        }
        return;
      }

      return;
    }

    // Command handling
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    const startTime = Date.now();
    const userId = interaction.user.id;
    const username = interaction.user.username;

    logger.discord.discordCommand(commandName, username);

    const command = commandMap.get(commandName);
    if (command) {
      try {
        await command.execute(interaction);
        const duration = Date.now() - startTime;
        logger.discord.discordCommandSuccess(commandName, duration, {
          userId,
          username,
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.discord.discordCommandError(commandName, error, {
          userId,
          username,
          duration: `${duration}ms`,
        });

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
            logger.discord.error('Error sending error response', replyError, {
              command: commandName,
              userId,
            });
          }
        }
      }
    } else {
      logger.discord.warn('Unknown command received', {
        command: commandName,
        userId,
        username,
      });
    }
  });

  return client;
};

export { registerSlashCommands };
