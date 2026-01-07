import {
  ChatInputCommandInteraction,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';

export interface DiscordCommand {
  readonly definition: {
    toJSON: () => RESTPostAPIChatInputApplicationCommandsJSONBody;
  };
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export type DiscordCommandConstructor = new () => DiscordCommand;
