import {
  Client,
  GatewayIntentBits,
} from 'discord.js';
import { createCommands } from './commands';
import { registerSlashCommands } from './commands/index';
import { DiscordCommand } from './commands/types';

const commands = createCommands();
const commandMap = new Map<string, DiscordCommand>();

commands.forEach((cmd) => {
  commandMap.set(cmd.definition.name, cmd);
});

export const createDiscordBot = (): Client => {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  client.once('ready', () => {
    console.log(`✅ Discord Bot logged in as ${client.user?.tag}`);
  });

  client.on('interactionCreate', async (interaction) => {
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
