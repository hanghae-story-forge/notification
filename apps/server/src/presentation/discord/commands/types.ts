import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export interface DiscordCommand {
  readonly definition: SlashCommandBuilder;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export type DiscordCommandConstructor = new () => DiscordCommand;
