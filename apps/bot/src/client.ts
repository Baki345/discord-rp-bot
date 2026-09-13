import { Client, Collection, type ChatInputCommandInteraction, type RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";

/**
 * Structural type covering every SlashCommandBuilder variant (plain,
 * with-subcommands, options-only) — discord.js's own builder generics
 * make a single shared type awkward, and all we actually need from `data`
 * is its name and its serialized JSON body for registration.
 */
export interface CommandData {
  name: string;
  toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody;
}

export interface BotCommand {
  data: CommandData;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export class BotClient extends Client {
  readonly commands = new Collection<string, BotCommand>();
}
